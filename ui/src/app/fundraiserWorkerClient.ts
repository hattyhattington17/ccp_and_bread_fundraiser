import * as Comlink from 'comlink';
import { Mina, PublicKey } from 'o1js';
import { DonorRepr } from './fundraiserWorker';

export default class FundraiserWorkerClient {
  worker!: Worker;
  remoteApi: Comlink.Remote<typeof import('./fundraiserWorker').api>;

  constructor() {
    const worker = new Worker(
      new URL('./fundraiserWorker.ts', import.meta.url),
      {
        type: 'module',
      },
    );
    this.remoteApi = Comlink.wrap(worker);
  }

  async init(
    fundraiserAddress: PublicKey,
    tokenAddress: PublicKey,
    deployer: PublicKey,
  ) {
    return await this.remoteApi.init(fundraiserAddress, tokenAddress, deployer);
  }

  async donate(sender: Mina.TestPublicKey, donor: DonorRepr) {
    return await this.remoteApi.donate(sender, donor);
  }

  async getDonors() {
    return await this.remoteApi.getDonors();
  }

  async claim(sender: Mina.TestPublicKey) {
    return await this.remoteApi.claim(sender);
  }

  async refund(sender: Mina.TestPublicKey) {
    return await this.remoteApi.refund(sender);
  }
}
