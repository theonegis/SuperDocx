import { _electron as electron, expect } from '@playwright/test';
import {mkdtemp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
await mkdir('artifacts',{recursive:true});
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({args:['.','--user-data-dir='+await mkdtemp(tmpdir()+'/superdocx-fonts-')],env});
try{
 const page=await app.firstWindow();
 await page.waitForLoadState();
 await page.evaluate(()=>localStorage.setItem('superdocx.language','zh'));
 await page.reload();
 const session=await page.context().newCDPSession(page);
 await session.send('DOM.enable');await session.send('CSS.enable');
 // This physical-font regression test targets macOS with its built-in Chinese fonts.
 const cases=[['宋体',/Songti/],['黑体',/Heiti|PingFang/],['楷体',/Kaiti/],['Missing Serif Test',/Songti|Times|Serif/,'roman'],['Missing Sans Test',/PingFang|Arial|Sans/,'swiss'],['Missing Mono Test',/Menlo|Courier|Mono/,'modern']];
 for(const [family,expected,category] of cases){
  await expect(page.getByRole('button',{name:'保存',exact:true})).toBeEnabled({timeout:60000});
  const zip=await JSZip.loadAsync(await readFile('public/welcome.docx'));
  for(const name of Object.keys(zip.files).filter(n=>n.endsWith('.xml'))){zip.file(name,(await zip.file(name).async('string')).replaceAll('PingFang SC',family).replaceAll('Arial',family));}
  if(category){
   zip.file('word/fontTable.xml',`<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:font w:name="${family}"><w:family w:val="${category}"/></w:font></w:fonts>`);
   zip.file('word/document.xml',(await zip.file('word/document.xml').async('string')).replaceAll('一份文档，无限可能。','Font fallback ABC 0123'));
  }
  const input=path.resolve(`artifacts/font-${family}.docx`),output=path.resolve(`artifacts/font-${family}-saved.docx`);
  await writeFile(input,await zip.generateAsync({type:'nodebuffer'}));
  await app.evaluate(({dialog},{input,output})=>{
   dialog.showOpenDialog=async()=>({canceled:false,filePaths:[input]});
   dialog.showSaveDialog=async()=>({canceled:false,filePath:output});
  },{input,output});
  await page.getByRole('button',{name:'打开文档',exact:true}).click();
  await expect(page.locator('.filename')).toContainText(`font-${family}.docx`);
  const title=page.getByText(category?'Font fallback ABC 0123':'一份文档，无限可能。',{exact:true});
  await expect(title).toBeVisible({timeout:60000});
  await expect.poll(()=>title.evaluate(el=>getComputedStyle(el).fontFamily),{timeout:60000}).toContain(family);
  await title.evaluate(el=>el.id='physical-font-probe');
  const {root}=await session.send('DOM.getDocument');
  const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#physical-font-probe'});
  const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});
  console.log(family,fonts);
  assert.ok(fonts.some(f=>expected.test(f.familyName)&&f.glyphCount>0),`${family} uses matching physical font`);
  await page.getByRole('button',{name:'字体替代',exact:true}).click();
  await expect(page.getByRole('alertdialog')).toContainText(family+' →');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'另存为',exact:true}).click();
  await expect(page.locator('span[role=status]')).toHaveText(/已保存到本地/);
  const saved=await JSZip.loadAsync(await readFile(output));
  const xml=await saved.file('word/document.xml').async('string');
  assert.ok(xml.includes(family));
  assert.ok(!/Songti SC|Kaiti SC|Heiti SC/.test(xml),'display substitute must not rewrite document font');
 }
 console.log('PASS physical Song/Hei/Kai fonts, substitution dialog, original DOCX font preservation');
}finally{await app.evaluate(({app})=>app.exit());}
