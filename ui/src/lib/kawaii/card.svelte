<script lang="ts">
	export let cardTitle: string;
	export let cardText: string;
	export let href: string;
	export let emoji: string;
</script>

<div class="max-w-sm overflow-hidden rounded-xl bg-pink-100/90 shadow-lg">
	<a {href} target="_blank" rel="noopener noreferrer">
		<div class="px-6 py-4">
			<span class="rounded bg-pink-200 text-5xl">{emoji}</span>
			<div class="text-xl font-bold">
				{cardTitle}
			</div>
			<p class="text-base text-gray-700">
				{cardText}
			</p>
		</div>
	</a>
</div>
