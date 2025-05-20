<script lang="ts">
	import Emoji from '$lib/kawaii/emoji.svelte';
	import Card from '$lib/kawaii/card.svelte';
	import App from '$lib/kawaii/app.svelte';

	import character from '$lib/assets/kawaii/character.png';
	import arrowRightSmall from '$lib/assets/arrow-right-small.svg';
	import { onMount, type Component } from 'svelte';
	import { Mina, PublicKey } from 'o1js';
	import type { MerkleMap, Fundraiser } from '$lib/contracts/Fundraiser.ts';
	import { serializeIndexedMap, deserializeIndexedMerkleMap } from '@minatokens/storage';
	const storage_provider_address = 'http://localhost:3000';

	export let amount = 40;
	export let goal = 100;
	export let raised = 20;

	async function getDonorMap() {
		return fetch(`${storage_provider_address}/`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	async function writeDonorMap(m: MerkleMap) {
		return fetch(`${storage_provider_address}/write`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(serializeIndexedMap(m))
		});
	}

	onMount(async () => {
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

		let donorMap = await getDonorMap();
		console.log(deserializeIndexedMerkleMap({ serializedIndexedMap: await donorMap.json() }));

		//const zkApp = new Fundraiser(PublicKey.fromBase58(zkAppAddress))
	});
</script>

<svelte:head>
	<title>Mina Crowdfunding UI</title>
</svelte:head>
<div class="h-screen">
	<main class="items-center justify-center">
		<h1 class="text-center text-4xl font-bold">Mina Fungible Token Crowdfunding Example</h1>
		<!-- Emoji particle effect -->
		<Emoji />
		<div class="flex flex-col items-center">
			<!-- Main app card -->
			<App {amount} {goal} {raised} />
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
