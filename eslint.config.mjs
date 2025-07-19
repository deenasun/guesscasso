import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Add any specific rules you need
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js 13+
      'react/prop-types': 'off',
    },
  },
];

export default eslintConfig;
