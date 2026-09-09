import React,{useEffect,useRef,useState} from 'react';
import {Minus,Plus} from 'lucide-react';
import {t} from './i18n';
const MIN=25,MAX=300;
const clamp=value=>Math.max(MIN,Math.min(MAX,Math.round(value)));
export function ZoomControls({editor,ready}) {
 const [zoom,setZoom]=useState(100);
 const current=useRef(100);
 const apply=value=>{
  if(!ready||!editor.current||!Number.isFinite(value))return;
  const next=clamp(value);
  current.current=next;
  editor.current.setZoom(next);
 };
 useEffect(()=>{
  const instance=editor.current;
  if(!instance||!ready)return;
  const surface=document.querySelector('.document-scroll');
  const host=document.getElementById('document-editor');
  if(!surface||!host)return;
  let layoutFrame=0;
  let canvasWidth=-1,viewportWidth=-1,forceCenter=true;
  // Recenter the complete document/comment canvas after SDK layout has settled.
  // Auto margins center fitting pages; scrollLeft centers overflowing pages.
  const center=()=>{
   if(layoutFrame)cancelAnimationFrame(layoutFrame);
   layoutFrame=requestAnimationFrame(()=>{
    layoutFrame=0;
    const pages=[...host.querySelectorAll('.superdoc-page')];
    const width=Math.ceil(Math.max(0,...pages.map(page=>page.getBoundingClientRect().width)));
    if(width && host.style.getPropertyValue('--document-page-width')!==`${width}px`) host.style.setProperty('--document-page-width',`${width}px`);
    const canvas=host.getBoundingClientRect(),viewport=surface.getBoundingClientRect();
    const nextWidth=canvas.width,nextViewport=surface.clientWidth;
    if(forceCenter||nextWidth!==canvasWidth||nextViewport!==viewportWidth) surface.scrollLeft=Math.max(0,surface.scrollLeft+(canvas.left+canvas.right-viewport.left-viewport.right)/2);
    canvasWidth=nextWidth;viewportWidth=nextViewport;forceCenter=false;
   });
  };
  const sync=({zoom:value})=>{if(Number.isFinite(value)){current.current=value;setZoom(Math.round(value));forceCenter=true;center();}};
  sync({zoom:instance.getZoom()});instance.on('zoomChange',sync);
  let previousHostWidth=-1,previousSurfaceWidth=-1;
  const resize=new ResizeObserver(()=>{
   const hostWidth=host.getBoundingClientRect().width;
   const surfaceWidth=surface.clientWidth;
   if(hostWidth!==previousHostWidth||surfaceWidth!==previousSurfaceWidth){
    previousHostWidth=hostWidth;previousSurfaceWidth=surfaceWidth;center();
   }
  });
  resize.observe(host);resize.observe(surface);
  const mutations=new MutationObserver(records=>{
   if(records.some(record=>record.type==='childList'||record.target.matches?.('.superdoc-page,[data-v2-paint-wrapper]')))center();
  });
  mutations.observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});
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
  return()=>{instance.off('zoomChange',sync);surface.removeEventListener('wheel',wheel,true);resize.disconnect();mutations.disconnect();if(frame)cancelAnimationFrame(frame);if(layoutFrame)cancelAnimationFrame(layoutFrame);};
 },[editor,ready]);
 return <div className="status-zoom" role="group" aria-label={t('文档缩放')} title={t('Ctrl／⌘＋滚轮或触控板捏合缩放')}>
  <button className="zoom-button" aria-label={t('缩小文档')} disabled={!ready||zoom<=MIN} onClick={()=>apply(current.current-10)}><Minus size={15}/></button>
  <input className="zoom-slider" type="range" min={MIN} max={MAX} step={1} value={zoom} disabled={!ready} aria-label={t('文档缩放')} aria-valuetext={`${zoom}%`} onChange={event=>apply(Number(event.target.value))}/>
  <button className="zoom-value" aria-label={t('重置缩放至 100%')} title={t('重置缩放至 100%')} disabled={!ready} onClick={()=>apply(100)}><output aria-live="polite">{zoom}%</output></button>
  <button className="zoom-button" aria-label={t('放大文档')} disabled={!ready||zoom>=MAX} onClick={()=>apply(current.current+10)}><Plus size={15}/></button>
 </div>;
}
