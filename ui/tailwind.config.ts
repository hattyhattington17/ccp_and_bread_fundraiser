import type { Config } from 'tailwindcss';

const config: Config = {
	content: [
		'./src/**/*.{html,js,svelte,ts}' // Adjust paths to match your project structure
	],
	theme: {
		extend: {}
	},
	plugins: []
};

export default config;
