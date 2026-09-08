import { getLanguage } from './i18n';
// Public configuration covers tooltips, search and context menus. This small
// 2.12 compatibility layer covers the remaining chrome accessibility labels.
// Never walk document text, comment bodies, user input values, or font names.
const ZH = {
  'Toolbar':'工具栏','Toolbar separator':'工具栏分隔符','Undo':'撤销','Redo':'重做',
  'Accept tracked changes':'接受所选修订','Reject tracked changes':'拒绝所选修订',
  'Zoom':'缩放','Font family':'字体','Font family options':'字体选项','Font size':'字号','Font size options':'字号选项',
  'Bold':'加粗','Italic':'斜体','Underline':'下划线','Strikethrough':'删除线','Color':'文字颜色','Highlight':'突出显示',
  'Link dropdown':'插入链接','Image':'插入本地图片','Table of contents':'目录','Table':'插入表格','Table actions':'表格操作',
  'Text align':'对齐','Bullet list':'项目符号','Bullet list options':'项目符号选项','Numbered list':'编号','Numbered list options':'编号选项',
  'Left indent':'减少缩进','Right indent':'增加缩进','Line height':'行距','Ruler':'标尺','Overflow items':'更多工具','Search':'查找与替换',
  'Measurement unit':'度量单位','Linked styles':'样式','Formatting marks':'格式标记','Copy formatting':'格式刷','Clear formatting':'清除格式',
  'Cut':'剪切','Copy':'复制','Paste':'粘贴','Insert link':'插入链接','Insert table':'插入表格','Insert footnote':'插入脚注',
  'Insert row above':'在上方插入行','Insert row below':'在下方插入行','Insert column left':'在左侧插入列','Insert column right':'在右侧插入列',
  'Delete row':'删除行','Delete column':'删除列','Delete table':'删除表格','Merge cells':'合并单元格','Split cell':'拆分单元格',
  'Insert page break':'插入分页符','Page break':'分页符','Insert section break':'插入分节符','Add comment':'添加批注',
  'Reply':'回复','Resolve':'解决','Resolve thread':'解决批注','Reopen':'重新打开','Reopen thread':'重新打开批注','Delete':'删除','Edit':'编辑',
  'Cancel':'取消','Save':'保存','Send':'发送','Post':'发布','Close':'关闭','More options':'更多选项','Delete comment':'删除批注','Edit comment':'编辑批注',
  'Write a reply...':'写下回复…','Reply or add others with @':'写下回复…','Write a comment...':'写下批注…',
  'Apply':'应用','Insert':'插入','Remove link':'移除链接','Edit link':'编辑链接','Open link':'打开链接','Text':'文字','URL':'网址',
  'Left':'左对齐','Center':'居中','Right':'右对齐','Justify':'两端对齐','Normal':'正文','No Spacing':'无间距',
};
export const sdkText = text => getLanguage() === 'zh' ? (ZH[text] || text) : text;
export const contextMenu = { menuProvider: (_context, sections) => sections.map(section => ({ ...section, items: section.items.map(item => ({ ...item, label: sdkText(item.label) })) })) };
export const searchStrings = () => getLanguage() === 'zh' ? {
  findPlaceholder:'查找',findAriaLabel:'查找',replacePlaceholder:'替换为',replaceAriaLabel:'替换为',noResults:'无匹配结果',
  previousMatchTitle:'上一处',previousMatchAriaLabel:'上一处',nextMatchTitle:'下一处',nextMatchAriaLabel:'下一处',closeTitle:'关闭查找',closeAriaLabel:'关闭查找',
  replace:'替换',replaceAll:'全部替换',toggleReplaceTitle:'查找与替换',toggleReplaceAriaLabel:'查找与替换',matchCase:'区分大小写',matchCaseAriaLabel:'区分大小写',
  ignoreDiacritics:'忽略重音',ignoreDiacriticsAriaLabel:'忽略重音',regex:'正则表达式',regexAriaLabel:'正则表达式',invalidPattern:'无效的正则表达式',
} : {};

export function localizeSdkChrome() {
  if (getLanguage() !== 'zh') return () => {};
  const attributes = '.superdoc-toolbar [aria-label], [data-sd-part="toolbar-item"], .sd-font-combobox [aria-label], .comments-dialog button, .comments-dialog textarea, .comments-dialog input, .sd-surface button, .sd-surface input';
  const labels = '.sd-tooltip-content, .comments-dialog button, .comments-dropdown__item, .toolbar-dropdown button, .sd-surface button, .sd-surface label';
  let queued = false;
  const scan = () => {
    queued = false;
    for (const el of document.querySelectorAll(attributes)) {
      for (const attribute of ['aria-label','title','placeholder']) {
        const value = el.getAttribute(attribute);
        if (value && ZH[value]) el.setAttribute(attribute, ZH[value]);
      }
    }
    for (const el of document.querySelectorAll(labels)) {
      // Only direct literal label nodes; no traversal into user-authored content.
      for (const node of el.childNodes) if (node.nodeType === Node.TEXT_NODE && ZH[node.textContent.trim()]) node.textContent = ZH[node.textContent.trim()];
    }
  };
  const observer = new MutationObserver(() => { if (!queued) { queued = true; queueMicrotask(scan); } });
  observer.observe(document.body, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder']});
  scan(); return () => observer.disconnect();
}
