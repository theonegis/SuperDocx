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
    const sd = document.querySelector('#document-editor .superdoc').__vueParentComponent.appContext.config.globalProperties.$superdoc;
    const section = (await sd.activeEditor.doc.sections.list({})).items[0];
    await sd.activeEditor.doc.sections.setPageSetup({ target: section.address, width: 7.25, height: 10.25, orientation: 'portrait' });
  });
  await page.locator('#tab-page').click();
  await page.locator('[data-item="btn-app-page"]').click();
  const controls = page.locator('form select');
  await controls.first().waitFor();
  assert.equal(await controls.nth(1).inputValue(), 'current');
  assert.equal(await controls.nth(2).inputValue(), 'portrait');
  await controls.nth(2).selectOption('landscape');
  await page.locator('form .primary-button').click();
  await controls.first().waitFor({ state: 'hidden' });
  const setup = await page.evaluate(async () => {
    const sd = document.querySelector('#document-editor .superdoc').__vueParentComponent.appContext.config.globalProperties.$superdoc;
    return (await sd.activeEditor.doc.sections.list({})).items[0].pageSetup;
  });
  assert.equal(setup.width, 10.25);
  assert.equal(setup.height, 7.25);
  assert.equal(setup.orientation, 'landscape');
  console.log('PASS: custom paper displayed and landscape preserves exact dimensions');
} finally { await browser?.close(); await server.close(); }
