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
  Provable,
  Experimental,
  Poseidon,
} from "o1js";
import {
  FungibleToken,
  VKeyMerkleMap,
  SideloadedProof,
} from "fts-scaffolded-xt";

// off chain state map (hash of sender address => amount donated)

// create a merkle map with a height of 4
const { IndexedMerkleMap } = Experimental;
// store 2^3 leaves
const height = 4;
class MerkleMap extends IndexedMerkleMap(height) {}
// pre compute the empty root of an IndexedMerkleMap with height 4
const EMPTY_INDEXED_TREE4_ROOT =
  Field(
    848604956632493824118771612864662079593461935463909306433364671356729156850n
  );

export class Fundraiser extends SmartContract {
  // store root of offchain state map
  @state(Field) stateCommitment = State<Field>();

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
    args: DeployArgs & {
      tokenAddress: PublicKey;
      beneficiary: PublicKey;
      goal: UInt64;
      deadline: UInt64;
    }
  ) {
    // call superclass deploy method to initialize contract state
    await super.deploy(args);

    // Initialize stateCommitment as the root of an empty IndexedMerkleMap with height 4
    this.stateCommitment.set(EMPTY_INDEXED_TREE4_ROOT);

    // add custom state initialization supplied by the Fundraiser deployer
    this.tokenAddress.set(args.tokenAddress);
    this.total.set(UInt64.zero);
    this.goal.set(args.goal);
    this.beneficiary.set(args.beneficiary);

    // assert deadline is in the future
    this.network.timestamp
      .getAndRequireEquals()
      .assertLessThan(args.deadline, "deadline is in the past");
    this.deadline.set(args.deadline);

    this.account.permissions.set({
      ...Permissions.default(),
      send: Permissions.proof(),
      setVerificationKey:
        Permissions.VerificationKey.impossibleDuringCurrentVersion(),
      setPermissions: Permissions.impossible(),
    });
  }

  @method.returns(MerkleMap)
  async donate(
    amount: UInt64,
    state: MerkleMap,
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
    this.network.timestamp
      .getAndRequireEquals()
      .assertLessThan(
        this.deadline.getAndRequireEquals(),
        "deadline has passed"
      );

    // transfer tokens from sender to this contract
    await token.transferCustom(
      sender,
      this.address,
      amount,
      _proof,
      _vk,
      _vKeyMap
    );

    // check that the on chain commitment is consistent with the root of the map that was supplied
    const stateCommitment = this.stateCommitment.getAndRequireEquals();
    stateCommitment.assertEquals(
      state.root,
      "Off-chain state Merkle Map is out of sync! Please verify no changes have been made and try again."
    );
    // compute the hash of the sender's address
    const senderHash = Poseidon.hash(sender.toFields());

    // add current donation to the sender's balance
    let senderDonationBalance = state.getOption(senderHash).orElse(0n);
    // todo: is amount.value safe?
    senderDonationBalance = senderDonationBalance.add(amount.value);

    // update the off chain state map
    state = state.clone();
    state.insert(senderHash, senderDonationBalance);

    // update the on chain commitment with the newly calculated root
    const updatedStateCommitment = state.root;
    this.stateCommitment.set(updatedStateCommitment);

    const total = this.total.getAndRequireEquals();
    this.total.set(total.add(amount));

    // return the updated map
    return state;
  }

  // refund the donation to the sender if the fundraising goal was not met
  @method.returns(MerkleMap)
  async refundDonation(state: MerkleMap) {
    // verify tokenId matches token contract, require signature from sender
    const token = new FungibleToken(this.tokenAddress.getAndRequireEquals());
    token.deriveTokenId().assertEquals(this.tokenId);
    const sender = this.sender.getUnconstrained();
    const senderUpdate = AccountUpdate.createSigned(sender);
    senderUpdate.body.useFullCommitment = Bool(true);

    const total = this.total.getAndRequireEquals();

    // check fundraising deadine has passed and that the goal has not been met
    this.network.timestamp
      .getAndRequireEquals()
      .assertGreaterThan(
        this.deadline.getAndRequireEquals(),
        "deadline not reached"
      );
    this.goal.getAndRequireEquals().assertGreaterThan(total, "goal was met");

    // check that the on chain commitment is consistent with the root of the map that was supplied
    const stateCommitment = this.stateCommitment.getAndRequireEquals();
    stateCommitment.assertEquals(
      state.root,
      "Off-chain state Merkle Map is out of sync with on chain commitment! Please verify no changes have been made to the commitment since you loaded the map and try again."
    );
    // compute the hash of the sender's address
    const senderHash = Poseidon.hash(sender.toFields());

    // get sender's balance
    const senderDonationBalance = state.getOption(senderHash).orElse(0n);

    // clear the sender's balance from off chain state
    state = state.clone();
    state.insert(senderHash, Field(0));

    // update the on chain commitment with the newly calculated root
    const updatedStateCommitment = state.root;
    this.stateCommitment.set(updatedStateCommitment);

    // todo: how do you safely create a UInt64 from a field?
    const amount = UInt64.fromFields(senderDonationBalance.toFields());
    // send the amount back to the sender
    const receiverUpdate = this.send({ to: sender, amount });
    // authorize contract to send tokens to the sender
    receiverUpdate.body.mayUseToken =
      AccountUpdate.MayUseToken.InheritFromParent;
    receiverUpdate.body.useFullCommitment = Bool(true);

    this.total.set(total.sub(amount));

    // return updated map
    return state;
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
      const diff = deadine - timestamp; // in seconds

      const mins = Math.floor(diff / 60);
      const secs = diff % 60;

      console.log(`time left: ${mins}m ${secs}s`);
      console.log("this.network.timestamp", timestamp);
      console.log("this.deadline", deadine);
      console.log("diff", diff);
    });
    this.network.timestamp
      .getAndRequireEquals()
      .assertGreaterThan(
        this.deadline.getAndRequireEquals(),
        `deadline not reached`
      );
    this.goal.getAndRequireEquals().assertLessThan(total, "goal was not met");

    // withdraw the total amount to the beneficiary
    let receiverUpdate = this.send({ to: sender, amount: total });

    // authorize contract to send tokens to the sender
    receiverUpdate.body.mayUseToken =
      AccountUpdate.MayUseToken.InheritFromParent;
    receiverUpdate.body.useFullCommitment = Bool(true);

    // zero the total and map to prevent further withdrawals
    this.total.set(UInt64.zero);
    this.stateCommitment.set(EMPTY_INDEXED_TREE4_ROOT);

  }
}
