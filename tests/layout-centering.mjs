import assert from 'node:assert/strict';import{chromium,expect}from'@playwright/test';import{createServer}from'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5178}});await server.listen();let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5178');await expect(page.locator('.save-button')).toBeEnabled({timeout:45000});
 await page.evaluate(async()=>{const sd=document.querySelector('#document-editor .superdoc').__vueParentComponent.appContext.config.globalProperties.$superdoc;window.layoutSdk=sd;await sd.activeEditor.authoring.setSelectionByText({text:'A LITTLE SPACE FOR BIG IDEAS',focus:true});const capture=await sd.activeEditor.doc.selection.current({includeText:true});const r=await sd.ui.comments.createFromCapture(capture,{text:'CENTERING_COMMENT'});if(!r.success)throw new Error('Cannot create test comment');});
 await expect(page.locator('.superdoc__right-sidebar')).toBeVisible();
 for(const zoom of [25,50,100,150,200,300,100]){
  await page.evaluate(zoom=>window.layoutSdk.setZoom(zoom),zoom);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
  const geometry=await page.evaluate(()=>{const surface=document.querySelector('.document-scroll'),host=document.querySelector('#document-editor'),ruler=document.querySelector('.v2-ruler-host');const s=surface.getBoundingClientRect(),h=host.getBoundingClientRect();return{centerError:Math.abs((h.left+h.right)/2-(s.left+s.right)/2),rulerWidth:ruler.getBoundingClientRect().width,hostWidth:h.width,overflow:surface.scrollWidth>surface.clientWidth,scrollLeft:surface.scrollLeft,nodes:[...host.querySelectorAll(".superdoc__layers,.superdoc__sub-document,.superdoc-page,[data-v2-paint-wrapper],.superdoc__right-sidebar")].slice(0,6).map(n=>({class:n.className,width:n.getBoundingClientRect().width,style:n.getAttribute("style")}))};});
  assert.ok(geometry.centerError<3,JSON.stringify({zoom,...geometry}));assert.ok(geometry.rulerWidth>100);
 }
 await page.setViewportSize({width:1000,height:800});
 await page.evaluate(()=>window.layoutSdk.setZoom(200));
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
 await page.evaluate(()=>{const surface=document.querySelector('.document-scroll');surface.scrollLeft=40;const marker=document.createElement('span');marker.textContent='layout probe';document.querySelector('#document-editor').append(marker);});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 assert.equal(await page.evaluate(()=>document.querySelector('.document-scroll').scrollLeft),40);
 await page.evaluate(async()=>{const sd=window.layoutSdk;const target=(await sd.activeEditor.doc.sections.list({})).items[0].address;await sd.activeEditor.doc.sections.setPageSetup({target,width:11.69,height:8.27,orientation:'landscape'});});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 assert.deepEqual(errors,[]);console.log('PASS: comment sidebar visible, 25-300% canvas centered, ruler visible, orientation change without page errors');
}finally{await browser?.close();await server.close();}
