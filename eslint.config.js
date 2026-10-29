import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Evidence приходит от сканируемой цели и считается недоверенным: HTML из него не вставляется никогда
      'react/no-danger': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: "AssignmentExpression[left.property.name='innerHTML']", message: 'innerHTML is forbidden' },
        { selector: "AssignmentExpression[left.property.name='outerHTML']", message: 'outerHTML is forbidden' },
        { selector: "CallExpression[callee.property.name='insertAdjacentHTML']", message: 'insertAdjacentHTML is forbidden' },
        { selector: "CallExpression[callee.name='eval']", message: 'eval is forbidden' },
        { selector: "NewExpression[callee.name='Function']", message: 'new Function is forbidden' },
      ],
      'no-restricted-globals': ['error', { name: 'localStorage', message: 'Tokens must not be stored in web storage' }, { name: 'sessionStorage', message: 'Tokens must not be stored in web storage' }],
    },
  },
)
