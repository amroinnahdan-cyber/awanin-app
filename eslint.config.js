// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // .expo holds generated route types; they are not hand-written source.
    ignores: ['dist/*', '.expo/*'],
  },
]);
