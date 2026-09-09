import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';import JSZip from 'jszip';
import {_electron as electron,expect} from '@playwright/test';
const dir=await mkdtemp(path.join(tmpdir(),'superdocx-open-'));
const original=path.join(dir,'original.docx'),broken=path.join(dir,'broken.docx');
const invalid=Buffer.from([0x50,0x4b,3,4,1,2,3]);await writeFile(broken,invalid);
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;let app,child;
try{
 app=await electron.launch({args:['.','--user-data-dir='+path.join(dir,'profile')],env});child=app.process();const page=await app.firstWindow();
 await expect(page.locator('.save-button')).toBeEnabled({timeout:45000});
 await app.evaluate(({dialog},{original,broken})=>{globalThis.saveDialogCount=0;dialog.showSaveDialog=async()=>{globalThis.saveDialogCount++;return {canceled:false,filePath:original};};dialog.showOpenDialog=async()=>({canceled:false,filePaths:[broken]});dialog.showMessageBox=async()=>({response:1});},{original,broken});
 await page.locator('.save-button').click();await expect(page.locator('.filename')).toContainText('original.docx');await expect(page.locator('.save-button')).toBeEnabled();
 await page.getByText('A LITTLE SPACE FOR BIG IDEAS',{exact:true}).click();await page.keyboard.type('ORIGINAL_PATH_PROBE',{delay:15});await expect(page.locator('.unsaved-dot')).toBeVisible();
 await page.keyboard.press('Control+o');await expect(page.getByRole('alertdialog')).toBeVisible();await page.getByRole('alertdialog').locator('.primary-button').click();
 await expect(page.locator('.save-button')).toBeEnabled();await expect(page.locator('.filename')).toContainText('original.docx');
 await page.locator('.save-button').click();await expect(page.locator('.unsaved-dot')).toHaveCount(0);
 assert.equal(await app.evaluate(()=>globalThis.saveDialogCount),1);
 const zip=await JSZip.loadAsync(await readFile(original));assert.match(await zip.file('word/document.xml').async('string'),/ORIGINAL_PATH_PROBE/);
 assert.deepEqual(await readFile(broken),invalid);
 console.log('PASS: failed Open preserves original save handle; Save updates original DOCX and leaves rejected file untouched');
}finally{if(child?.exitCode===null){const exited=new Promise(r=>child.once('exit',r));await app.evaluate(({app})=>app.exit()).catch(()=>{});await exited;}await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:300});}
