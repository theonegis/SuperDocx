import React,{useEffect,useState} from 'react';
import {Type} from 'lucide-react';
import {localFonts,documentFontIssues} from './local-fonts';
import {t} from './i18n';
export function FontStatus({editor,ready,show}){
 const [issues,setIssues]=useState([]);
 useEffect(()=>{
  if(!ready||!editor.current){setIssues([]);return;}
  let disposed=false;
  const update=({report=[]}={})=>{
   if(disposed)return;
   const next=new Set(documentFontIssues.map(item=>item.replacement?`${item.name} → ${item.replacement}（${t('替代显示')}）`:`${item.name}（${t('未安装或不可用')}）`));
   for(const item of report){
    const family=item.logicalFamily?.split(',')[0].trim().replace(/^['"]|['"]$/g,'');
    if(!family)continue;
    const matched=localFonts.find(font=>font.aliases.some(alias=>alias.toLowerCase()===family.toLowerCase()));
    if(matched){
     if(!matched.faithful)next.add(`${family} → ${matched.family}（${t('替代显示')}）`);
    }else if(item.missing)next.add(`${family}（${t('未安装或不可用')}）`);
   }
   setIssues([...next]);
  };
  update();
  const unsubscribe=editor.current.fonts.onReport(update);
  return()=>{disposed=true;unsubscribe?.();};
 },[editor,ready]);
 if(!issues.length)return null;
 return <button className="font-status" onClick={()=>show(issues.join('\n')+'\n\n'+t('显示使用替代字体，DOCX 中的字体名称保持不变。要与原文档一致，请在系统中安装对应字体后重启应用。'))}><Type size={14}/>{t('字体替代')}</button>;
}
