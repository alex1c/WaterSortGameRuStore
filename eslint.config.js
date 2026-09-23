// ESLint flat config for Expo SDK 57 (ESLint 9).
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
	...expoConfig,
	{
		ignores: [
			'node_modules/**',
			'android/**',
			'ios/**',
			'.expo/**',
			'dist/**',
			'coverage/**',
		],
	},
	{
		rules: {
			// Keep Phase 1 noise low while still catching real mistakes.
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
		},
	},
])
