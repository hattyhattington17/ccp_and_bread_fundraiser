import {
  AccountUpdate,
  Bool,
  DeployArgs,
  method,
  Permissions,
  PublicKey,
  SmartContract,
  State,
  state,
  Field,
  UInt64,
  VerificationKey,
  Provable
} from 'o1js';
import {
  FungibleToken,
  VKeyMerkleMap,
  SideloadedProof,
} from 'fts-scaffolded-xt';

export class Fundraiser extends SmartContract {
  // token address
  @state(PublicKey)
  tokenAddress = State<PublicKey>();

  // total funds stored in the contract
  @state(UInt64)
  total = State<UInt64>();

  // beneficiary of the fundraiser
  @state(PublicKey)
  beneficiary = State<PublicKey>();

  // fundraiser goal in tokens
  @state(UInt64)
  goal = State<UInt64>();

  // deadline after which donators can withdraw their tokens if the goal is not met
  // UInt64 in milliseconds since the UNIX epoch
  @state(UInt64)
  deadline = State<UInt64>();

  async deploy(
    args: DeployArgs & { tokenAddress: PublicKey; beneficiary: PublicKey; goal: UInt64; deadline: UInt64 }
  ) {
    // call superclass deploy method to initialize contract state
    await super.deploy(args);

    // add custom state initialization supplied by the Fundraiser deployer
    this.tokenAddress.set(args.tokenAddress);
    this.total.set(UInt64.zero);
    this.goal.set(args.goal);
    this.beneficiary.set(args.beneficiary);

    // assert deadline is in the future
    this.network.timestamp.getAndRequireEquals().assertLessThan(args.deadline, 'deadline is in the past');
    this.deadline.set(args.deadline);

    this.account.permissions.set({
      ...Permissions.default(),
      send: Permissions.proof(),
      setVerificationKey: Permissions.VerificationKey.impossibleDuringCurrentVersion(),
      setPermissions: Permissions.impossible(),
    });
  }

  @method
  async donate(
    amount: UInt64,
    _proof: SideloadedProof,
    _vk: VerificationKey,
    _vKeyMap: VKeyMerkleMap
  ) {
    // Ensures token verification key is registered with contract to prevent compiler errors
    // but skips actual proof verification (handled by transferCustom call)
    _proof.verifyIf(_vk, Bool(false));

    // verify tokenId matches token contract, require signature from sender
    const token = new FungibleToken(this.tokenAddress.getAndRequireEquals());
    token.deriveTokenId().assertEquals(this.tokenId);
    const sender = this.sender.getUnconstrained();
    const senderUpdate = AccountUpdate.createSigned(sender);
    senderUpdate.body.useFullCommitment = Bool(true);

    // check that the deadline has not passed
    this.network.timestamp.getAndRequireEquals().assertLessThan(this.deadline.getAndRequireEquals(), 'deadline has passed');

    // transfer tokens from sender to this contract
    await token.transferCustom(sender, this.address, amount, _proof, _vk, _vKeyMap);

    // todo: create entry in donor map
    // increment donor amount if it's already in there

    const total = this.total.getAndRequireEquals();
    this.total.set(total.add(amount));
  }

  // refund the donation to the sender if the fundraising goal was not met
  // todo: this needs to use a merkle map to check how much the sender has donated
  @method
  async refundDonation() {
    // verify tokenId matches token contract, require signature from sender
    const token = new FungibleToken(this.tokenAddress.getAndRequireEquals());
    token.deriveTokenId().assertEquals(this.tokenId);
    const sender = this.sender.getUnconstrained();
    const senderUpdate = AccountUpdate.createSigned(sender);
    senderUpdate.body.useFullCommitment = Bool(true);


    const total = this.total.getAndRequireEquals();

    // check fundraising deadine has passed and that the goal has not been met
    this.network.timestamp.getAndRequireEquals().assertGreaterThan(this.deadline.getAndRequireEquals(), 'deadline not reached');
    this.goal.getAndRequireEquals().assertGreaterThan(total, 'goal was met');

    // todo: temporarily pretend sender is a donor who donated 1 token, in the future add a merkle map to track donations
    let donor = this.sender.getUnconstrained();
    donor.assertEquals(sender);
    let amount = new UInt64(1);
    // todo: clear donor entry from map

    // send the amount back to the sender
    let receiverUpdate = this.send({ to: sender, amount });
    // authorize contract to send tokens to the sender
    receiverUpdate.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
    receiverUpdate.body.useFullCommitment = Bool(true);

    this.total.set(total.sub(amount));
  }

  @method
  async claimFund() {
    // verify tokenId matches token contract, require signature from sender
    const token = new FungibleToken(this.tokenAddress.getAndRequireEquals());
    token.deriveTokenId().assertEquals(this.tokenId);
    const sender = this.sender.getUnconstrained();
    const senderUpdate = AccountUpdate.createSigned(sender);
    senderUpdate.body.useFullCommitment = Bool(true);

    const total = this.total.getAndRequireEquals();

    // assert that the sender is the beneficiary
    this.beneficiary.getAndRequireEquals().assertEquals(sender);

    // check that the fundraising goal has been met and the deadline has passed
    Provable.asProver(() => {
      let timestamp = +this.network.timestamp.getAndRequireEquals();
      let deadine = +this.deadline.getAndRequireEquals();
      const diff = deadine - timestamp;           // in seconds

      const mins = Math.floor(diff / 60);
      const secs = diff % 60;

      console.log(`time left: ${mins}m ${secs}s`);
      console.log("this.network.timestamp", timestamp);
      console.log("this.deadline", deadine);
      console.log("diff", diff);
    })
    this.network.timestamp.getAndRequireEquals().assertGreaterThan(this.deadline.getAndRequireEquals(), `deadline not reached`);
    this.goal.getAndRequireEquals().assertLessThan(total, 'goal was not met');

    // withdraw the total amount to the beneficiary
    let receiverUpdate = this.send({ to: sender, amount: total });

    // authorize contract to send tokens to the sender
    receiverUpdate.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
    receiverUpdate.body.useFullCommitment = Bool(true);

    // zero the total to prevent further withdrawals
    this.total.set(UInt64.zero);
  }
}
