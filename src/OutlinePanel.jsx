import React,{useEffect,useState} from 'react';
import {X,ListTree} from 'lucide-react';
import {t} from './i18n';
export function OutlinePanel({editor,ready,close}){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[active,setActive]=useState(null);
 useEffect(()=>{
  const instance=editor.current;if(!instance||!ready){setItems([]);setLoading(true);return;}
  let disposed=false,timer,sequence=0;
  const read=async()=>{const id=++sequence;try{const info=await instance.activeEditor.doc.info({});if(!disposed&&id===sequence){setItems(info.outline||[]);setLoading(false);setError('');}}catch{if(!disposed&&id===sequence){setError(t('无法读取文档大纲'));setLoading(false);}}};
  const schedule=()=>{++sequence;clearTimeout(timer);timer=setTimeout(read,350);};read();instance.on('editor-update',schedule);
  return()=>{disposed=true;clearTimeout(timer);instance.off('editor-update',schedule)};
 },[editor,ready]);
 async function navigate(item){try{const result=await editor.current.ui.viewport.scrollIntoView({target:{kind:'text',blockId:item.nodeId,range:{start:0,end:0}},block:'start',behavior:'instant'});if(result.success){setActive(item.nodeId);setError('')}else setError(t('无法定位此标题，请重试'));}catch{setError(t('无法定位此标题，请重试'));}}
 return <aside id="document-outline" className="outline-panel" aria-label={t('文档大纲')}><div className="outline-heading"><strong><ListTree size={16}/>{t('文档大纲')}</strong><button className="zoom-button" aria-label={t('关闭大纲')} onClick={close}><X size={16}/></button></div>{error&&<p role="alert">{error}</p>}<nav aria-label={t('标题导航')}>{items.map(item=><button key={item.nodeId} className="outline-item" style={{'--heading-level':Math.max(0,Math.min(8,item.level-1))}} aria-current={active===item.nodeId?'location':undefined} onClick={()=>navigate(item)} title={item.text}>{item.text||t('无标题')}</button>)}</nav>{!items.length&&!error&&<p>{t(loading?'正在读取大纲…':'暂无标题。在正文应用标题样式后，将显示在这里。')}</p>}</aside>;
}
