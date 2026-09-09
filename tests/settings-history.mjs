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
  await page.evaluate(async () => {
    const instance = document.querySelector('#document-editor .superdoc').__vueParentComponent.appContext.config.globalProperties.$superdoc;
    window.settingsTestInstance = instance;
    await instance.activeEditor.authoring.setSelectionByText({ text: 'A LITTLE SPACE FOR BIG IDEAS', collapse: 'end', focus: true });
  });
  await page.keyboard.type('SETTINGS_HISTORY_PROBE', { delay: 15 });
  await page.waitForFunction(() => document.querySelector('#document-editor').textContent.includes('SETTINGS_HISTORY_PROBE'));
  await page.locator('#tab-view').click();
  await page.locator('[data-item="btn-app-settings"]').click();
  await page.locator('form .primary-button').click();
  await page.locator('form').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => window.settingsTestInstance === document.querySelector('#document-editor .superdoc').__vueParentComponent.appContext.config.globalProperties.$superdoc), true);
  assert.equal(await page.locator('.unsaved-dot').count(), 1);
  await page.locator('#tab-home').click();
  await page.locator('[data-item="btn-undo"]').click();
  await page.waitForFunction(() => !document.querySelector('#document-editor').textContent.includes('SETTINGS_HISTORY_PROBE'));
  console.log('PASS: unchanged settings retain editor identity, dirty state and working undo');
} finally { await browser?.close(); await server.close(); }
