import {
  Mina,
  PrivateKey,
  VerificationKey,
  AccountUpdate,
  UInt8,
  UInt64,
  PublicKey,
} from 'o1js';
import {
  FungibleToken,
  VKeyMerkleMap,
  MintConfig,
  MintParams,
  BurnConfig,
  BurnParams,
  MintDynamicProofConfig,
  BurnDynamicProofConfig,
  TransferDynamicProofConfig,
  UpdatesDynamicProofConfig,
  generateDummyDynamicProof,
} from 'fts-scaffolded-xt';
import { Fundraiser } from './Fundraiser.js';
import { TestPublicKey } from 'node_modules/o1js/dist/node/lib/mina/v1/local-blockchain.js';

const fee = UInt64.from(1e8);

// ---------- local chain & key setup ----------
const local = await Mina.LocalBlockchain({
  proofsEnabled: false,
  enforceTransactionLimits: false,
});
Mina.setActiveInstance(local);

const [deployer, beneficiary, katie, matt, gato] = local.testAccounts;
const tokenKeys = PrivateKey.randomKeypair();
const fundraiserKeys = PrivateKey.randomKeypair();

const token = new FungibleToken(tokenKeys.publicKey);
const fundraiser = new Fundraiser(
  fundraiserKeys.publicKey,
  token.deriveTokenId()
);

// ---------- token mint / burn params & dummy proof ----------
const mintParams = new MintParams({
  fixedAmount: UInt64.from(200),
  minAmount: UInt64.one,
  maxAmount: UInt64.from(1000),
});
const burnParams = new BurnParams({
  fixedAmount: UInt64.from(500),
  minAmount: UInt64.from(100),
  maxAmount: UInt64.from(1500),
});

const vKeyMap = new VKeyMerkleMap();
const dummyVk = await VerificationKey.dummy();
const dummyPrf = await generateDummyDynamicProof(
  token.deriveTokenId(),
  deployer
);

// ---------- send‑tx helper (supports extra signers) ----------
async function sendTx(
  sender: Mina.TestPublicKey,
  body: () => Promise<void>,
  extra: PrivateKey[] = []
) {
  const tx = await Mina.transaction({ sender, fee }, body);
  await tx.prove();
  tx.sign([sender.key, ...extra]);
  const { status } = await tx.send().then((v) => v.wait());
  if (status !== 'included') throw new Error(`tx ${status}`);
}

// ---------- deploy & init ----------
await FungibleToken.compile();
await Fundraiser.compile();

await sendTx(deployer, async () => {
  AccountUpdate.fundNewAccount(deployer, 2);
  await token.deploy({
    symbol: 'BREAD',
    src: 'https://github.com/o1-labs-XT/fungible-token-standard/blob/main/src/NewTokenStandard.ts',
  });
  await token.initialize(
    deployer,
    UInt8.from(9),
    MintConfig.default,
    mintParams,
    BurnConfig.default,
    burnParams,
    MintDynamicProofConfig.default,
    BurnDynamicProofConfig.default,
    TransferDynamicProofConfig.default,
    UpdatesDynamicProofConfig.default
  );
}, [tokenKeys.privateKey]);

await sendTx(deployer, async () => {
  AccountUpdate.fundNewAccount(deployer, 1);
  await fundraiser.deploy({
    tokenAddress: tokenKeys.publicKey,
    beneficiary,
    goal: UInt64.from(500),
    deadline: UInt64.from(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
  });
  await token.approveAccountUpdateCustom(
    fundraiser.self,
    dummyPrf,
    dummyVk,
    vKeyMap
  );
}, [fundraiserKeys.privateKey, tokenKeys.privateKey]);

// ---------- helpers ----------
const mint = (to: TestPublicKey, amt: UInt64) =>
  sendTx(deployer, async () => {
    AccountUpdate.fundNewAccount(deployer, 1);
    await token.mint(to, amt, dummyPrf, dummyVk, vKeyMap);
  });

const donate = (from: TestPublicKey, amt: UInt64) =>
  sendTx(from, async () => {
    await fundraiser.donate(amt, dummyPrf, dummyVk, vKeyMap);
    await token.approveAccountUpdateCustom(
      fundraiser.self,
      dummyPrf,
      dummyVk,
      vKeyMap
    );
  });

const refund = (from: TestPublicKey) =>
  sendTx(from, async () => {
    await fundraiser.refundDonation();
    await token.approveAccountUpdateCustom(
      fundraiser.self,
      dummyPrf,
      dummyVk,
      vKeyMap
    );
  });
// ---------- script ----------
await logBalances('initial');
await mint(katie, mintParams.maxAmount);
await mint(matt, mintParams.maxAmount);
await logBalances('minted');

await donate(katie, UInt64.from(10));
await donate(matt, UInt64.from(50));
await donate(matt, UInt64.from(30));
// pass fundraiser target
// await donate(katie, UInt64.from(500));
await logBalances('deposited');

console.log('simulate passing of deadline...');
local.setGlobalSlot(local.currentSlot().add(100000000));

// refund donations
await refund(katie);
await refund(matt);
await logBalances('refunded');

// donate again after deadline
await donate(katie, UInt64.from(100));

// owner withdraws full amount
await sendTx(beneficiary, async () => {
  AccountUpdate.fundNewAccount(beneficiary, 1);
  await fundraiser.claimFund();
  await token.approveAccountUpdateCustom(
    fundraiser.self,
    dummyPrf,
    dummyVk,
    vKeyMap
  );
});
await logBalances('withdrawn');

async function logBalances(tag: string) {
  const actors: { name: string; key: PublicKey }[] = [
    { name: 'Deployer', key: deployer },
    { name: 'Owner', key: beneficiary },
    { name: 'katie', key: katie },
    { name: 'matt', key: matt },
    { name: 'gato', key: gato },
    { name: 'Escrow', key: fundraiserKeys.publicKey },
  ];
  console.log(`\n--- Balances (${tag}) ---`);
  for (const { name, key } of actors) {
    const bal = (await token.getBalanceOf('key' in key ? key : key)).toBigInt();
    console.log(`${name}:`, bal.toString());
  }
  console.log('--------------------------\n');
}
