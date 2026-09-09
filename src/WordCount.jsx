import React,{useEffect,useState} from 'react';
import {FileText} from 'lucide-react';
import {t} from './i18n';
const segmenter=new Intl.Segmenter('en',{granularity:'word'});
export function countWords(text){
 const chinese=text.match(/\p{Script=Han}/gu)?.length||0;
 const rest=text.replace(/\p{Script=Han}/gu,' ');
 return chinese+[...segmenter.segment(rest)].filter(part=>part.isWordLike).length;
}
export function WordCount({editor,ready}){
 const [count,setCount]=useState(null);
 const [selected,setSelected]=useState(null);
 useEffect(()=>{
  const instance=editor.current;
  setSelected(null);
  if(!instance||!ready)return;
  let disposed=false;
  const unsubscribe=instance.ui.selection.subscribe(({snapshot})=>{
   if(disposed)return;
   setSelected(snapshot.status==='ready'&&!snapshot.empty&&snapshot.target
    ?countWords(snapshot.quotedText):null);
  });
  return()=>{disposed=true;unsubscribe();};
 },[editor,ready]);
 useEffect(()=>{
  const instance=editor.current;if(!instance||!ready){setCount(null);return;}
  let disposed=false,timer,sequence=0;
  const read=async()=>{const id=++sequence;try{const text=await instance.activeEditor.doc.getText({});if(!disposed&&id===sequence)setCount(typeof text==='string'?countWords(text):null);}catch{if(!disposed&&id===sequence)setCount(null);}};
  const schedule=()=>{++sequence;clearTimeout(timer);timer=setTimeout(read,350);};
  read();instance.on('editor-update',schedule);
  return()=>{disposed=true;clearTimeout(timer);instance.off('editor-update',schedule);};
 },[editor,ready]);
 return <span className="word-count" title={t('正文统计：中文按字，英文和数字按词；不计空白和标点。')}><FileText size={14}/><span>{selected!==null&&`${selected.toLocaleString()} / `}{count===null?'—':count.toLocaleString()} {t('字')}</span></span>;
}
