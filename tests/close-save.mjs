import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { _electron as electron, expect } from '@playwright/test';
const dir = await mkdtemp(path.join(tmpdir(), 'superdocx-close-'));
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
let app;
let electronProcess;
try {
  app = await electron.launch({ args: ['.', '--user-data-dir=' + path.join(dir, 'profile')], env });
  electronProcess = app.process();
  const page = await app.firstWindow();
  await expect(page.locator('.save-button')).toBeEnabled({timeout:45000});
  await page.getByText('A LITTLE SPACE FOR BIG IDEAS', {exact:true}).click();
  await page.keyboard.press('End'); await page.keyboard.type('CLOSE_SAVE_PROBE',{delay:15});
  await expect(page.locator('.unsaved-dot')).toBeVisible();
  await app.evaluate(({ dialog }) => {
    globalThis.closeTest = { choice:2, saves:0, prompts:0, destination:null, opens:0 };
    dialog.showOpenDialog = async () => { globalThis.closeTest.opens++; return {canceled:true,filePaths:[]}; };
    dialog.showMessageBox = async (_window, options) => {
      globalThis.closeTest.buttons = options.buttons;
      globalThis.closeTest.prompts++;
      return {response:globalThis.closeTest.choice};
    };
    dialog.showSaveDialog = async () => {
      globalThis.closeTest.saves++;
      return globalThis.closeTest.destination ? {canceled:false,filePath:globalThis.closeTest.destination} : {canceled:true};
    };
  });
  const close = () => app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].close(); });
  await close();
  await expect.poll(()=>app.evaluate(()=>globalThis.closeTest.prompts)).toBe(1);
  assert.equal((await app.evaluate(()=>globalThis.closeTest.buttons)).length,3);
  await expect(page.locator('.unsaved-dot')).toBeVisible();
  await app.evaluate(()=>{globalThis.closeTest.choice=0;});
  await close();
  await expect.poll(()=>app.evaluate(()=>globalThis.closeTest.saves)).toBe(1);
  await expect(page.locator('.save-button')).toBeEnabled();
  await expect(page.locator('.unsaved-dot')).toBeVisible();
  await page.keyboard.press('Control+n');
  await expect.poll(()=>app.evaluate(()=>globalThis.closeTest.saves)).toBe(2);
  await expect(page.locator('.save-button')).toBeEnabled();
  await expect(page.locator('#document-editor')).toContainText('CLOSE_SAVE_PROBE');
  await page.keyboard.press('Control+o');
  await expect.poll(()=>app.evaluate(()=>globalThis.closeTest.saves)).toBe(3);
  await expect(page.locator('.save-button')).toBeEnabled();
  assert.equal(await app.evaluate(()=>globalThis.closeTest.opens),0);
  await expect(page.locator('#document-editor')).toContainText('CLOSE_SAVE_PROBE');
  await app.evaluate((_electron, file)=>{globalThis.closeTest.destination=file;},path.join(dir,'missing','failure.docx'));
  await close();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.locator('#document-editor')).toContainText('CLOSE_SAVE_PROBE');
  await page.getByRole('alertdialog').locator('.primary-button').click();
  const output=path.join(dir,'saved.docx');
  await app.evaluate((_electron,file)=>{globalThis.closeTest.destination=file;},output);
  const exited=app.waitForEvent('close');
  await close(); await exited;
  const zip=await JSZip.loadAsync(await readFile(output));
  assert.match(await zip.file('word/document.xml').async('string'),/CLOSE_SAVE_PROBE/);
  const savedBytes = await readFile(output);
  app = await electron.launch({ args: ['.', '--user-data-dir=' + path.join(dir, 'discard-profile')], env });
  electronProcess = app.process();
  const discardPage = await app.firstWindow();
  await expect(discardPage.locator('.save-button')).toBeEnabled({timeout:45000});
  await discardPage.getByText('A LITTLE SPACE FOR BIG IDEAS', {exact:true}).click();
  await discardPage.keyboard.type('DISCARD_PROBE');
  await expect(discardPage.locator('.unsaved-dot')).toBeVisible();
  await app.evaluate(({dialog}) => {
    dialog.showMessageBox = async () => ({response:1});
    dialog.showSaveDialog = async () => { throw new Error('Discard must not invoke Save'); };
  });
  const discarded = app.waitForEvent('close');
  await close(); await discarded;
  assert.deepEqual(await readFile(output), savedBytes);
  console.log('PASS: cancel/discard/save close; canceled save blocks New/Open; failed save retains document; saved DOCX verified');
} finally {
  if(app && electronProcess.exitCode===null){const exited=new Promise(resolve=>electronProcess.once('exit',resolve));await app.evaluate(({app})=>app.exit()).catch(()=>{});await exited;}
  await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:300});
}
