const {test}=require('node:test');
const assert=require('node:assert/strict');
test('font fallback respects DOCX family, fixed pitch and PANOSE metadata',async()=>{
 const {fontCategory}=await import('../src/font-category.js');
 assert.equal(fontCategory({name:'Missing Research Font',family:'roman'}),'serif');
 assert.equal(fontCategory({name:'Missing UI Font',family:'swiss'}),'sans-serif');
 assert.equal(fontCategory({family:'roman',pitch:'fixed'}),'monospace');
 assert.equal(fontCategory({panose:'020B0604020202020204'}),'sans-serif');
 assert.equal(fontCategory({panose:'02020609020202020204'}),'monospace');
 assert.equal(fontCategory({name:'楷体'}),'serif');
 assert.equal(fontCategory({name:'黑体'}),'sans-serif');
 assert.equal(fontCategory({name:'Unknown Font'}),null);
});
