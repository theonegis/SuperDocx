import assert from 'node:assert/strict';import{chromium,expect}from'@playwright/test';import{createServer}from'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5178}});await server.listen();let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();let downloads=0;page.on('download',()=>downloads++);
 await page.goto('http://127.0.0.1:5178');await expect(page.locator('.save-button')).toBeEnabled({timeout:45000});
 const events=await page.evaluate(()=>['s','o','n','z','y'].map(key=>{const e=new KeyboardEvent('keydown',{key,ctrlKey:true,isComposing:true,bubbles:true,cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}));
 assert.deepEqual(events,[false,false,false,false,false]);
 await page.locator('#tab-view').click();await page.locator('[data-item="btn-app-settings"]').click();await expect(page.locator('form')).toBeVisible();
 await page.evaluate(()=>{const field=document.querySelector('form input');field.focus();field.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'zhong'}));field.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));});
 await expect(page.locator('form')).toBeVisible();
 await page.evaluate(()=>document.querySelector('form input').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'中'})));
 await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:229,bubbles:true,cancelable:true})));
 await expect(page.locator('form')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('form')).toHaveCount(0);
 assert.equal(downloads,0);
 console.log('PASS: composing Ctrl shortcuts untouched; composing/229 Escape retains dialog; normal Escape closes it');
}finally{await browser?.close();await server.close();}
