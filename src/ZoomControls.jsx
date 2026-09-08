import React,{useEffect,useRef,useState} from 'react';
import {Minus,Plus} from 'lucide-react';
import {t} from './i18n';
const MIN=25,MAX=300;
const clamp=value=>Math.max(MIN,Math.min(MAX,Math.round(value)));
export function ZoomControls({editor,ready}) {
 const [zoom,setZoom]=useState(100);
 const current=useRef(100);
 const apply=value=>{const next=clamp(value);editor.current?.setZoom(next);};
 useEffect(()=>{
  const instance=editor.current;
  if(!instance||!ready)return;
  const sync=({zoom:value})=>{if(Number.isFinite(value)){current.current=value;setZoom(Math.round(value));}};
  sync({zoom:instance.getZoom()});instance.on('zoomChange',sync);
  const surface=document.querySelector('.document-scroll');
  let frame=0,pending=null;
  const wheel=event=>{
   if(!(event.ctrlKey||event.metaKey)||document.querySelector('.modal-backdrop'))return;
   event.preventDefault();event.stopImmediatePropagation();
   const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?surface.clientHeight:1);
   if(!Number.isFinite(delta)||delta===0)return;
   pending=Math.max(MIN,Math.min(MAX,(pending??current.current)*Math.exp(-Math.max(-100,Math.min(100,delta))*.005)));
   if(!frame)frame=requestAnimationFrame(()=>{frame=0;const value=pending;pending=null;instance.setZoom(clamp(value));});
  };
  // Chromium exposes trackpad pinch as ctrl+wheel. Capture it before the SDK
  // or browser zoom handler, and only inside the document scrolling surface.
  surface.addEventListener('wheel',wheel,{passive:false,capture:true});
  return()=>{instance.off('zoomChange',sync);surface.removeEventListener('wheel',wheel,true);if(frame)cancelAnimationFrame(frame);};
 },[editor,ready]);
 return <div className="status-zoom" role="group" aria-label={t('文档缩放')} title={t('Ctrl／⌘＋滚轮或触控板捏合缩放')}>
  <button className="zoom-button" aria-label={t('缩小文档')} disabled={!ready||zoom<=MIN} onClick={()=>apply(current.current-10)}><Minus size={15}/></button>
  <button className="zoom-value" aria-label={t('重置缩放至 100%')} title={t('重置缩放至 100%')} disabled={!ready} onClick={()=>apply(100)}><output aria-live="polite">{zoom}%</output></button>
  <button className="zoom-button" aria-label={t('放大文档')} disabled={!ready||zoom>=MAX} onClick={()=>apply(current.current+10)}><Plus size={15}/></button>
 </div>;
}
