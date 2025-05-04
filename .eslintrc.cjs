module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'o1js',
    'prettier',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:o1js/recommended',
    // must go last, turns off conflicting rules & reports Prettier errors as ESLint errors
    'plugin:prettier/recommended'
  ],
  rules: {
    'prettier/prettier': ['error', { semi: true, singleQuote: true }]
  },
};
