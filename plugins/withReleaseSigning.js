/**
 * Release signing for `assemblyRelease` builds.
 *
 * `android/` is a generated folder (see AGENTS.md), so the signing config cannot
 * be edited by hand: this config plugin patches `app/build.gradle` on every
 * `expo prebuild`, which is exactly what CI runs before assembling the APK.
 *
 * Why it reads from the environment: a keystore file and its passwords must
 * never be committed. CI decodes the keystore from a repository secret into
 * `$RUNNER_TEMP`, exports the four `AWANIN_*` variables, and Gradle picks them
 * up. Without them the release build keeps the template's debug keystore, which
 * is fine for a local experiment but is never published (the workflow refuses
 * to release an APK whose certificate does not match the real keystore).
 *
 * Android only accepts an update when it is signed with the same key as the
 * installed app, so this also protects users who installed an earlier build.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING_MARKER = '// @awanin-release-signing';
const BUILD_TYPE_MARKER = '// @awanin-release-signing-build-type';
const KEYSTORE_ENV = 'AWANIN_KEYSTORE_FILE';

const SIGNING_BLOCK = `
        ${SIGNING_MARKER}
        release {
            // Path and passwords come from the environment; the keystore itself
            // is never part of the repository. Same shape as the React Native
            // docs' hasProperty recipe, so the config simply has no store when
            // nothing is configured.
            def keystorePath = System.getenv('${KEYSTORE_ENV}')
            if (keystorePath) {
                storeFile file(keystorePath)
                storePassword System.getenv('AWANIN_KEYSTORE_PASSWORD')
                keyAlias System.getenv('AWANIN_KEY_ALIAS')
                keyPassword System.getenv('AWANIN_KEY_PASSWORD')
            }
        }`;

const RELEASE_SIGNING_LINES = [
  BUILD_TYPE_MARKER,
  '// Signed with the release key whenever CI provides the keystore, so a',
  '// published APK can be updated in place. The debug key is a local-only',
  '// fallback for `assembleRelease` runs without secrets.',
  `signingConfig System.getenv('${KEYSTORE_ENV}') ? signingConfigs.release : signingConfigs.debug`,
];

function indentOf(contents, index) {
  const lineStart = contents.lastIndexOf('\n', index) + 1;
  const leading = contents.slice(lineStart, index).match(/^[ \t]*/);
  return leading ? leading[0] : '';
}

function fail(reason) {
  throw new Error(
    `withReleaseSigning: ${reason}. Perbarui plugins/withReleaseSigning.js agar cocok ` +
      'dengan template Gradle Expo yang baru — tanpa ini APK rilis akan bertanda ' +
      'tangan debug dan tidak bisa di-update.',
  );
}

/**
 * Adds a `release` signing config next to the template's `debug` one.
 * Idempotent: prebuild applies the mod on every run, so a second pass must not
 * append a duplicate block.
 */
function addSigningConfig(contents) {
  if (contents.includes(SIGNING_MARKER)) return contents;
  if (!/signingConfigs\s*\{/.test(contents)) {
    fail('blok `signingConfigs {` tidak ditemukan di android/app/build.gradle');
  }
  // `signingConfigs {` appears once; the `signingConfigs.debug` references sit
  // outside it and do not match this pattern.
  return contents.replace(/signingConfigs\s*\{/, (match) => `${match}${SIGNING_BLOCK}`);
}

/**
 * Points `buildTypes.release` at the release config. The template ships
 * `signingConfig signingConfigs.debug` in both build types, so the search starts
 * at the `release {` block rather than at the first match in the file.
 */
function pointReleaseBuildTypeAtReleaseKey(contents) {
  if (contents.includes(BUILD_TYPE_MARKER)) return contents;

  const buildTypesAt = contents.indexOf('buildTypes {');
  if (buildTypesAt === -1) fail('blok `buildTypes {` tidak ditemukan');

  const releaseAt = contents.indexOf('release {', buildTypesAt);
  if (releaseAt === -1) fail('buildType `release` tidak ditemukan');

  const debugSigning = 'signingConfig signingConfigs.debug';
  const signingAt = contents.indexOf(debugSigning, releaseAt);
  if (signingAt === -1) fail('baris signingConfig pada buildType `release` tidak ditemukan');

  // The template explains why the debug key is a placeholder; that note stops
  // being true once this plugin owns the line, so drop it along with the code.
  const cautionAt = contents.slice(releaseAt, signingAt).indexOf('// Caution! In production');
  // Start at the beginning of the line, not at the comment, so the leading
  // whitespace is not kept in front of the replacement's own indentation.
  const removeFrom =
    cautionAt === -1
      ? signingAt
      : contents.lastIndexOf('\n', releaseAt + cautionAt) + 1;

  const indent = indentOf(contents, signingAt);
  const replacement = RELEASE_SIGNING_LINES.map((line) => `${indent}${line}`).join('\n');

  return (
    contents.slice(0, removeFrom) +
    replacement +
    contents.slice(signingAt + debugSigning.length)
  );
}

function applyReleaseSigning(contents) {
  return pointReleaseBuildTypeAtReleaseKey(addSigningConfig(contents));
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      fail(`build.gradle berbahasa ${cfg.modResults.language}, bukan groovy`);
    }
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};

// Exposed so the transformation can be exercised without a full prebuild.
module.exports.applyReleaseSigning = applyReleaseSigning;
