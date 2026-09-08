import { ensureSuccess } from './editor-features';
const types={book:'book',journalArticle:'journalArticle',conferencePaper:'conferenceProceedings',report:'report',webpage:'website',patent:'patent',case:'case',statute:'statute',thesis:'thesis',film:'film',interview:'interview'};
export function zoteroSource(data) {
 const people=type=>(data.creators||[]).filter(c=>c.creatorType===type).map(c=>({first:c.firstName||undefined,last:c.lastName||c.name||''})).filter(c=>c.last);
 const fields={title:data.title,authors:people('author'),year:data.date?.match(/\b\d{4}\b/)?.[0],publisher:data.publisher,city:data.place,journalName:data.publicationTitle,volume:data.volume,issue:data.issue,pages:data.pages,url:data.url,doi:data.DOI,edition:data.edition,editor:people('editor'),translator:people('translator'),shortTitle:data.shortTitle,standardNumber:data.ISBN||data.ISSN};
 return {type:types[data.itemType]||'misc',fields:Object.fromEntries(Object.entries(fields).filter(([,value])=>Array.isArray(value)?value.length:!!value))};
}
export async function insertSourceCitation(doc,target,item) {
 let sourceId=item.sourceId;
 if(!sourceId){
  const input=zoteroSource(item.data);
  // Reuse exact stored metadata, including after DOCX reopen.
  let offset=0; const key=JSON.stringify(input);
  while(true){const page=await doc.citations.sources.list({offset,limit:100});const match=page.items.find(s=>JSON.stringify({type:s.type,fields:s.fields})===key);if(match){sourceId=match.sourceId;break;}offset+=page.items.length;if(!page.items.length||offset>=page.total)break;}
  if(!sourceId){const result=await doc.citations.sources.insert(input);ensureSuccess(result);sourceId=result.source.sourceId;}
 }
 const receipt=await doc.citations.insert({at:target,sourceIds:[sourceId]});ensureSuccess(receipt);return receipt;
}
export async function updateBibliography(doc) {
 const found=await doc.find({select:{type:'node',nodeType:'bibliography'},limit:100});
 if(found.items.length){for(const item of found.items)ensureSuccess(await doc.citations.bibliography.rebuild({target:item.address}));}
 else ensureSuccess(await doc.citations.bibliography.insert({at:{kind:'documentEnd'}}));
}
