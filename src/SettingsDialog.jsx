import React from 'react';
import { X } from 'lucide-react';
import { t } from './i18n';
function dialogKeys(event, close, busy) {
  if (event.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    if (!busy) close();
  } else if (event.key === 'Tab') {
    const fields = [...event.currentTarget.querySelectorAll('button, input, select, textarea, [tabindex]')]
      .filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length);
    const first = fields[0], last = fields.at(-1);
    if (!first) {
      event.preventDefault();
      event.currentTarget.focus();
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
}
export function SettingsDialog({ language, setLanguage, author, setAuthor, busy, error, close, submit }) {
  return <div className="modal-backdrop"><form className="modal" role="dialog" aria-modal="true" aria-busy={busy} tabIndex={-1} aria-label={t('设置')} onKeyDown={event => dialogKeys(event, close, busy)} onSubmit={submit}>
    <div className="modal-heading"><h2>{t('设置')}</h2><button type="button" className="icon-button" aria-label={t('关闭设置')} disabled={busy} onClick={close}><X size={18}/></button></div>
    <label className="field-label">{t('界面语言')}<select autoFocus disabled={busy} aria-label={t('界面语言')} value={language} onChange={event => setLanguage(event.target.value)}><option value="zh">简体中文</option><option value="en">English</option></select></label>
    <label className="field-label">{t('批注与修订作者')}<input disabled={busy} aria-label={t('批注与修订作者')} maxLength={80} value={author} onChange={event => setAuthor(event.target.value)}/></label>
    <p>{t('设置保存在本机。应用设置会保留文档内容和未保存状态，并重新加载编辑器；撤销历史将重置。')}</p>
    {error && <p role="alert">{t(error)}</p>}
    <div className="modal-actions"><button type="button" className="secondary-button" disabled={busy} onClick={close}>{t('取消')}</button><button className="primary-button" disabled={busy}>{t('应用设置')}</button></div>
  </form></div>;
}
export function PageDialog({ sections, sectionIndex, setSectionIndex, paper, setPaper, orientation, setOrientation, busy, error, close, submit }) {
  return <div className="modal-backdrop"><form className="modal" role="dialog" aria-modal="true" aria-busy={busy} tabIndex={-1} aria-label={t('页面设置')} onKeyDown={event => dialogKeys(event, close, busy)} onSubmit={submit}>
    <div className="modal-heading"><h2>{t('页面设置')}</h2><button type="button" className="icon-button" aria-label={t('关闭页面设置')} disabled={busy} onClick={close}><X size={18}/></button></div>
    <label className="field-label">{t('应用到分节')}<select autoFocus disabled={busy} aria-label={t('应用到分节')} value={sectionIndex} onChange={event => setSectionIndex(Number(event.target.value))}>{sections.map((section, index) => <option key={section.address.sectionId} value={index}>{index + 1}</option>)}</select></label>
    <label className="field-label">{t('纸张')}<select disabled={busy} aria-label={t('纸张')} value={paper} onChange={event => setPaper(event.target.value)}><option value="current">{t('保持不变')}</option><option>A4</option><option>Letter</option></select></label>
    <label className="field-label">{t('方向')}<select disabled={busy} aria-label={t('方向')} value={orientation} onChange={event => setOrientation(event.target.value)}><option value="portrait">{t('纵向')}</option><option value="landscape">{t('横向')}</option></select></label>
    <p>{t('页边距可通过文档上方标尺调整。页面设置直接应用到所选分节。')}</p>
    {error && <p role="alert">{t(error)}</p>}
    <div className="modal-actions"><button type="button" className="secondary-button" disabled={busy} onClick={close}>{t('取消')}</button><button className="primary-button" disabled={busy}>{t('应用页面设置')}</button></div>
  </form></div>;
}
