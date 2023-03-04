/** @type {import("eslint").Linter.Config} */
const config = {
	overrides: [
		{
			extends: ["plugin:@typescript-eslint/recommended-requiring-type-checking"],
			files: ["*.ts", "*.tsx"],
			parserOptions: {
				project: "tsconfig.json",
			},
		},
	],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: "./tsconfig.json",
	},
	plugins: ["@typescript-eslint"],
	extends: ["next/core-web-vitals", "plugin:@typescript-eslint/recommended"],
	rules: {
		"@typescript-eslint/consistent-type-imports": [
			"warn",
			{
				prefer: "type-imports",
				fixStyle: "inline-type-imports",
			},
		],
		"@typescript-eslint/no-unsafe-argument": "off",
		"@typescript-eslint/no-unsafe-member-access": "off",
		"@typescript-eslint/no-unsafe-call": "off",
		"@typescript-eslint/no-unsafe-return": "off",
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-unsafe-assignment": "off",
	},
}

module.exports = config
