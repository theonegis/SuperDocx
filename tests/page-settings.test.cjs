const { test } = require('node:test');
const assert = require('node:assert/strict');
test('page dialog preserves Letter, custom sizes and no-op settings', async () => {
  const { readPageSettings, pageSetupPatch } = await import('../src/page-settings.js');
  const letter = { pageSetup: { width: 8.5, height: 11, orientation: 'portrait' } };
  const custom = { pageSetup: { width: 7.25, height: 10.25 } };
  assert.deepEqual(readPageSettings(letter), { paper: 'Letter', orientation: 'portrait' });
  assert.equal(pageSetupPatch(letter, 'Letter', 'portrait'), null);
  assert.equal(readPageSettings(custom).paper, 'current');
  assert.equal(pageSetupPatch(custom, 'current', 'portrait'), null);
  assert.deepEqual(pageSetupPatch(custom, 'current', 'landscape'), { width: 10.25, height: 7.25, orientation: 'landscape' });
  assert.deepEqual(pageSetupPatch(letter, 'A4', 'landscape'), { width: 16838 / 1440, height: 11906 / 1440, orientation: 'landscape' });
});
