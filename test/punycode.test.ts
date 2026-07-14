import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

/**
 * These tests document and verify the README finding: the deprecated built-in
 * `punycode` module warning (DEP0040) is emitted only when required from user
 * code outside `node_modules`, and Node suppresses it for requires that
 * originate inside `node_modules` (which is where the Weaviate client's
 * transitive deps live).
 */

function runNode(script: string): string {
  // DEP0040 is printed to stderr, so capture and merge both streams.
  const res = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  return `${res.stdout ?? ''}${res.stderr ?? ''}`;
}

test('weaviate-client imports without throwing', async () => {
  const mod = await import('weaviate-client');
  assert.ok(mod.default, 'default export should exist');
  assert.equal(typeof mod.default.connectToLocal, 'function');
});

test('direct require("punycode") from user code emits DEP0040', () => {
  const out = runNode("require('punycode'); console.log('done');");
  assert.match(out, /DEP0040/);
});

test('require("punycode") originating inside node_modules is suppressed by Node', () => {
  // whatwg-url@5 -> url-state-machine.js does `require("punycode")`.
  const out = runNode(
    "require('whatwg-url/lib/url-state-machine.js'); console.log('done');",
  );
  assert.doesNotMatch(out, /DEP0040/);
});
