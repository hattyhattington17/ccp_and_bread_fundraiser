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

/* ------------------------------------------------------------------ *
 * Off‑chain donor map
 * ------------------------------------------------------------------ *
 * IndexedMerkleMap<Field, Field>(height = 4)
 *   key   = Poseidon(hash(sender public‑key))
 *   value = donation balance
 *
 * Merkle root is stored on chain as stateCommitment
 * A storage provider hosts the full map.
 * The provider must publish an updated map immediately after every
 *   successful call that changes the root.
 * Callers fetch that map, verify its root equals the current
 *   stateCommitment, mutate it via donate()/refundDonation(), then
 *   replace their local copy with the map the method returns.
 * ------------------------------------------------------------------ */
const { IndexedMerkleMap } = Experimental;
const height = 4;
export class MerkleMap extends IndexedMerkleMap(height) {}
// Empty root for an IndexedMerkleMap of height 4, pre‑computed so it is available at compile‑time
const EMPTY_INDEXED_TREE4_ROOT =
  Field(
    848604956632493824118771612864662079593461935463909306433364671356729156850n
  );

export class Fundraiser extends SmartContract {
  // Root of off chain state MerkleMap
  @state(Field) stateCommitment = State<Field>();

  // token address
  @state(PublicKey)
  tokenAddress = State<PublicKey>();

  // total donations stored in the contract
  @state(UInt64)
  total = State<UInt64>();

  // beneficiary of the fundraiser
  @state(PublicKey)
  beneficiary = State<PublicKey>();

  // fundraiser goal in tokens
  @state(UInt64)
  goal = State<UInt64>();

  // deadline after which donators can withdraw their tokens if the goal is not met
  // UInt64 milliseconds since the UNIX epoch
  @state(UInt64)
  deadline = State<UInt64>();

  /**
   * Deploys and initializes the contract.
   *
   * @param args Standard deploy arguments plus custom campaign parameters:
   *  - `tokenAddress`  Token contract address accepted by this fundraiser.
   *  - `beneficiary`   Who will receive the collected funds.
   *  - `goal`          Number of tokens required for a successful campaign.
   *  - `deadline`      Deadline (ms since epoch) after which donations stop and
   *                    refunds become possible (if `goal` not met).
   */
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

  /**
   * Donate `amount` tokens to the fundraiser
   *
   * @param amount     Number of tokens to donate.
   * @param state      Caller‑supplied Merkle map representing current off‑chain
   *                    donor balances. The method verifies its root matches the
   *                    on‑chain commitment before applying changes.
   * @param _proof     Dummy proof - not used
   * @param _vk        Dummy verification key - not used
   * @param _vKeyMap   Dummy map - not used
   * @returns Updated off‑chain Merkle map with the sender’s balance adjusted.
   */
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

    // Validate token ID and require sender signature
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

    // transfer token amount from sender to this contract
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
      "Off-chain state Merkle Map is out of sync! Please vergify no changes have been made and try again."
    );

    // compute hash(sender) to use as map key and update donation balance
    const senderHash = Poseidon.hash(sender.toFields());

    // add current donation to the sender's balance
    let senderDonationBalance = state.getOption(senderHash).orElse(0n);
    // todo: is amount.value safe?
    senderDonationBalance = senderDonationBalance.add(amount.value);

    // update the off chain state map
    state = state.clone();
    state.set(senderHash, senderDonationBalance);

    // update the on chain commitment with the newly calculated root
    const updatedStateCommitment = state.root;
    this.stateCommitment.set(updatedStateCommitment);

    // update total donations
    const total = this.total.getAndRequireEquals();
    this.total.set(total.add(amount));

    // return the updated map
    return state;
  }

  /**
   * Refund the sender’s donation if the goal wasn't met before the deadline
   *
   * @param state Caller‑supplied Merkle map with donor balances.
   * @returns Updated Merkle map with the sender’s balance zeroed out.
   */
  @method.returns(MerkleMap)
  async refundDonation(state: MerkleMap) {
    // Validate token ID and require sender signature.
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
    state.update(senderHash, Field(0));

    // update the on chain commitment with the newly calculated root
    const updatedStateCommitment = state.root;
    this.stateCommitment.set(updatedStateCommitment);

    // todo: how do you safely create a UInt64 from a field?
    const refundAmount = UInt64.fromFields(senderDonationBalance.toFields());
    // send the amount back to the sender
    const receiverUpdate = this.send({ to: sender, amount: refundAmount });
    // authorize contract to send tokens to the sender
    receiverUpdate.body.mayUseToken =
      AccountUpdate.MayUseToken.InheritFromParent;
    receiverUpdate.body.useFullCommitment = Bool(true);

    this.total.set(total.sub(refundAmount));

    // return updated map
    return state;
  }

  /**
   * Claim the collected funds (only callable by `beneficiary`)
   * Requires deadline to have passed and goal to have been met
   */
  @method
  async claimFund() {
    // Validate token ID and sender signature.
    const token = new FungibleToken(this.tokenAddress.getAndRequireEquals());
    token.deriveTokenId().assertEquals(this.tokenId);
    const sender = this.sender.getUnconstrained();
    const senderUpdate = AccountUpdate.createSigned(sender);
    senderUpdate.body.useFullCommitment = Bool(true);

    const total = this.total.getAndRequireEquals();

    // assert that the sender is the beneficiary
    this.beneficiary.getAndRequireEquals().assertEquals(sender);

    // check that the fundraising goal has been met and the deadline has passed
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
