const https = require('node:https');
// Only Zotero's read API is reachable; neither document content nor credentials
// are ever put into a URL, a renderer store, or diagnostic messages.
function requestJson(route, key) {
  return new Promise((resolve, reject) => {
    const req = https.get({hostname:'api.zotero.org',path:route,headers:{'Zotero-API-Version':'3','Zotero-API-Key':key,Accept:'application/json'}}, res => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error(res.statusCode===403?'Zotero 访问密钥无效或缺少文献库读取权限。':res.statusCode===429?'Zotero 请求过于频繁，请稍后重试。':'无法读取 Zotero 文献库，请稍后重试。')); return; }
      const chunks=[]; let length=0;
      res.on('data',chunk=>{length+=chunk.length;if(length>4*1024*1024){req.destroy();reject(new Error('Zotero 响应过大。'));}else chunks.push(chunk)});
      res.on('error',()=>reject(new Error('Zotero 连接中断。')));
      res.on('end',()=>{try{resolve({data:JSON.parse(Buffer.concat(chunks).toString('utf8')),total:Number(res.headers['total-results'])||0})}catch{reject(new Error('Zotero 返回了无效数据。'))}});
    });
    req.setTimeout(15000,()=>req.destroy());
    req.on('error',()=>reject(new Error('无法连接 Zotero，请检查网络。')));
  });
}
function createZoteroClient(request=requestJson) {
  let key=null,account=null;
  return {
    status:()=>account ? {...account} : null,
    disconnect:()=>{key=null;account=null;},
    async connect(value) {
      if(typeof value!=='string'||! /^[a-zA-Z0-9]{20,64}$/.test(value.trim())) throw new Error('请输入有效的 Zotero API Key。');
      const nextKey=value.trim(); const {data}=await request('/keys/current',nextKey);
      if(!Number.isSafeInteger(data.userID)||data.userID<1||!data.access?.user?.library) throw new Error('Zotero 访问密钥无效或缺少文献库读取权限。');
      key=nextKey;account={userID:data.userID,username:String(data.username||data.userID).slice(0,100)};
      return {...account};
    },
    async search({query='',start=0}={}) {
      if(!key||!account)throw new Error('请先连接 Zotero 账户。');
      if(typeof query!=='string'||query.length>250||!Number.isSafeInteger(start)||start<0||start>100000)throw new Error('无效的文献搜索。');
      const params=new URLSearchParams({format:'json',itemType:'-attachment || note || annotation',q:query,qmode:'titleCreatorYear',limit:'25',start:String(start),sort:'dateModified',direction:'desc'});
      const {data,total}=await request(`/users/${account.userID}/items/top?${params}`,key);
      if(!Array.isArray(data))throw new Error('Zotero 返回了无效数据。');
      const allowed=['itemType','title','date','publisher','place','publicationTitle','volume','issue','pages','url','DOI','edition','shortTitle','ISBN','ISSN'];
      const clean=value=>typeof value==='string'?value.slice(0,4000):'';
      return {total,items:data.filter(x=>x?.data&&!['attachment','note','annotation'].includes(x.data.itemType)).map(x=>({key:clean(x.key),data:{...Object.fromEntries(allowed.map(k=>[k,clean(x.data[k])])),creators:(Array.isArray(x.data.creators)?x.data.creators:[]).slice(0,100).map(c=>({creatorType:clean(c.creatorType),firstName:clean(c.firstName),lastName:clean(c.lastName),name:clean(c.name)}))}}))};
    }
  };
}
module.exports={createZoteroClient};
