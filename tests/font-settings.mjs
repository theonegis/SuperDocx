import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
const server = await createServer({ server: { host: '127.0.0.1', port: 5178 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5178');
  await page.waitForFunction(() => document.querySelector('.save-button')?.disabled === false);
  const result = await page.evaluate(async () => {
    // Test-only access to the mounted SDK; no debug globals in the application.
    const sd = document.querySelector('#document-editor .superdoc').__vueParentComponent.appContext.config.globalProperties.$superdoc;
    const a = sd.activeEditor;
    const f = await import('/src/font-settings.js');
    await a.authoring.setSelectionByText({ text: 'A LITTLE SPACE FOR BIG IDEAS', focus: true });
    const capture = await a.doc.selection.current({ includeText: true });
    const initial = await f.readSelectionFonts(sd, capture);
    const value = f.changedFontPatch(initial, 'SimSun', 'Courier New');
    const receipt = await a.doc.format.rFonts({ target: capture.selectionTarget, value });
    const after = await f.readSelectionFonts(sd, capture);
    await a.authoring.setSelectionByText({ text: 'A LITTLE SPACE FOR BIG IDEAS', collapse: 'end', focus: true });
    await f.setTypingFonts(sd, { eastAsia: 'SimHei', eastAsiaTheme: null }, message => { throw new Error(message); });
    return { receipt, after, patch: f.changedFontPatch(after, 'SimHei', 'Courier New') };
  });
  assert.equal(result.receipt.success, true);
  assert.equal(result.after.east.value, 'SimSun');
  assert.equal(result.after.west.value, 'Courier New');
  assert.deepEqual(result.patch, { eastAsia: 'SimHei', eastAsiaTheme: null });
  await page.keyboard.type('FONT_PROBE', { delay: 100 });
  await page.waitForFunction(() => document.querySelector('#document-editor').textContent.includes('FONT_PROBE'));
  const read = text => page.evaluate(async text => {
    const sd = document.querySelector('#document-editor .superdoc').__vueParentComponent.appContext.config.globalProperties.$superdoc;
    await sd.activeEditor.authoring.setSelectionByText({ text, focus: true });
    const f = await import('/src/font-settings.js');
    return f.readSelectionFonts(sd, await sd.activeEditor.doc.selection.current({ includeText: true }));
  }, text);
  const typed = await read('FONT_PROBE');
  assert.equal(typed.east.value, 'SimHei');
  assert.equal(typed.west.value, 'Courier New');
  const original = await read('A LITTLE SPACE FOR BIG IDEAS');
  assert.equal(original.east.value, 'SimSun');
  const mixed = await read('A LITTLE SPACE FOR BIG IDEASFONT_PROBE');
  assert.equal(mixed.east.mixed, true);
  assert.equal(mixed.west.value, 'Courier New');
  await read('A LITTLE SPACE FOR BIG IDEAS');
  await page.locator('[data-item="btn-app-fonts"]').click();
  const fields = page.locator('form input[list="font-options"]');
  await fields.first().waitFor();
  assert.equal(await fields.nth(0).inputValue(), 'SimSun');
  assert.equal(await fields.nth(1).inputValue(), 'Courier New');
  await fields.nth(0).fill('SimHei');
  await page.locator('form .primary-button').click();
  await fields.first().waitFor({state:'hidden',timeout:5000}).catch(async error => { console.log(await page.locator('.error-banner').allTextContents()); throw error; });
  const edited = await read('A LITTLE SPACE FOR BIG IDEAS');
  assert.equal(edited.east.value, 'SimHei');
  assert.equal(edited.west.value, 'Courier New');
  console.log('PASS: separate font read/write, unchanged Western font, caret typing, original text preserved, mixed fonts');
} finally {
  await browser?.close();
  await server.close();
}
