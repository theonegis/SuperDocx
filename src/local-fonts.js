import JSZip from 'jszip';
import {fontCategory} from './font-category';
// Resolve Chinese Word names before SuperDoc first measures the document.
// local() reads installed fonts only; no font files are downloaded or exported.
const groups=[{aliases:['宋体','SimSun'],candidates:[
 {family:'SimSun',regular:['SimSun','宋体','SimSun Regular'],bold:['SimSun Bold'],faithful:true},
 {family:'Songti SC',regular:['Songti SC Regular','STSong'],bold:['Songti SC Bold'],faithful:false},
 {family:'Noto Serif CJK SC',regular:['Noto Serif CJK SC Regular','NotoSerifCJKsc-Regular'],bold:['Noto Serif CJK SC Bold','NotoSerifCJKsc-Bold'],faithful:false},
 {family:'Source Han Serif SC',regular:['Source Han Serif SC Regular','SourceHanSerifSC-Regular'],bold:['Source Han Serif SC Bold','SourceHanSerifSC-Bold'],faithful:false},
 {family:'AR PL SungtiL GB',regular:['AR PL SungtiL GB'],bold:[],faithful:false},
 ]},{aliases:['黑体','SimHei'],candidates:[
 {family:'SimHei',regular:['SimHei','黑体'],bold:[],faithful:true},
 {family:'Heiti SC',regular:['Heiti SC Medium','STHeitiSC-Medium','Heiti SC Light','STHeitiSC-Light'],bold:[],faithful:false},
 {family:'PingFang SC',regular:['PingFang SC Regular','PingFangSC-Regular'],bold:['PingFang SC Semibold','PingFangSC-Semibold'],faithful:false},
 {family:'Noto Sans CJK SC',regular:['Noto Sans CJK SC Regular','NotoSansCJKsc-Regular'],bold:['Noto Sans CJK SC Bold','NotoSansCJKsc-Bold'],faithful:false},
 {family:'Source Han Sans SC',regular:['Source Han Sans SC Regular','SourceHanSansSC-Regular'],bold:['Source Han Sans SC Bold','SourceHanSansSC-Bold'],faithful:false},
 ]},{aliases:['楷体','KaiTi'],candidates:[
 {family:'KaiTi',regular:['KaiTi','楷体'],bold:[],faithful:true},
 {family:'KaiTi_GB2312',regular:['KaiTi_GB2312','楷体_GB2312'],bold:[],faithful:false},
 {family:'Kaiti SC',regular:['Kaiti SC Regular','STKaiti'],bold:['Kaiti SC Bold'],faithful:false},
 {family:'AR PL KaitiM GB',regular:['AR PL KaitiM GB'],bold:[],faithful:false},
 ]}];
groups.push({aliases:['楷体_GB2312','KaiTi_GB2312'],candidates:[{...groups[2].candidates[1],faithful:true},{...groups[2].candidates[0],faithful:false},...groups[2].candidates.slice(2)]});
const fangSong={family:'FangSong',regular:['FangSong','仿宋','FangSong Regular'],bold:[],faithful:true};
const fangSongLegacy={family:'FangSong_GB2312',regular:['FangSong_GB2312','仿宋_GB2312'],bold:[],faithful:true};
groups.push(
 {aliases:['仿宋','FangSong'],candidates:[fangSong,{...fangSongLegacy,faithful:false}]},
 {aliases:['仿宋_GB2312','FangSong_GB2312'],candidates:[fangSongLegacy,{...fangSong,faithful:false}]},
 {aliases:['微软雅黑','Microsoft YaHei'],candidates:[
  {family:'Microsoft YaHei',regular:['Microsoft YaHei','微软雅黑','Microsoft YaHei Regular'],bold:['Microsoft YaHei Bold'],faithful:true},
  ...groups[1].candidates.filter(candidate=>['Noto Sans CJK SC','Source Han Sans SC','PingFang SC'].includes(candidate.family)),
 ]},
);
async function face(family,names,weight=400){
 if(!names.length)return null;
 const source=names.map(name=>`local(${JSON.stringify(name)})`).join(',');
 try{return await new FontFace(family,source,{weight:String(weight),style:'normal'}).load()}catch{return null}
}
const genericNames={
 serif:['Noto Serif CJK SC Regular','Source Han Serif SC Regular','Songti SC Regular','Times New Roman','Noto Serif','Liberation Serif','DejaVu Serif','Times'],
 'sans-serif':['Noto Sans CJK SC Regular','Source Han Sans SC Regular','PingFang SC Regular','Microsoft YaHei','Arial','Noto Sans','Liberation Sans','DejaVu Sans','Helvetica'],
 monospace:['Consolas','Menlo Regular','Menlo','Courier New','Noto Sans Mono','Liberation Mono','DejaVu Sans Mono','Monaco'],
};
const categoryCandidates=category=>(genericNames[category]||[]).map(family=>({family,regular:[family],bold:[],faithful:false}));
async function prepare({aliases,candidates}){
 if(typeof FontFace==='undefined')return null;
 for(const candidate of candidates){
  const regular=await face(aliases[0],candidate.regular);if(!regular)continue;
  document.fonts.add(regular);
  for(const family of aliases){
   if(family!==aliases[0]){const normal=await face(family,candidate.regular);if(normal)document.fonts.add(normal);}
   const bold=await face(family,candidate.bold,700);if(bold)document.fonts.add(bold);
  }
  return {aliases,...candidate};
 }
 return null;
}
export const localFonts=(await Promise.all(groups.map(group=>prepare({...group,candidates:[...group.candidates,...categoryCandidates(fontCategory({name:group.aliases[0]}))]})))).filter(Boolean);

export let documentFontIssues=[];
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
export async function prepareDocumentFonts(file){
 documentFontIssues=[];
 // Font metadata is read only; original package bytes always go to SuperDoc.
 const blob=typeof file==='string'?await (await fetch(file)).blob():file;
 if(!blob)return;
 const zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const entry=zip.file('word/fontTable.xml');if(!entry)return;
 const xml=new DOMParser().parseFromString(await entry.async('string'),'application/xml');
 for(const font of [...xml.getElementsByTagNameNS(W,'font')]){
  const name=font.getAttributeNS(W,'name');if(!name)continue;
  const known=localFonts.find(f=>f.aliases.some(a=>a.toLowerCase()===name.toLowerCase()));
  if(known){if(!known.faithful)documentFontIssues.push({name,replacement:known.family});continue;}
  const installed=await face(name,[name,name+' Regular']);
  if(installed)continue;
  const val=tag=>font.getElementsByTagNameNS(W,tag)[0]?.getAttributeNS(W,'val')||'';
  const category=fontCategory({name,family:val('family'),pitch:val('pitch'),panose:val('panose1')});
  const fallback=await prepare({aliases:[name],candidates:categoryCandidates(category)});
  if(fallback)localFonts.push(fallback);
  documentFontIssues.push({name,replacement:fallback?.family,category});
 }
}
