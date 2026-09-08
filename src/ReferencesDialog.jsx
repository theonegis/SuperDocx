import React,{useEffect,useState} from 'react';
import {X,Search,ExternalLink,BookOpen,LogOut} from 'lucide-react';
import {t} from './i18n';
export function ReferencesDialog({doc,capture,insert,close}) {
 const [account,setAccount]=useState(null),[apiKey,setApiKey]=useState(''),[query,setQuery]=useState(''),[mode,setMode]=useState('document'),[items,setItems]=useState([]),[total,setTotal]=useState(0),[start,setStart]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState(null);
 const cloud=window.desktop?.zotero;
 async function run(fn){setBusy(true);setError('');try{await fn()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function load(source=mode,offset=0){setSelected(null);let result;if(source==='zotero')result=await cloud.search({query,start:offset});else {const all=[];let at=0;while(true){const page=await doc.citations.sources.list({offset:at,limit:100});all.push(...page.items);at+=page.items.length;if(!page.items.length||at>=page.total)break;}const matches=all.filter(x=>[x.fields.title,x.fields.year,...(x.fields.authors||[]).map(a=>a.last)].join(' ').toLowerCase().includes(query.toLowerCase()));result={items:matches.slice(offset,offset+25),total:matches.length};}setItems(result.items);setTotal(result.total);setStart(offset);}
 useEffect(()=>{run(async()=>{setAccount(await cloud?.status());await load('document')})},[]);
 useEffect(()=>{const fn=e=>{if(e.key==='Escape'&&!busy){e.stopPropagation();close()}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn)},[busy]);
 const labels=item=>item.fields||{title:item.data.title,year:item.data.date,authors:(item.data.creators||[]).filter(c=>c.creatorType==='author').map(c=>({last:c.lastName||c.name,first:c.firstName}))};
 return <div className="modal-backdrop"><div className="modal references-modal" role="dialog" aria-modal="true" aria-label={t('插入文献')}>
  <div className="modal-heading"><h2><BookOpen size={20}/>{t('插入文献')}</h2><button className="icon-button" aria-label={t('关闭')} disabled={busy} onClick={close}><X size={18}/></button></div>
  <div className="reference-sources">{['document','zotero'].map(id=><button key={id} className={'secondary-button '+(mode===id?'selected':'')} disabled={busy} onClick={()=>{setMode(id);setItems([]);setTotal(0);setSelected(null);if(id==='document'||account)run(()=>load(id));}}>{t(id==='document'?'本文档文献':'Zotero 云端文献库')}</button>)}</div>
  {mode==='zotero'&&!account ? <form className="zotero-connect" onSubmit={event=>{event.preventDefault();run(async()=>{setAccount(await cloud.connect(apiKey));setApiKey('');await load('zotero')})}}>
   <p>{t('登录 Zotero 网站，创建允许读取个人文献库的 API Key，然后粘贴到这里。无需安装 Zotero 客户端。')}</p>
   <button className="secondary-button" type="button" disabled={busy||!cloud} onClick={()=>run(()=>cloud.authorize())}><ExternalLink size={16}/>{t('登录 Zotero 并获取密钥')}</button>
   <label className="field-label">API Key<input autoFocus type="password" autoComplete="off" value={apiKey} onChange={e=>setApiKey(e.target.value)} disabled={busy} maxLength={64}/></label>
   <p>{t('密钥仅保留在本次应用会话中。我们只读取文献，不上传文档。')}</p>
   <button className="primary-button" disabled={busy||!apiKey.trim()||!cloud}>{t('连接账户')}</button>
  </form> : <>
   {mode==='zotero'&&account&&<div className="reference-account"><span>{account.username}</span><button className="secondary-button compact-button" disabled={busy} onClick={()=>run(async()=>{await cloud.disconnect();setAccount(null);setItems([]);setSelected(null)})}><LogOut size={14}/>{t('断开连接')}</button></div>}
   <form className="reference-search" onSubmit={e=>{e.preventDefault();run(()=>load())}}><input autoFocus aria-label={t('搜索文献')} placeholder={t('搜索标题、作者或年份')} value={query} maxLength={250} onChange={e=>setQuery(e.target.value)}/><button className="secondary-button" disabled={busy}><Search size={16}/>{t('搜索')}</button></form>
   <div className="reference-list" aria-label={t('文献列表')}>{items.map(item=>{const info=labels(item),id=item.sourceId||item.key;return <button key={id} className={'reference-item '+(selected===item?'selected':'')} disabled={busy} onClick={()=>setSelected(item)} aria-pressed={selected===item}><strong>{info.title||t('无标题')}</strong><span>{info.authors?.map(a=>[a.first,a.last].filter(Boolean).join(' ')).join(', ')}{info.year?' · '+info.year:''}</span></button>})}{!items.length&&<p>{t(busy?'正在读取文献…':'没有找到文献')}</p>}</div>
   <div className="reference-pagination"><span>{total} {t('条文献')}</span><button className="secondary-button compact-button" disabled={busy||!start} onClick={()=>run(()=>load(mode,start-25))}>{t('上一页')}</button><button className="secondary-button compact-button" disabled={busy||start+25>=total} onClick={()=>run(()=>load(mode,start+25))}>{t('下一页')}</button></div>
  </>}
  <p className="reference-note">{t('基础引用使用文献标题显示，随 DOCX 保存；暂不提供 APA、GB/T 7714 等引用样式。')}</p>
  {!capture?.target&&<p>{t('请关闭此窗口，在正文中放置光标后再插入。')}</p>}
  {error&&<p className="reference-error" role="alert">{t(error)}</p>}
  <div className="modal-actions"><button className="secondary-button" disabled={busy} onClick={close}>{t('取消')}</button><button className="primary-button" disabled={busy||!selected||!capture?.target} onClick={()=>run(()=>insert(selected))}>{t(busy?'处理中…':'插入引用')}</button></div>
 </div></div>
}
