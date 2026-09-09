const { test } = require('node:test');
const assert = require('node:assert/strict');
test('native document history routes to SDK and text fields route to Chromium', async () => {
  const { installHistoryShortcuts } = await import('../src/history-shortcuts.js');
  const targetWindow = new EventTarget();
  let textField = false, callback, removed = false;
  targetWindow.document = { activeElement: { closest: () => textField } };
  const calls = [];
  const cleanup = installHistoryShortcuts({ targetWindow, execute: command => calls.push('doc:' + command), desktop: {
    onHistoryCommand: listener => { callback = listener; return () => { removed = true; }; },
    nativeTextHistory: command => calls.push('text:' + command),
  } });
  callback('undo'); callback('redo'); callback('unsupported');
  targetWindow.dispatchEvent(new Event('compositionstart'));
  callback('undo'); callback('redo');
  targetWindow.dispatchEvent(new Event('compositionend'));
  textField = true; callback('undo'); callback('redo');
  assert.deepEqual(calls, ['doc:undo', 'doc:redo', 'text:undo', 'text:redo']);
  cleanup(); assert.equal(removed, true);
});
