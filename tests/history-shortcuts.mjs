import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
const server = await createServer({ server: { host: '127.0.0.1', port: 5178 } });
await server.listen(); let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5178');
  await page.waitForFunction(() => document.querySelector('.save-button')?.disabled === false);
  await page.evaluate(async () => {
    const sd = document.querySelector('#document-editor .superdoc').__vueParentComponent.appContext.config.globalProperties.$superdoc;
    await sd.activeEditor.authoring.setSelectionByText({ text: 'A LITTLE SPACE FOR BIG IDEAS', collapse: 'end', focus: true });
  });
  await page.keyboard.type('LINUX_HISTORY_PROBE', { delay: 15 });
  const hasMarker = () => page.evaluate(() => document.querySelector('#document-editor').textContent.includes('LINUX_HISTORY_PROBE'));
  await page.waitForFunction(() => document.querySelector('#document-editor').textContent.includes('LINUX_HISTORY_PROBE'));
  await page.keyboard.press('Control+z');
  await page.waitForFunction(() => !document.querySelector('#document-editor').textContent.includes('LINUX_HISTORY_PROBE'));
  await page.keyboard.press('Control+y');
  await page.waitForFunction(() => document.querySelector('#document-editor').textContent.includes('LINUX_HISTORY_PROBE'));
  await page.keyboard.press('Control+z');
  await page.waitForFunction(() => !document.querySelector('#document-editor').textContent.includes('LINUX_HISTORY_PROBE'));
  await page.keyboard.press('Control+Shift+z');
  await page.waitForFunction(() => document.querySelector('#document-editor').textContent.includes('LINUX_HISTORY_PROBE'));
  await page.locator('#tab-view').click();
  await page.locator('[data-item="btn-app-settings"]').click();
  const author = page.locator('form input');
  await author.focus(); await page.keyboard.press('End'); await page.keyboard.type('LOCAL_FIELD');
  const typed = await author.inputValue();
  await page.keyboard.press('Control+z');
  assert.notEqual(await author.inputValue(), typed);
  assert.equal(await hasMarker(), true);
  console.log('PASS: Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, isolated dialog text undo');
} finally { await browser?.close(); await server.close(); }
