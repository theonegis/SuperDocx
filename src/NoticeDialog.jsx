import React, {useEffect,useRef} from 'react';
import {Info,X} from 'lucide-react';
import {t} from './i18n';
export function NoticeDialog({message,close}) {
 const backdrop=useRef(null),confirm=useRef(null),closeRef=useRef(close);
 closeRef.current=close;
 useEffect(()=>{
  const previous=document.activeElement;
  const siblings=[...backdrop.current.parentElement.children].filter(node=>node!==backdrop.current);
  const states=siblings.map(node=>[node,node.inert]);
  siblings.forEach(node=>{node.inert=true});
  confirm.current.focus();
  const handler=event=>{
   if(event.isComposing||event.keyCode===229)return;
   if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeRef.current();}
   else if(event.key==='Tab'){
    const buttons=[...backdrop.current.querySelectorAll('button')];
    if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus();}
    else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}
    event.stopImmediatePropagation();
   }else if((event.metaKey||event.ctrlKey)&&['s','o','n'].includes(event.key.toLowerCase())){event.preventDefault();event.stopImmediatePropagation();}
  };
  window.addEventListener('keydown',handler,true);
  return()=>{window.removeEventListener('keydown',handler,true);states.forEach(([node,inert])=>{node.inert=inert});if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[]);
 return <div className="modal-backdrop notice-backdrop" ref={backdrop}><div className="modal notice-modal" role="alertdialog" aria-modal="true" aria-labelledby="notice-title" aria-describedby="notice-message"><div className="modal-heading"><h2 id="notice-title"><Info size={20}/>{t('提示')}</h2><button className="icon-button" aria-label={t('关闭提示')} onClick={close}><X size={18}/></button></div><p id="notice-message">{t(message)}</p><div className="modal-actions"><button ref={confirm} className="primary-button" onClick={close}>{t('知道了')}</button></div></div></div>;
}
