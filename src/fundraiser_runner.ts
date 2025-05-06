import {
  Mina,
  PrivateKey,
  VerificationKey,
  AccountUpdate,
  UInt8,
  UInt64,
  PublicKey,
  Poseidon,
  Field,
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
import { Fundraiser, MerkleMap } from './Fundraiser.js';
import { TestPublicKey } from 'node_modules/o1js/dist/node/lib/mina/v1/local-blockchain.js';

// controls whether the runner should execute a successful fundraiser or one where the target isn't met
const shouldSucceed = false;

// off chain state map
// todo: in deployed application, this will need to be hosted somewhere
let donorMap = new MerkleMap();

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
  token.deriveTokenId(),
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
  deployer,
);

// ---------- send‑tx helper (supports extra signers) ----------
async function sendTx(
  sender: Mina.TestPublicKey,
  body: () => Promise<void>,
  extra: PrivateKey[] = [],
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
    UpdatesDynamicProofConfig.default,
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
    vKeyMap,
  );
}, [fundraiserKeys.privateKey, tokenKeys.privateKey]);

// ---------- helpers ----------
const mint = (to: TestPublicKey, amt: UInt64) =>
  sendTx(deployer, async () => {
    AccountUpdate.fundNewAccount(deployer, 1);
    await token.mint(to, amt, dummyPrf, dummyVk, vKeyMap);
  });

const donate = (from: Mina.TestPublicKey, amt: UInt64) =>
  // send the transaction first
  sendTx(from, async () => {
    await fundraiser.donate(amt, donorMap, dummyPrf, dummyVk, vKeyMap);
    await token.approveAccountUpdateCustom(
      fundraiser.self,
      dummyPrf,
      dummyVk,
      vKeyMap,
    );
  })
    // once it is included on‑chain, mirror the change locally
    .then(() => {
      const senderHash = Poseidon.hash(from.toFields());

      const currentBalance = donorMap.getOption(senderHash).orElse(0n);
      donorMap = donorMap.clone();
      donorMap.set(senderHash, currentBalance.add(amt.value)); // keep roots in sync
    });

const refund = (from: TestPublicKey) =>
  sendTx(from, async () => {
    await fundraiser.refundDonation(donorMap);
    await token.approveAccountUpdateCustom(
      fundraiser.self,
      dummyPrf,
      dummyVk,
      vKeyMap,
    );
  })
    // once it is included on‑chain, mirror the change locally
    .then(() => {
      const senderHash = Poseidon.hash(from.toFields());

      donorMap = donorMap.clone();
      donorMap.update(senderHash, Field(0)); // keep roots in sync
    });

// ---------- script ----------
await logBalances('initial');
await mint(katie, mintParams.maxAmount);
await mint(matt, mintParams.maxAmount);
await logBalances('minted');

await donate(katie, UInt64.from(10));
await donate(matt, UInt64.from(50));
await donate(matt, UInt64.from(30));

if (shouldSucceed) {
  // pass fundraiser target
  await donate(katie, UInt64.from(500));
  await logBalances('deposited');
  console.log('simulate passing of deadline...');
  local.setGlobalSlot(local.currentSlot().add(100000000));

  // owner withdraws full amount
  await sendTx(beneficiary, async () => {
    AccountUpdate.fundNewAccount(beneficiary, 1);
    await fundraiser.claimFund();
    await token.approveAccountUpdateCustom(
      fundraiser.self,
      dummyPrf,
      dummyVk,
      vKeyMap,
    );
  });
  await logBalances('withdrawn');
} else {
  console.log('simulate passing of deadline...');
  local.setGlobalSlot(local.currentSlot().add(100000000));

  // refund donations
  await refund(katie);
  await refund(matt);
  await logBalances('refunded');
}

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

  console.log('\nDonor map root:', donorMap.root.toString());

  console.log('==========================\n');
}
