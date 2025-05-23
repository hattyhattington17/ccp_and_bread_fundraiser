<script lang="ts">
	import character from '$lib/assets/kawaii/character.png';
	import { Mina, UInt64 } from 'o1js';

	export let goal: number;
	export let raised: number;
	export let amount: number;

	export let mint: (to: Mina.TestPublicKey, amt: UInt64) => Promise<void>;
	export let donate: (from: Mina.TestPublicKey, amt: UInt64) => Promise<void>;
	export let refund: (from: Mina.TestPublicKey) => Promise<void>;

	export let mina: any;
	export let thisAccount: Mina.TestPublicKey;
</script>

<form class="w-full max-w-sm rounded-xl bg-pink-100/90 p-4 shadow-md">
	<a href="https://minaprotocol.com/" target="_blank" rel="noopener noreferrer">
		<img src={character} alt="Character portrait" width="72" height="72" />
	</a>
	<div class="my-2">
		<input
			type="number"
			class="rounded-sm"
			placeholder="Amount to donate"
			aria-label="Amount to donate"
			on:input={(e) => (amount = e.target?.value)}
			required
		/>
		<p class="my-2">{goal - raised} to goal!</p>
	</div>
	<button
		type="button"
		class="focus:shadow-outline rounded bg-pink-500 px-4 py-2 font-bold text-white hover:bg-pink-700 focus:outline-none"
		on:click={() => donate(thisAccount, UInt64.from(amount))}
	>
		Donate
	</button>
	<button
		type="button"
		class="focus:shadow-outline rounded bg-gray-500 px-4 py-2 font-bold text-white hover:bg-gray-700 focus:outline-none"
	>
		Reclaim
	</button>
	<button
		type="button"
		class="focus:shadow-outline rounded bg-gray-500 px-4 py-2 font-bold text-white hover:bg-gray-700 focus:outline-none"
	>
		Claim
	</button>
</form>
