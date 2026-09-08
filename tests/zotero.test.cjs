const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createZoteroClient}=require('../electron/zotero.cjs');
test('Zotero connection, search encoding, metadata and disconnect',async()=>{
 const calls=[];
 const client=createZoteroClient(async(route,key)=>{calls.push({route,key});return route==='/keys/current'?{data:{userID:42,username:'Test',access:{user:{library:true}}}}:{total:2,data:[{key:'ITEM1234',data:{itemType:'journalArticle',title:'Paper',abstractNote:'DO NOT EXPOSE',creators:[{creatorType:'author',lastName:'Example'}]}},{key:'NOTE1234',data:{itemType:'note',note:'private'}}]}});
 const key='A'.repeat(24);
 await assert.rejects(client.search(),/先连接/);
 await assert.rejects(client.connect('bad'),/API Key/);
 assert.deepEqual(await client.connect(key),{userID:42,username:'Test'});
 const found=await client.search({query:'中文 & title',start:25});
 assert.equal(found.items.length,1);assert.equal(found.items[0].data.abstractNote,undefined);
 assert.equal(new URL('https://api.zotero.org'+calls[1].route).searchParams.get('q'),'中文 & title');
 assert.ok(!calls[1].route.includes(key));
 client.disconnect();assert.equal(client.status(),null);await assert.rejects(client.search(),/先连接/);
});
test('A key without library access cannot authenticate',async()=>{
 const client=createZoteroClient(async()=>({data:{userID:42,access:{user:{library:false}}}}));
 await assert.rejects(client.connect('B'.repeat(24)),/读取权限/);assert.equal(client.status(),null);
});
