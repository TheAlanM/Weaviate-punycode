import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Verifies the README finding and the graphql-request@7 workaround:
 *
 * - With graphql-request@6, weaviate-client pulls in cross-fetch -> node-fetch@2
 *   -> whatwg-url@5 -> tr46@0.0.3, which `require("punycode")` (the deprecated
 *   built-in) and surface the DEP0040 warning to end users on common Node builds.
 * - Forcing graphql-request@7 (native fetch) removes that whole chain, so
 *   `require("punycode")` never runs and the warning disappears.
 *
 * This repo pins graphql-request@7 via the "overrides" field, so the
 * punycode-requiring transitive deps must NOT be installed.
 */

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function isInstalled(pkg: string): boolean {
  try {
    require.resolve(pkg);
    return true;
  } catch {
    return false;
  }
}

test('weaviate-client imports without throwing', async () => {
  const mod = await import('weaviate-client');
  assert.ok(mod.default, 'default export should exist');
  assert.equal(typeof mod.default.connectToLocal, 'function');
});

test('graphql-request is forced to v7 via overrides', () => {
  const pkgPath = join(repoRoot, 'node_modules', 'graphql-request', 'package.json');
  const { version } = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
  const major = Number(version.split('.')[0]);
  assert.ok(major >= 7, `expected graphql-request >= 7, got ${version}`);
});

test('punycode-requiring transitive deps are removed by graphql-request@7', () => {
  for (const pkg of ['cross-fetch', 'node-fetch', 'whatwg-url', 'tr46']) {
    assert.equal(isInstalled(pkg), false, `${pkg} should not be installed`);
  }
});
