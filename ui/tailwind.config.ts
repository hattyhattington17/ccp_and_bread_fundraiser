import type { Config } from 'tailwindcss';

const config: Config = {
	content: [
		'./src/**/*.{html,js,svelte,ts}' // Adjust paths to match your project structure
	],
	theme: {
		extend: {
			colors: {
				primary: '#1E40AF', // Example custom color
				secondary: '#9333EA'
			},
			fontFamily: {
				sans: ['Inter', 'sans-serif'] // Example custom font
			},
			spacing: {
				'128': '32rem' // Example custom spacing
			}
		}
	},
	plugins: []
};

export default config;
