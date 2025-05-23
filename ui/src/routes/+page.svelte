<script lang="ts">
	import Emoji from '$lib/kawaii/emoji.svelte';
	import Card from '$lib/kawaii/card.svelte';
	import App from '$lib/kawaii/app.svelte';
	import AccountDisplayer from '$lib/kawaii/displayer.svelte';

	import { onMount, type Component } from 'svelte';
	import {
		AccountUpdate,
		Field,
		IndexedMerkleMapBase,
		Mina,
		Poseidon,
		PrivateKey,
		//PublicKey,
		UInt64,
		UInt8,
		VerificationKey
	} from 'o1js';
	import { Fundraiser } from '$lib/contracts/Fundraiser';
	import { serializeIndexedMap, deserializeIndexedMerkleMap, fromBase } from '@minatokens/storage';
	import {
		BurnConfig,
		BurnDynamicProofConfig,
		BurnParams,
		FungibleToken,
		generateDummyDynamicProof,
		MintConfig,
		MintDynamicProofConfig,
		MintParams,
		TransferDynamicProofConfig,
		UpdatesDynamicProofConfig,
		VKeyMerkleMap
	} from 'fts-scaffolded-xt';
	const storage_provider_address = 'http://localhost:3000';

	export let amount;
	export let goal = 100;
	export let raised;
	export let deadline = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days

	const localChain = true;
	const fee = UInt64.from(1e8);

	async function getDonorMap() {
		return fetch(`${storage_provider_address}/`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	async function writeDonorMap(m: IndexedMerkleMapBase) {
		return fetch(`${storage_provider_address}/write`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(serializeIndexedMap(m))
		});
	}

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

	let mint: (to: Mina.TestPublicKey, amt: UInt64) => Promise<void>;
	let donate: (from: Mina.TestPublicKey, amt: UInt64) => Promise<void>;
	let refund: (from: Mina.TestPublicKey) => Promise<void>;
	let local: any;
	let deployer: Mina.TestPublicKey,
		beneficiary: Mina.TestPublicKey,
		katie: Mina.TestPublicKey,
		matt: Mina.TestPublicKey,
		gato: Mina.TestPublicKey;
	let thisAccount: Mina.TestPublicKey;

	let { promise: ready, resolve, reject: _ } = Promise.withResolvers<void>();

	onMount(async () => {
		let donorMapJson = await (await getDonorMap()).json();
		let donorMap = deserializeIndexedMerkleMap({ serializedIndexedMap: donorMapJson });

		if (localChain) {
			// ---------- local chain & key setup ----------
			local = await Mina.LocalBlockchain({
				proofsEnabled: false,
				enforceTransactionLimits: false
			});
			Mina.setActiveInstance(local);

			[deployer, beneficiary, katie, matt, gato] = local.testAccounts;
			const tokenKeys = PrivateKey.randomKeypair();
			const fundraiserKeys = PrivateKey.randomKeypair();

			const token = new FungibleToken(tokenKeys.publicKey);
			const fundraiser = new Fundraiser(fundraiserKeys.publicKey, token.deriveTokenId());

			// ---------- token mint / burn params & dummy proof ----------
			const mintParams = new MintParams({
				fixedAmount: UInt64.from(200),
				minAmount: UInt64.one,
				maxAmount: UInt64.from(1000)
			});
			const burnParams = new BurnParams({
				fixedAmount: UInt64.from(500),
				minAmount: UInt64.from(100),
				maxAmount: UInt64.from(1500)
			});

			const vKeyMap = new VKeyMerkleMap();
			const dummyVk = await VerificationKey.dummy();
			const dummyPrf = await generateDummyDynamicProof(token.deriveTokenId(), deployer);

			// ---------- deploy & init ----------
			await FungibleToken.compile();
			await Fundraiser.compile();

			await sendTx(deployer, async () => {
				AccountUpdate.fundNewAccount(deployer, 2);
				await token.deploy({
					symbol: 'BREAD',
					src: 'https://github.com/o1-labs-XT/fungible-token-standard/blob/main/src/NewTokenStandard.ts'
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
					goal: UInt64.from(goal),
					deadline: UInt64.from(deadline)
				});
				await token.approveAccountUpdateCustom(fundraiser.self, dummyPrf, dummyVk, vKeyMap);
			}, [fundraiserKeys.privateKey, tokenKeys.privateKey]);

			// ---------- helpers ----------
			mint = async (to: Mina.TestPublicKey, amt: UInt64) =>
				await sendTx(deployer, async () => {
					AccountUpdate.fundNewAccount(deployer, 1);
					await token.mint(to, amt, dummyPrf, dummyVk, vKeyMap);
				});

			donate = async (from: Mina.TestPublicKey, amt: UInt64) => {
				// send the transaction first
				await sendTx(from, async () => {
					await fundraiser.donate(amt, donorMap, dummyPrf, dummyVk, vKeyMap);
					await token.approveAccountUpdateCustom(fundraiser.self, dummyPrf, dummyVk, vKeyMap);
				});
				// once it is included on‑chain, mirror the change locally
				const senderHash = Poseidon.hash(from.toFields());

				const currentBalance = donorMap.getOption(senderHash).orElse(0n);
				donorMap = donorMap.clone();
				donorMap.set(senderHash, currentBalance.add(amt.value)); // keep roots in sync
				await writeDonorMap(donorMap);
			};

			refund = async (from: Mina.TestPublicKey) => {
				await sendTx(from, async () => {
					await fundraiser.refundDonation(donorMap);
					await token.approveAccountUpdateCustom(fundraiser.self, dummyPrf, dummyVk, vKeyMap);
				});
				// once it is included on‑chain, mirror the change locally
				const senderHash = Poseidon.hash(from.toFields());

				donorMap = donorMap.clone();
				donorMap.update(senderHash, Field(0)); // keep roots in sync
				await writeDonorMap(donorMap);
			};

			thisAccount = matt;

			resolve();
		} else {
			// Update this to use the address (public key) for your zkApp account.
			// To try it out, you can try this address for an example "Add" smart contract that we've deployed to
			// Testnet B62qnTDEeYtBHBePA4yhCt4TCgDtA4L2CGvK7PirbJyX4pKH8bmtWe5 .
			const zkAppAddress = '';
			// This should be removed once the zkAppAddress is updated.
			// if (!zkAppAddress) {
			//   console.error(
			//     'The following error is caused because the zkAppAddress has an empty string as the public key. Update the zkAppAddress with the public key for your zkApp account, or try this address for an example "Add" smart contract that we deployed to Testnet: B62qnTDEeYtBHBePA4yhCt4TCgDtA4L2CGvK7PirbJyX4pKH8bmtWe5',
			//   )
			// }

			console.log('donorMap', donorMap);
		}
	});
</script>

<svelte:head>
	<title>Mina Crowdfunding UI</title>
</svelte:head>
<div class="h-screen">
	<main class="items-center justify-center">
		<AccountDisplayer
			{deployer}
			{beneficiary}
			donors={[matt, katie, gato]}
			bind:selected={thisAccount}
		/>
		<h1 class="text-center text-4xl font-bold text-gray-800">
			Mina Fungible Token Crowdfunding Example
		</h1>
		<!-- Display who you are currently acting as -->
		<!-- Emoji particle effect -->
		<Emoji />
		<div class="flex flex-col items-center">
			<!-- Main app card -->
			{#await ready}
				{'Getting ready...'}
			{:then}
				<App {amount} {goal} {raised} {mint} {donate} {refund} mina={local} {thisAccount} />
			{/await}
			<div class="grid grid-cols-4 gap-4 pt-4">
				<Card
					emoji="📚"
					href="https://docs.minaprotocol.com/zkapps"
					cardTitle="DOCS"
					cardText="Explore zkApps and how to build one"
				/>
				<Card
					emoji="🛠️"
					href="https://docs.minaprotocol.com/zkapps/tutorials/hello-world"
					cardTitle="TUTORIALS"
					cardText="Learn with step-by-step o1js tutorials"
				/>
				<Card
					emoji="💬"
					href="https://discord.gg/minaprotocol"
					cardTitle="QUESTIONS"
					cardText="Ask questions on our Discord server"
				/>
				<Card
					emoji="🚀"
					href="https://docs.minaprotocol.com/zkapps/how-to-deploy-a-zkapp"
					cardTitle="DEPLOY"
					cardText="Deploy your zkApp to Testnet"
				/>
			</div>
		</div>
	</main>
</div>
