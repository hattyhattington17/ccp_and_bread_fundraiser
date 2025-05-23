<script lang="ts">
	import type { Mina } from 'o1js';

	export let deployer: Mina.TestPublicKey;
	export let beneficiary: Mina.TestPublicKey;
	export let donors: Mina.TestPublicKey[];
	export let selected: Mina.TestPublicKey;
</script>

<nav class="flex w-full items-center justify-between bg-pink-100/90 p-4 shadow-md">
	<div>
		<button
			type="button"
			class="rounded bg-pink-500 px-4 py-2 font-bold text-white hover:bg-pink-700 focus:outline-none"
			on:click={() => (selected = deployer)}
		>
			Deployer
		</button>
		<button
			type="button"
			class="rounded bg-pink-500 px-4 py-2 font-bold text-white hover:bg-pink-700 focus:outline-none"
			on:click={() => (selected = beneficiary)}
		>
			Beneficiary
		</button>
		{#each donors as donor, idx}
			<button
				type="button"
				class="rounded bg-pink-500 px-4 py-2 font-bold text-white hover:bg-pink-700 focus:outline-none"
				on:click={() => (selected = donor)}
			>
				{`Donor ${idx + 1}`}
			</button>
			{' '}
		{/each}
	</div>
</nav>
