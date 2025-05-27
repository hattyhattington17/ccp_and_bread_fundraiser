// import { UInt64 } from "o1js";
// import * as Comlink from "comlink";
import { Fundraiser, FundraiserProof, MerkleMap4 } from '@/lib/Fundraiser';

type Address = string;

export type DonorRepr = {
  address: Address;
  amount: bigint;
};

const state = {
  merkleMap: null as MerkleMap4 | null,
  donorMapRepr: {} as Record<Address, DonorRepr>,
  proof: null as FundraiserProof | null,
};

export const api = {
  async init() {
    console.time('Compiling Fundraiser');
    await Fundraiser.compile();
    console.timeEnd('Compiling Fundraiser');
  },
};
