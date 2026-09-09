import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { _electron as electron } from '@playwright/test';
const profile = await mkdtemp(path.join(tmpdir(), 'superdocx-history-'));
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
let app;
try {
  app = await electron.launch({ args: ['.', '--user-data-dir=' + profile], env });
  const page = await app.firstWindow();
  await page.waitForFunction(() => document.querySelector('.save-button')?.disabled === false, { timeout: 45000 });
  await page.getByText('A LITTLE SPACE FOR BIG IDEAS', { exact: true }).click();
  await page.keyboard.press('End');
  await page.keyboard.type('DESKTOP_HISTORY_PROBE', { delay: 15 });
  await page.waitForFunction(() => document.querySelector('#document-editor').textContent.includes('DESKTOP_HISTORY_PROBE'));
  const menu = label => app.evaluate(({ Menu }, label) => {
    const edit = Menu.getApplicationMenu().items.find(item => ['Edit', '编辑'].includes(item.label));
    const item = edit.submenu.items.find(item => label.includes(item.label));
    if (!item) throw new Error('Missing history menu');
    item.click();
  }, label);
  await menu(['Undo', '撤销']);
  await page.waitForFunction(() => !document.querySelector('#document-editor').textContent.includes('DESKTOP_HISTORY_PROBE'));
  await menu(['Redo', '重做']);
  await page.waitForFunction(() => document.querySelector('#document-editor').textContent.includes('DESKTOP_HISTORY_PROBE'));
  await page.locator('#tab-view').click();
  await page.locator('[data-item="btn-app-settings"]').click();
  const field = page.locator('form input');
  await field.focus(); await page.keyboard.press('End'); await page.keyboard.type('FIELD_HISTORY');
  const typed = await field.inputValue();
  await menu(['Undo', '撤销']);
  await page.waitForFunction(value => document.querySelector('form input').value !== value, typed);
  assert.equal(await page.evaluate(() => document.querySelector('#document-editor').textContent.includes('DESKTOP_HISTORY_PROBE')), true);
  console.log('PASS: Electron menu undo/redo uses document history; text-field undo remains native');
} catch (error) { console.error('Desktop history test failed:', error); throw error; }
finally {
  if (app) {
    const process = app.process();
    const exited = process.exitCode === null ? new Promise(resolve => process.once('exit', resolve)) : Promise.resolve();
    await app.evaluate(({ app }) => app.exit()).catch(() => {});
    await exited;
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }).catch(error => console.warn('Test profile cleanup:', error.message));
}
