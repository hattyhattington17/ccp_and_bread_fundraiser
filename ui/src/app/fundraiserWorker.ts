import {
  UInt64,
  Field,
  PublicKey,
  VerificationKey,
  Mina,
  PrivateKey,
} from 'o1js';
import * as Comlink from 'comlink';
import { Fundraiser, MerkleMap4 } from '@/lib/Fundraiser';
import {
  FungibleToken,
  generateDummyDynamicProof,
  SideloadedProof,
  VKeyMerkleMap,
} from 'fts-scaffolded-xt';
import {
  serializeIndexedMap,
  deserializeIndexedMerkleMap,
} from '@minatokens/storage';
import { read } from 'fs';

export type Address = Field;

export type DonorRepr = {
  address: Address;
  amount: bigint;
};

export type State = {
  merkleMap: MerkleMap4;
  zkApp: Fundraiser;
  tokenApp: FungibleToken;
  deployer: PublicKey;
};

const fee = UInt64.from(1e8);
const STORAGE_PROVIDER_URL = 'http://localhost:3000'; // replace with the URL of the storage provider
const {
  promise: statePromise,
  resolve: resolveState,
  reject: rejectState,
} = Promise.withResolvers<State>();
let state: State;

const mkReadMerkleMap = async (url: string): Promise<MerkleMap4> => {
  return await fetch(`${url}`, { method: 'GET' })
    .then((data: Response) => data.json())
    .then((jsonMap) =>
      deserializeIndexedMerkleMap({ serializedIndexedMap: jsonMap }),
    );
};

const readMerkleMap = async () =>
  await mkReadMerkleMap(`${STORAGE_PROVIDER_URL}/`);

const mkWriteMerkleMap = async (
  merkleMap: MerkleMap4,
  url: string,
): Promise<void> => {
  await fetch(`${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(serializeIndexedMap(merkleMap)),
  });
};

const writeMerkleMap = async (merkleMap: MerkleMap4) =>
  await mkWriteMerkleMap(merkleMap, `${STORAGE_PROVIDER_URL}/write`);

const sendTx = async (
  sender: Mina.TestPublicKey,
  body: () => Promise<void>,
  fee?: string | number | UInt64,
  extra: PrivateKey[] = [],
): Promise<void> => {
  const tx = await Mina.transaction({ sender, fee }, body);
  await tx.prove();
  tx.sign([sender.key, ...extra]);
  const { status } = await tx.send().then((v) => v.wait());
  if (status !== 'included') throw new Error(`tx ${status}`);
};

export const api = {
  async init(
    fundraiserAddress: PublicKey,
    tokenAddress: PublicKey,
    deployer: PublicKey,
  ) {
    console.time('Compiling contracts');
    const [_fundraiserCompiled, _tokenCompiled, merkleMap] = await Promise.all([
      FungibleToken.compile(),
      Fundraiser.compile(),
      readMerkleMap(),
    ]);
    console.timeEnd('Compiling contracts');
    state = {
      merkleMap,
      zkApp: new Fundraiser(fundraiserAddress),
      tokenApp: new FungibleToken(tokenAddress),
      deployer,
    };
    resolveState(state);
  },

  async donate(sender: Mina.TestPublicKey, donor: DonorRepr) {
    // Ensure the state is initialized
    await statePromise;

    const vKeyMap = new VKeyMerkleMap();
    const dummyVk = await VerificationKey.dummy();
    const dummyPrf = await generateDummyDynamicProof(
      state.tokenApp.deriveTokenId(),
      state.deployer,
    );

    state.merkleMap = await readMerkleMap();
    try {
      let updatedMerkleMap: MerkleMap4;
      await sendTx(
        sender,
        async () => {
          updatedMerkleMap = await state.zkApp.donate(
            UInt64.from(donor.amount),
            state.merkleMap,
            dummyPrf,
            dummyVk,
            vKeyMap,
          );
          return;
        },
        fee,
      );
      try {
        if (updatedMerkleMap) {
          await writeMerkleMap(updatedMerkleMap);
          state.merkleMap = updatedMerkleMap;
        } else {
          console.error('CODING ERROR 112!!');
        }
      } catch (error) {
        console.error('Failed to write to storage provider:', error);
      }
    } catch (error) {
      console.error('Failed to write donation:', error);
    }
  },

  async getDonors(): Promise<MerkleMap4> {
    return await readMerkleMap();
  },

  async claim(sender: Mina.TestPublicKey) {
    await statePromise;

    try {
      await sendTx(sender, async () => await state.zkApp.claimFund(), fee);
    } catch (error) {
      console.error('Failed to claim funds:', error);
    }
  },

  async refund(sender: Mina.TestPublicKey) {
    await statePromise;

    state.merkleMap = await readMerkleMap();
    try {
      await sendTx(
        sender,
        async () => void (await state.zkApp.refundDonation(state.merkleMap)),
        fee,
      );
    } catch (error) {
      console.error('Failed to refund:', error);
    }
  },
};

Comlink.expose(api);
