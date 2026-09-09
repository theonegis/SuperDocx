import assert from 'node:assert/strict';import{chromium}from'@playwright/test';import{createServer}from'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5178}});await server.listen();let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();await page.goto('http://127.0.0.1:5178');
 const result=await page.evaluate(async()=>{
  const {insertSourceCitation,updateBibliography}=await import('/src/citations.js');
  const fail=()=>{throw new Error('injected failure');};let writes=0,failures=0;
  const doc={citations:{insert:fail,sources:{list:async()=>({items:[],total:0}),insert:async()=>({success:true,source:{sourceId:'new'}})}}};
  try{await insertSourceCitation(doc,{}, {sourceId:'existing'},()=>writes++);}catch{failures++;}
  const failedOnly=writes;
  try{await insertSourceCitation(doc,{}, {data:{title:'New source',itemType:'book'}},()=>writes++);}catch{failures++;}
  const partiallyWritten=writes;
  const visited=[];let pages=0;
  const bibliography={find:async({offset,limit})=>{pages++;return{total:205,items:Array.from({length:Math.min(limit,205-offset)},(_,i)=>({address:{nodeId:offset+i}}))};},citations:{bibliography:{rebuild:async({target})=>{visited.push(target.nodeId);return{success:true};}}}};
  await updateBibliography(bibliography);
  let partial=0;
  bibliography.citations.bibliography.rebuild=async({target})=>{if(target.nodeId===1)throw new Error('later failure');return{success:true};};
  try{await updateBibliography(bibliography,()=>partial++);}catch{failures++;}
  return{failedOnly,partiallyWritten,failures,visited,pages,partial};
 });
 assert.equal(result.failedOnly,0);assert.equal(result.partiallyWritten,1);assert.equal(result.failures,3);assert.equal(result.partial,1);assert.deepEqual(result.visited,Array.from({length:205},(_,i)=>i));assert.equal(result.pages,6);
 console.log('PASS: failed writes do not dirty; partial writes do; all 205 bibliography entries handled');
}finally{await browser?.close();await server.close();}
