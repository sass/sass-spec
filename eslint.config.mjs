import {defineConfig, globalIgnores} from 'eslint/config';
import gts from 'gts';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['**/*.js']),
  {
    extends: [tseslint.configs.recommended, gts],
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {allowExpressions: true},
      ],
      '@typescript-eslint/no-empty-interface': ['error'],
      'func-style': ['error', 'declaration'],
      'prefer-const': ['error', {destructuring: 'all'}],
      'sort-imports': ['error', {ignoreDeclarationSort: true}],
    },
  },
]);
