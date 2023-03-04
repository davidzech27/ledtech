/** @type {import('tailwindcss').Config} */
const config = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				primary: "#FF2F6D",
			},
		},
	},
	plugins: [],
}

module.exports = config
