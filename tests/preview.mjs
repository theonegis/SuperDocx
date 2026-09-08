import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
const testProfile = await mkdtemp(tmpdir() + '/superdocx-test-');
import { _electron as electron, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath: process.env.SUPERDOCX_TEST_EXECUTABLE, args:[...(process.env.SUPERDOCX_TEST_EXECUTABLE ? [] : ['.']), '--user-data-dir=' + testProfile],env});
try{const page=await app.firstWindow();await expect(page.getByRole('button',{name:'保存',exact:true})).toBeEnabled({timeout:60000});await expect(page.locator('.file-bar')).toHaveCSS('height','46px');await page.screenshot({path:'artifacts/ribbon.png'});for(const label of ['插入','页面','引用','审阅','视图']){await page.getByRole('tab',{name:label,exact:true}).click();await page.locator('#ribbon-tools').screenshot({path:'artifacts/compact-'+label+'.png'});}await page.getByRole('tab',{name:'开始',exact:true}).click();await page.locator('#document-toolbar').screenshot({path:'artifacts/toolbar-final.png'});await writeFile('artifacts/ribbon.html',await page.locator('#document-toolbar').innerHTML());await page.getByRole('tab',{name:'审阅',exact:true}).click(); await page.screenshot({path:'artifacts/review-ui.png'}); await page.getByRole('tab',{name:'视图',exact:true}).click(); await page.getByRole('button',{name:'设置',exact:true}).click(); await page.screenshot({path:'artifacts/settings-ui.png'}); console.log('PASS ribbon, review and settings UI');}finally{await app.evaluate(({app})=>app.exit());}
