import { mkdtemp } from 'node:fs/promises';
import { tmpdir, userInfo } from 'node:os';
const testProfile = await mkdtemp(tmpdir() + '/superdocx-test-');
import { _electron as electron, expect } from '@playwright/test';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { editAndComment } from './workflow.mjs';

await mkdir('artifacts', { recursive: true });
const savePath = path.resolve('artifacts/desktop-roundtrip.docx');
const copyPath = path.resolve('artifacts/desktop-copy.docx');
const inputPath = path.resolve('artifacts/input.docx');
await copyFile('public/welcome.docx', inputPath);
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const application = await electron.launch({ ...(process.env.SUPERDOCX_TEST_EXECUTABLE ? { executablePath: process.env.SUPERDOCX_TEST_EXECUTABLE, args: ['--user-data-dir=' + testProfile] } : { args: ['.', '--user-data-dir=' + testProfile] }), env });
const page = await application.firstWindow();
const errors = [];
const remoteRequests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (/^(https?|wss?):/.test(request.url())) remoteRequests.push(request.url()); });
async function dialogs({ open = inputPath, save = savePath, cancelSave = false, discard = false } = {}) {
  await application.evaluate(({ dialog }, values) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [values.open] });
    dialog.showSaveDialog = async () => ({ canceled: values.cancelSave, filePath: values.save });
    dialog.showMessageBox = async () => ({ response: values.discard ? 1 : 0, checkboxChecked: false });
  }, { open, save, cancelSave, discard });
}
async function checkFile(filename) {
  const zip = await JSZip.loadAsync(await readFile(filename));
  assert.match(await zip.file('word/document.xml').async('string'), /OFFLINE_EDIT_2026/);
  const comments = await zip.file('word/comments.xml').async('string');
  assert.match(comments, /离线批注验证/);
  assert.ok(comments.includes(userInfo().username));
  assert.match(comments, /示例批注/);
  const documentXml = await zip.file('word/document.xml').async('string');
  assert.match(documentXml, /commentRangeStart/);
  return zip;
}
try {
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeEnabled({ timeout: 60000 });
  await dialogs();
  await page.getByRole('button', { name: '打开文档', exact: true }).click();
  await expect(page.locator('.filename')).toContainText('input.docx');
  await editAndComment(page);
  // Cancelled Save As must leave the editor dirty.
  await dialogs({ cancelSave: true });
  await page.getByRole('button', { name: '另存为', exact: true }).click();
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeEnabled();
  await expect(page.locator('.unsaved-dot')).toBeVisible();
  // Save As, then reopen from actual disk bytes through the native bridge.
  await dialogs();
  await page.getByRole('button', { name: '另存为', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(/已保存到本地/, { timeout: 30000 });
  await checkFile(savePath);
  await dialogs({ open: savePath });
  await page.getByRole('button', { name: '打开文档', exact: true }).click();
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeEnabled({ timeout: 60000 });
  await expect(page.locator('#document-editor')).toContainText('OFFLINE_EDIT_2026');
  await expect(page.locator('#document-editor')).toContainText('离线批注验证：请核对标题。');
  // View mode must prevent real typing, not only disable our add-comment button.
  await page.getByRole('tab', {name:'审阅',exact:true}).click();
  await page.getByRole('button', { name: '查看', exact: true }).click();
  await page.getByText('一份文档，无限可能。', { exact: true }).click();
  await page.keyboard.insertText('MUST_NOT_APPEAR');
  await expect(page.locator('#document-editor')).not.toContainText('MUST_NOT_APPEAR');
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByText('一份文档，无限可能。', { exact: true }).click();
  await page.keyboard.insertText('SECOND_EDIT ');
  await expect(page.getByRole('status')).toContainText('未保存');
  // Original save should persist without any Save As dialog.
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(/已保存到本地/);
  let zip = await checkFile(savePath);
  assert.match(await zip.file('word/document.xml').async('string'), /SECOND_EDIT/);
  // An external write must be preserved and reported as a conflict.
  const externalBytes = await readFile('public/welcome.docx');
  await writeFile(savePath, externalBytes);
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('其他程序修改');
  assert.deepEqual(await readFile(savePath), externalBytes);
  await page.getByRole('button', { name:'知道了',exact:true }).click();
  await dialogs({ save: copyPath });
  await page.getByRole('button', { name: '另存为', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(/已保存到本地/);
  await checkFile(copyPath);
  // Invalid input cannot replace the current document.
  const badPath = path.resolve('artifacts/invalid.docx');
  await writeFile(badPath, 'not a docx');
  await dialogs({ open: badPath });
  await page.getByRole('button', { name: '打开文档', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('有效的 DOCX');
  await expect(page.locator('#document-editor')).toContainText('SECOND_EDIT');
  await page.getByRole('button', { name: '关闭提示' }).click();
  // A failed external fetch confirms the renderer is constrained to local resources.
  const blocked = await page.evaluate(async () => { try { await fetch('https://example.com/superdocx-offline-probe'); return false; } catch { return true; } });
  assert.equal(blocked, true);
  assert.deepEqual(remoteRequests.filter(url => !url.includes('superdocx-offline-probe')), []);
  assert.deepEqual(errors, []);
  await page.locator('.document-scroll').evaluate(e => { e.scrollTop = 0; });
  await page.screenshot({ path: 'artifacts/desktop.png' });
  await writeFile('artifacts/test-results.json', JSON.stringify({ status: 'passed', electron: await application.evaluate(() => process.versions.electron), platform: process.platform, arch: process.arch, pageErrors: errors, unexpectedRemoteRequests: remoteRequests.filter(url => !url.includes('superdocx-offline-probe')), checks: ['native open', 'text edit', 'selection comment', 'cancel save-as', 'save-as', 'DOCX XML content + comments', 'native reopen', 'viewing blocks typing', 'save original', 'external conflict', 'save-as recovery', 'corrupt input', 'offline fetch blocked'] }, null, 2));
  console.log('PASS: Electron DOCX edit/comment/save/reopen, conflict protection, corrupt input and offline checks');
} catch (error) {
  await page.screenshot({ path: 'artifacts/failure.png' }).catch(() => {});
  console.log('PAGE ERRORS', errors);
  console.log((await page.locator('body').innerText()).slice(-3500));
  throw error;
} finally { await application.evaluate(({ app }) => app.exit()); }
