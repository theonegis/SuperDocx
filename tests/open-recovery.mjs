import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5178}});await server.listen();let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:5178');await expect(page.locator('.save-button')).toBeEnabled({timeout:45000});
 const name=await page.locator('.filename').textContent();
 await page.getByText('A LITTLE SPACE FOR BIG IDEAS',{exact:true}).click();await page.keyboard.type('RECOVERY_PROBE',{delay:15});
 await expect(page.locator('#document-editor')).toContainText('RECOVERY_PROBE');
 await page.locator('input[type=file]').setInputFiles({name:'broken.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from('not a zip')});
 await expect(page.getByRole('alertdialog')).toBeVisible();await page.getByRole('alertdialog').locator('.primary-button').click();
 await expect(page.locator('.save-button')).toBeEnabled();assert.equal(await page.locator('.filename').textContent(),name);
 await expect(page.locator('#document-editor')).toContainText('RECOVERY_PROBE');await expect(page.locator('.unsaved-dot')).toBeVisible();
 await page.evaluate(()=>{const sd=document.querySelector('#document-editor .superdoc').__vueParentComponent.appContext.config.globalProperties.$superdoc;const original=sd.replaceFile.bind(sd);let fail=true;sd.replaceFile=async(...args)=>{const result=await original(...args);if(fail){fail=false;throw new Error('Injected failure after replacement');}return result;};});
 await page.locator('input[type=file]').setInputFiles('public/blank.docx');
 await expect(page.getByRole('alertdialog')).toBeVisible();await page.getByRole('alertdialog').locator('.primary-button').click();
 await expect(page.locator('.save-button')).toBeEnabled();assert.equal(await page.locator('.filename').textContent(),name);
 await expect(page.locator('#document-editor')).toContainText('RECOVERY_PROBE');await expect(page.locator('.unsaved-dot')).toBeVisible();
 await page.evaluate(()=>{const sd=document.querySelector('#document-editor .superdoc').__vueParentComponent.appContext.config.globalProperties.$superdoc;sd.replaceFile=async()=>{throw new Error('Injected replacement and rollback failure');};});
 await page.locator('input[type=file]').setInputFiles('public/blank.docx');
 await expect(page.getByRole('alertdialog')).toBeVisible();
 const recovery=await page.evaluate(async()=>{const {sessionHandoff}=await import('/src/session.js');const item=await sessionHandoff('get');return {dirty:item.resumeDirty,bytes:item.file.size};});
 assert.equal(recovery.dirty,true);assert.ok(recovery.bytes>0);
 await page.reload();await expect(page.locator('.save-button')).toBeEnabled({timeout:45000});
 assert.equal(await page.locator('.filename').textContent(),name);
 await expect(page.locator('#document-editor')).toContainText('RECOVERY_PROBE');await expect(page.locator('.unsaved-dot')).toBeVisible();
 console.log('PASS: corrupt file, post-replacement failure, rollback failure and persisted reload recovery preserve original document');
}finally{await browser?.close();await server.close();}
