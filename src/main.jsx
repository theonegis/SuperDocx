import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SuperDoc, DOCX } from 'superdoc';
import { FolderOpen, Save, Download, ShieldCheck, MessageSquarePlus, X, BookOpen, PenLine, ArrowUpRight, Check, Circle, FilePlus2, ListChecks, ChevronLeft, ChevronRight, CheckCheck, ListX, LibraryBig, LocateFixed, ListTree } from 'lucide-react';
import 'superdoc/style.css';
import './styles.css';
import './ribbon.css';
import { OutlinePanel } from './OutlinePanel';
import { prepareDocumentFonts } from './local-fonts';
import { FontStatus } from './FontStatus';
import { WordCount } from './WordCount';
import { ZoomControls } from './ZoomControls';
import { installHistoryShortcuts } from './history-shortcuts';
import { readSelectionFonts, changedFontPatch, applySelectionFonts, getTypingFonts, setTypingFonts, clearTypingFonts } from './font-settings';
import { NoticeDialog } from './NoticeDialog';
import { ReferencesDialog } from './ReferencesDialog';
import { insertSourceCitation, updateBibliography } from './citations';
import { FONT_OPTIONS, TOOLBAR, appToolbarItems, localImage, ensureSuccess } from './editor-features';
import { sessionHandoff } from './session';
import { contextMenu, searchStrings, localizeSdkChrome } from './sdk-locale';
import { SettingsDialog, PageDialog } from './SettingsDialog';
import { readPageSettings, pageSetupPatch } from './page-settings';
import { initialAuthor, systemDefaults } from './preferences';
import { t, getLanguage, setLanguage } from './i18n';

const desktop = window.desktop;
const MAX_BYTES = 50 * 1024 * 1024;

function App({ initialSource }) {
  const [language] = useState(getLanguage);
  const [settings, setSettings] = useState(false);
  const [chosenLanguage, setChosenLanguage] = useState(language);
  const [author] = useState(initialAuthor);
  const [chosenAuthor, setChosenAuthor] = useState(author);
  const [pageSetup, setPageSetup] = useState(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [paper, setPaper] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const editor = useRef(null);
  const readyRef = useRef(false);
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const busyRef = useRef(false);
  const postingRef = useRef(false);
  const decisionRef = useRef(false);
  const composingRef = useRef(false);
  const sourceRef = useRef(null);
  const fileInput = useRef(null);
  const [source, setSource] = useState(initialSource || { name: t("欢迎使用 SuperDocx.docx"), file: './welcome.docx', key: 0, demo: true });
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('editing');
  const [error, setError] = useState('');
  const [status, setStatus] = useState(t("正在打开文档…"));
  const [comment, setComment] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [fontDialog, setFontDialog] = useState(null);
  const [eastFont, setEastFont] = useState('');
  const [westFont, setWestFont] = useState('');
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [references, setReferences] = useState(null);
  const [tab, setTab] = useState('home');
  const [review, setReview] = useState({ items: [], total: 0 });
  const [operation, setOperation] = useState(false);
  sourceRef.current = source;

  const updateDirty = useCallback((value) => {
    setDirty(value);
    desktop?.setDirty(value).catch(() => setError(t("无法更新窗口保存状态，请先保存文档再关闭。")));
  }, []);
  const changed = useCallback(() => {
    if (!readyRef.current) return;
    revision.current += 1;
    updateDirty(true);
    setStatus(t("有未保存的修改"));
  }, [updateDirty]);

  useEffect(() => {
    let disposed = false;
    let stopReview;
    readyRef.current = false;
    setReady(false); setReview({ items: [], total: 0 }); setFontDialog(null);
    setError('');
    setStatus(t("正在打开文档…"));
    const fail = ({ error: cause } = {}) => {
      if (disposed) return;
      setError(`${t("文档处理失败：")}${cause?.message || String(cause || t("请检查文件是否损坏或加密。"))}`);
      setStatus(t("文档处理失败"));
    };
    try {
      editor.current = new SuperDoc({
        selector: '#document-editor', document: source.file, documentMode: mode,
        user: { name: author, email: 'local@superdocx.invalid' }, telemetry: { enabled: false }, measurementUnit: 'cm', handleImageUpload: localImage,
        viewing: { comments: true, trackedChanges: 'markup' },
        zoom: { mode: 'manual', initial: 100 },
        ui: {
          search: { strings: searchStrings() },
          toolbar: { ...TOOLBAR, strings: language === 'zh' ? TOOLBAR.strings : {}, customItems: appToolbarItems(actions) },
          loading: false,
          ruler: true, contextMenu, contentControls: true,
          comments: { layout: 'sidebar' },
        },
        onReady: () => {
          if (disposed) return;
          revision.current = 0;
          savedRevision.current = source.resumeDirty ? -1 : 0;
          stopReview = editor.current.ui.trackChanges.observe(setReview);
          readyRef.current = true;
          setReady(true);
          updateDirty(Boolean(source.resumeDirty));
          sessionHandoff('delete').catch(cause => setError(cause.message));
          setStatus(source.resumeDirty ? t("有未保存的修改") : source.demo ? t("示例文档 · 可自由编辑") : t("文档已打开"));
        },
        onEditorUpdate: changed,
        onCommentsUpdate: (event) => { if (event.type !== 'pending') changed(); },
        onContentError: fail, onException: fail,
      });
    } catch (cause) { fail({ error: cause }); }
    return () => { disposed = true; stopReview?.(); readyRef.current = false; clearTypingFonts(editor.current?.activeEditor); editor.current?.destroy(); editor.current = null; };
    // Document identity owns the editor lifetime. Mode changes use the runtime method below.
  }, [changed, updateDirty]);

  useEffect(() => localizeSdkChrome(), [language]);
  useEffect(() => { if (ready) editor.current?.setDocumentMode(mode); }, [mode, ready]);
  useEffect(() => { document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'; desktop?.setLanguage(language).catch(cause => setError(cause.message)); }, [language]);
  async function replaceSource(next) {
    const instance = editor.current;
    const wasReady = readyRef.current;
    const originalRevision = revision.current;
    const originalSavedRevision = savedRevision.current;
    let backup, replacing = false;
    busyRef.current = true; setBusy(true); readyRef.current = false; setReady(false);
    setStatus(t('正在打开文档…')); setError('');
    const surface = document.getElementById('document-editor');
    const wasInert = surface.inert;
    surface.inert = true;
    document.activeElement?.blur();
    try {
      const file = typeof next.file === 'string' ? await (await fetch(next.file)).blob() : next.file;
      await prepareDocumentFonts(file);
      backup = await instance.export({ exportType: ['docx'], triggerDownload: false, commentsType: 'external' });
      if (!(backup instanceof Blob)) throw new Error(t('编辑器未返回 DOCX 文件。'));
      await sessionHandoff('put', { ...sourceRef.current, file: backup, key: Date.now(), resumeDirty: originalRevision !== originalSavedRevision });
      clearTypingFonts(instance.activeEditor);
      replacing = true;
      await instance.replaceFile(file);
      await sessionHandoff('delete');
      // Commit the filename/save handle only after the new content is usable.
      sourceRef.current = next;
      setSource(next); setTab('home');
      revision.current = 0; savedRevision.current = next.resumeDirty ? -1 : 0;
      readyRef.current = true; setReady(true); updateDirty(Boolean(next.resumeDirty));
      setStatus(next.resumeDirty ? t('有未保存的修改') : t('文档已打开'));
    } catch (cause) {
      let recovered = !replacing;
      if (replacing && backup) {
        try { await instance.replaceFile(backup); recovered = true; await sessionHandoff('delete'); }
        catch (recoveryError) { setError(cause.message + '\n' + recoveryError.message); }
      }
      revision.current = originalRevision; savedRevision.current = originalSavedRevision;
      readyRef.current = recovered && wasReady; setReady(recovered && wasReady);
      updateDirty(originalRevision !== originalSavedRevision);
      if (recovered) setError(cause.message);
      setStatus(t(recovered ? '文档已打开' : '文档处理失败'));
    } finally {
      surface.inert = wasInert;
      busyRef.current = false; setBusy(false);
    }
  }
  async function applySettings(event) {
    event.preventDefault();
    if (busyRef.current) return;
    const nextAuthor = chosenAuthor.trim() || systemDefaults.username;
    if (chosenLanguage === language && nextAuthor === author) {
      setSettings(false);
      return;
    }
    busyRef.current = true; setBusy(true); setError('');
    try {
      const file = await editor.current.export({ exportType: ['docx'], triggerDownload: false, commentsType: 'external' });
      if (!(file instanceof Blob)) throw new Error(t("编辑器未返回 DOCX 文件。"));
      await sessionHandoff('put', { ...sourceRef.current, file, key: Date.now(), resumeDirty: dirty });
      localStorage.setItem('superdocx.author', nextAuthor);
      setLanguage(chosenLanguage);
      if (desktop) await desktop.reload(); else window.location.reload();
    } catch (cause) { setError(cause.message); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function beginPageSetup() {
    if (!readyRef.current || busyRef.current || mode !== 'editing') { setError(t('请切换到编辑模式后设置页面。')); return; }
    try {
      const result = await editor.current.activeEditor.doc.sections.list({ limit: 1000 });
      if (!result.items.length) throw new Error(t("无法读取文档分节。"));
      const initial = readPageSettings(result.items[0]);
      setSectionIndex(0); setPaper(initial.paper); setOrientation(initial.orientation);
      setPageSetup(result.items); setError('');
    } catch (cause) { setError(cause.message); }
  }
  function choosePageSection(index) {
    const initial = readPageSettings(pageSetup[index]);
    setSectionIndex(index); setPaper(initial.paper); setOrientation(initial.orientation);
  }
  async function applyPageSetup(event) {
    event.preventDefault();
    if (postingRef.current) return;
    postingRef.current = true; setOperation(true);
    try {
      const patch = pageSetupPatch(pageSetup[sectionIndex], paper, orientation);
      if (patch) {
        ensureSuccess(await editor.current.activeEditor.doc.sections.setPageSetup({ target: pageSetup[sectionIndex].address, ...patch }));
        changed();
      }
      setPageSetup(null);
    } catch (cause) { setError(cause.message); }
    finally { postingRef.current = false; setOperation(false); }
  }
  async function newDocument() {
    if (busyRef.current || !(await discardAllowed())) return;
    replaceSource({ name: t("未命名.docx"), file: './blank.docx', key: Date.now(), demo: false });
  }
  const canonicalizeFontName = (value) => {
    const raw = String(value || '').trim().replace(/^['"]|['"]$/g, '');
    if (!raw) return '';
    const labelMatch = FONT_OPTIONS.find(item => item.label === raw);
    if (labelMatch) return labelMatch.value;
    const valueMatch = FONT_OPTIONS.find(item => item.value.toLowerCase() === raw.toLowerCase());
    if (valueMatch) return valueMatch.value;
    return raw;
  };
  async function beginFonts() {
    if (!readyRef.current || busyRef.current || mode === 'viewing') return;
    try {
      const instance = editor.current;
      const active = instance.activeEditor;
      const capture = await active.doc.selection.current({ includeText: true });
      if (!capture.selectionTarget) throw new Error(language === 'en' ? 'Place the cursor in the document first.' : '请先在文档中放置光标或选择文字。');

      if (instance !== editor.current || active !== instance.activeEditor) return;
      const initial = await readSelectionFonts(instance, capture);
      if (instance !== editor.current || active !== instance.activeEditor) return;
      const pending = capture.empty ? getTypingFonts(active) : {};
      if (pending.eastAsia) initial.east = { value: pending.eastAsia, mixed: false };
      if (pending.ascii) initial.west = { value: pending.ascii, mixed: false };
      initial.east.value = canonicalizeFontName(initial.east.value);
      initial.west.value = canonicalizeFontName(initial.west.value);
      setEastFont(initial.east.value); setWestFont(initial.west.value);
      setError(''); setFontDialog({ ...capture, initial, active });
    } catch (cause) { setError(cause.message); }
  }
  async function applyFonts(event) {
    event.preventDefault();
    if (postingRef.current || mode === 'viewing') return;
    const value = changedFontPatch(fontDialog.initial, canonicalizeFontName(eastFont), canonicalizeFontName(westFont));
    if (!Object.keys(value).length) { setFontDialog(null); return; }
    postingRef.current = true; setOperation(true);
    try {
      if (editor.current.activeEditor !== fontDialog.active) throw new Error(language === 'en' ? 'The document changed. Reopen font settings.' : '文档已切换，请重新打开字体设置。');
      ensureSuccess(await fontDialog.active.authoring.setSelectionTarget({ target: fontDialog.selectionTarget, focus: true }));
      if (fontDialog.empty) await setTypingFonts(editor.current, value, setError, mode === 'suggesting' ? 'tracked' : 'direct');
      else await applySelectionFonts(fontDialog.active, fontDialog.initial, value, mode === 'suggesting' ? 'tracked' : 'direct');
      if (!fontDialog.empty) changed();
      setFontDialog(null);
    } catch (cause) { setError(cause.message); }
    finally { postingRef.current = false; setOperation(false); }
  }
  async function reviewAction(action, id) {
    if (postingRef.current || mode === 'viewing') return;
    postingRef.current = true; setOperation(true); setError('');
    try { ensureSuccess(await editor.current.ui.trackChanges[action](id)); changed(); }
    catch (cause) { setError(cause.message); }
    finally { postingRef.current = false; setOperation(false); }
  }
  useEffect(() => { document.title = `${dirty ? '● ' : ''}${source.name} — SuperDocx`; }, [dirty, source.name]);

  async function discardAllowed() {
    if (busyRef.current || postingRef.current || operation || decisionRef.current || composingRef.current) return false;
    if (revision.current === savedRevision.current) return true;
    decisionRef.current = true;
    try {
      if (!desktop) return window.confirm(t("文档有未保存的修改。继续将丢弃修改，是否继续？"));
      const choice = await desktop.confirmDiscard();
      if (choice === 'discard') return true;
      if (choice !== 'save') return false;
      return await saveDocument() && revision.current === savedRevision.current;
    } finally { decisionRef.current = false; }
  }
  async function loadBrowserFile(file) {
    if (!file) return;
    try {
      if (!/\.docx$/i.test(file.name)) throw new Error(t("仅支持 .docx。旧版 .doc 请先用 Word 或 LibreOffice 转换。"));
      if (!file.size || file.size > MAX_BYTES) throw new Error(t("请选择非空且小于 50 MB 的 DOCX 文件。"));
      if (!(await discardAllowed())) return;
      replaceSource({ name: file.name, file, key: Date.now(), demo: false });
    } catch (cause) { setError(cause.message); }
  }
  async function openDocument() {
    if (busyRef.current) return;
    if (!desktop) { fileInput.current.click(); return; }
    let replacing = false;
    try {
      if (!(await discardAllowed())) return;
      busyRef.current = true; setBusy(true);
      const result = await desktop.open();
      if (!result) return;
      replacing = true;
      replaceSource({ id: result.id, name: result.name, file: new File([result.bytes], result.name, { type: DOCX }), key: Date.now(), demo: false });
    } catch (cause) { setError(cause.message); }
    finally { if (!replacing) { busyRef.current = false; setBusy(false); } }
  }
  async function saveDocument(saveAs = false) {
    if (!readyRef.current || busyRef.current || postingRef.current || operation || composingRef.current) return false;
    busyRef.current = true; setBusy(true); setError(''); setStatus(t("正在保存…"));
    const savingRevision = revision.current;
    const current = sourceRef.current;
    try {
      const blob = await editor.current.export({ exportType: ['docx'], triggerDownload: false, commentsType: 'external' });
      if (!(blob instanceof Blob)) throw new Error(t("编辑器未返回 DOCX 文件。"));
      if (desktop) {
        const result = await desktop.save({ id: current.id, name: current.name, saveAs: saveAs || current.demo, bytes: new Uint8Array(await blob.arrayBuffer()) });
        if (!result) { setStatus(revision.current !== savedRevision.current ? t("有未保存的修改") : t("已取消保存")); return false; }
        setSource((previous) => ({ ...previous, ...result, demo: false }));
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = current.name; anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
      savedRevision.current = savingRevision;
      const stillDirty = revision.current !== savingRevision;
      updateDirty(stillDirty);
      setStatus(stillDirty ? t("已保存先前版本 · 有新的修改") : desktop ? t("已保存到本地") : t("已导出 DOCX"));
      return true;
    } catch (cause) { setError(cause.message); setStatus(t("保存失败 · 修改仍保留在编辑器中")); return false; }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function beginComment() {
    try {
      const instance = editor.current;
      if (!readyRef.current || mode === 'viewing') return;
      // Worker-backed engines can expose a stale passive UI snapshot after typing.
      // Read the public Document API before opening the composer.
      const capture = await instance.activeEditor.doc.selection.current({ includeText: true });
      if (instance !== editor.current) return;
      if (capture.empty || (!capture.target && !capture.selectionTarget)) {
        setError(t("请先选中需要批注的文字，再点击“添加批注”。")); return;
      }
      setError(''); setComment(capture); setCommentText('');
    } catch (cause) { setError(`${t("无法读取文字选区：")}${cause.message}`); }
  }
  async function postComment(event) {
    event.preventDefault();
    if (!commentText.trim() || postingRef.current) return;
    postingRef.current = true; setPosting(true);
    try {
      const receipt = await editor.current.ui.comments.createFromCapture(comment, { text: commentText.trim() });
      if (!receipt.success) throw new Error(receipt.failure?.message || t("无法添加批注，请重新选择文字。"));
      changed(); setComment(null); setCommentText('');
    } catch (cause) { setError(cause.message); }
    finally { postingRef.current = false; setPosting(false); }
  }
  async function beginReferences() {
    if (!readyRef.current || busyRef.current || mode === 'viewing') return;
    try {
      const active = editor.current.activeEditor;
      const capture = await active.doc.selection.current({includeText:true});
      if (active === editor.current.activeEditor) setReferences({ capture, active });
    }
    catch(cause) { setError(cause.message); }
  }
  async function insertReference(item) {
    if (postingRef.current || busyRef.current || mode === 'viewing') return;
    postingRef.current = true; setOperation(true);
    try {
      if (references.active !== editor.current.activeEditor) throw new Error(language === 'en' ? 'The document changed. Reopen the references dialog.' : '文档已切换，请重新打开引用窗口。');
      await insertSourceCitation(references.active.doc,references.capture.target,item,changed);
      setReferences(null);
    } finally { postingRef.current = false; setOperation(false); }
  }
  async function bibliography() {
    if (!readyRef.current || busyRef.current || mode === 'viewing' || operation || postingRef.current) return;
    postingRef.current = true; setOperation(true);
    try { await updateBibliography(editor.current.activeEditor.doc,changed); }
    catch(cause) { setError(cause.message); }
    finally { postingRef.current = false; setOperation(false); }
  }
  const actions = useRef({}); actions.current = { openDocument, saveDocument, beginComment, newDocument, beginFonts, beginPageSetup, openSettings: () => { if (!readyRef.current || busyRef.current) return; setChosenLanguage(language); setChosenAuthor(author); setSettings(true); } };
  actions.current.discardAllowed = discardAllowed;
  useEffect(() => desktop?.onCloseRequest?.(async token => {
    let approved = false;
    try {
      if (!document.querySelector('.modal-backdrop')) approved = await actions.current.discardAllowed();
    } catch (cause) { setError(cause.message); }
    finally { await desktop.finishClose(token, approved); }
  }), []);
  useEffect(() => installHistoryShortcuts({ desktop, execute: async command => {
    if (!readyRef.current || busyRef.current || postingRef.current || operation) return;
    try { clearTypingFonts(editor.current.activeEditor); await editor.current.ui.commands.executeAsync(command); }
    catch (cause) { setError(cause.message); }
  } }), [operation]);
  useEffect(() => {
    const handler = (event) => {
      if (event.isComposing || event.keyCode === 229 || composingRef.current) return;
      if (event.key === 'Escape' && !postingRef.current && !busyRef.current) { setComment(null); setFontDialog(null); setSettings(false); setPageSetup(null); }
      const modal = document.querySelector('.modal-backdrop');
      if (modal && event.key === 'Tab') {
        const items = [...modal.querySelectorAll('button:not(:disabled), input, select, textarea')];
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
      if (!(event.metaKey || event.ctrlKey)) return;
      if (document.querySelector('.modal-backdrop')) { if (['s', 'o', 'n'].includes(event.key.toLowerCase())) event.preventDefault(); return; }
      const key = event.key.toLowerCase();
      if (key === 's') { event.preventDefault(); actions.current.saveDocument(event.shiftKey); }
      if (key === 'n') { event.preventDefault(); actions.current.newDocument(); }
      if (key === 'o') { event.preventDefault(); actions.current.openDocument(); }
    };
    const unload = (event) => { if (dirty && !desktop) { event.preventDefault(); event.returnValue = ''; } };
    const startComposition = () => { composingRef.current = true; };
    const endComposition = () => { composingRef.current = false; };
    window.addEventListener('compositionstart', startComposition, true);
    window.addEventListener('compositionend', endComposition, true);
    window.addEventListener('keydown', handler); window.addEventListener('beforeunload', unload);
    return () => { window.removeEventListener('compositionstart', startComposition, true); window.removeEventListener('compositionend', endComposition, true); window.removeEventListener('keydown', handler); window.removeEventListener('beforeunload', unload); };
  }, [dirty]);

  return <div className="app">
    <main className="workspace">
      <section className="editor-card" aria-label={t("文档工作台")}>
        <div className="file-bar">
          <button className="secondary-button" title={t("新建空白文档 · ⌘/Ctrl N")} aria-label={t("新建空白文档")} onClick={newDocument} disabled={busy}><FilePlus2 size={17}/>{t("新建")}</button>
          <button className="primary-button" onClick={openDocument} disabled={busy}><FolderOpen size={18}/>{t("打开文档")}</button>
          <input ref={fileInput} type="file" accept=".docx" hidden onChange={(event) => { loadBrowserFile(event.target.files?.[0]); event.target.value = ''; }}/>
          <div className="file-info"><div className="filename" title={source.name}>{source.name}{dirty && <span className="unsaved-dot" title={t("有未保存的修改")}/>}</div><div className="file-detail">{source.demo ? t("内置示例") : t("WORD 文档")}<span>·</span>DOCX</div></div>
          <div className="file-actions">
            <button className="secondary-button save-button" disabled={!ready || busy || operation || posting} onClick={() => saveDocument()}><Save size={17}/>{busy ? t("处理中…") : t("保存")}</button>
            <button className="secondary-button" title={t("另存为 · ⌘/Ctrl Shift S")} aria-label={t("另存为")} disabled={!ready || busy || operation || posting} onClick={() => saveDocument(true)}><Download size={17}/>{t("另存为")}</button>
          </div>
        </div>
        <div className="editor-shell" aria-busy={!ready}>
          <div className="ribbon-tabs" role="tablist" aria-label={t("功能区")}>
            {Object.entries({home:'开始',insert:'插入',page:'页面',references:'引用',review:'审阅',view:'视图'}).map(([id,label],index) => <button key={id} id={'tab-'+id} role="tab" aria-selected={tab===id} aria-controls="ribbon-tools" tabIndex={tab===id?0:-1} onPointerDown={event=>event.preventDefault()} onClick={()=>setTab(id)} onKeyDown={event=>{ const tabs=['home','insert','page','references','review','view']; const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null; if(next!==null){event.preventDefault();setTab(tabs[next]);document.getElementById('tab-'+tabs[next])?.focus();}}}>{language==='en' && id==='insert'?'Insert':t(label)}</button>)}
          </div>
          <div id="ribbon-tools" className="ribbon-tools" data-tab={tab} role="tabpanel" aria-labelledby={'tab-'+tab}>
            <div id="document-toolbar"/>
            {tab==='references' && <div className="ribbon-extra"><button className="secondary-button" disabled={!ready||busy||mode==='viewing'} onPointerDown={e=>e.preventDefault()} onClick={beginReferences}><BookOpen size={17}/>{t('插入文献')}</button><button className="secondary-button" disabled={!ready||busy||operation||mode==='viewing'} onClick={bibliography}><LibraryBig size={17}/>{t('插入或更新参考文献表')}</button></div>}
            {tab==='review' && <div className="review-panel ribbon-extra">
            <div className="mode-switch" aria-label={t("文档模式")}><button className={mode === 'viewing' ? 'selected' : ''} disabled={!ready || busy} onClick={() => setMode('viewing')}><BookOpen size={15}/>{t("查看")}</button><button className={mode === 'editing' ? 'selected' : ''} disabled={!ready || busy} onClick={() => setMode('editing')}><PenLine size={15}/>{t("编辑")}</button><button className={mode === 'suggesting' ? 'selected' : ''} disabled={!ready || busy} onClick={() => setMode('suggesting')}><ListChecks size={15}/>{t("修订")}</button></div>
            <button className="secondary-button" disabled={!ready || busy || mode === 'viewing'} onPointerDown={(event) => { event.preventDefault(); beginComment(); }} onClick={(event) => { if (event.detail === 0) beginComment(); }}><MessageSquarePlus size={17}/>{t("添加批注")}</button>
<div className="review-heading"><strong>{review.total}{t(" 处修订")}</strong><button className="secondary-button compact-button" disabled={!review.total} onClick={() => editor.current.ui.trackChanges.navigatePrevious()}><ChevronLeft size={16}/>{t("上一处")}</button><button className="secondary-button compact-button" disabled={!review.total} onClick={() => editor.current.ui.trackChanges.navigateNext()}><ChevronRight size={16}/>{t("下一处")}</button><button className="secondary-button compact-button" disabled={!review.total || operation || mode === 'viewing'} onClick={() => reviewAction('acceptAllAsync')}><CheckCheck size={16}/>{t("全部接受")}</button><button className="secondary-button compact-button" disabled={!review.total || operation || mode === 'viewing'} onClick={() => reviewAction('rejectAllAsync')}><ListX size={16}/>{t("全部拒绝")}</button></div>
            <label className="review-picker-field"><LocateFixed size={16}/><select className="review-picker" aria-label={t("定位修订")} value="" disabled={!review.total} onChange={event=>editor.current.ui.trackChanges.scrollTo(event.target.value)}><option value="">{t("定位修订")}</option>{review.items.map(item=><option key={item.id} value={item.id}>{item.author || t("未知作者")} · {item.insertedText || item.deletedText || item.formattingDeltaSummary || t('点击定位修订')}</option>)}</select></label>
            </div>}
          </div><div className="document-stage">{outlineOpen && <OutlinePanel editor={editor} ready={ready} close={()=>setOutlineOpen(false)}/>}<div className="document-scroll">{!ready && <div className="loading-overlay"><span className="loading-spinner"/>{t("正在打开文档…")}</div>}<div id="document-editor"/></div></div></div>
        <footer className="status-bar"><div className="status-left"><button className="zoom-button outline-toggle" aria-label={t("文档大纲")} title={t("文档大纲")} aria-expanded={outlineOpen} aria-controls="document-outline" onClick={()=>setOutlineOpen(value=>!value)}><ListTree size={16}/></button><WordCount editor={editor} ready={ready}/><span role="status">{dirty ? <Circle size={9} fill="currentColor"/> : <Check size={14}/>} {t(status)}</span></div><div className="status-right"><FontStatus editor={editor} ready={ready} show={setError}/><span className="local-status"><ShieldCheck size={14}/> {desktop ? t("本地文档") : t("本地浏览器处理")}</span><ZoomControls editor={editor} ready={ready && !busy}/></div></footer>
      </section>
    </main>
    {comment && <div className="modal-backdrop"><form className="modal" role="dialog" aria-modal="true" aria-label={t("添加批注")} onSubmit={postComment}><div className="modal-heading"><h2>{t("添加批注")}</h2><button type="button" className="icon-button" aria-label={t("取消批注")} disabled={posting} onClick={() => setComment(null)}><X size={18}/></button></div><p>{t("批注将关联到所选文字，并随文档保存。")}</p><textarea aria-label={t("批注内容")} autoFocus value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder={t("写下你的想法…")} rows={5}/><div className="modal-actions"><button type="button" className="secondary-button" disabled={posting} onClick={() => setComment(null)}>{t("取消")}</button><button className="primary-button" disabled={!commentText.trim() || posting}>{t("添加批注")}<ArrowUpRight size={16}/></button></div></form></div>}

    {fontDialog && <div className="modal-backdrop"><form className="modal" role="dialog" aria-modal="true" aria-label={t("字体设置")} onSubmit={applyFonts}>
      <div className="modal-heading"><h2>{t("字体设置")}</h2><button type="button" className="icon-button" aria-label={t("关闭字体设置")} disabled={operation} onClick={() => setFontDialog(null)}><X size={18}/></button></div>
      <p className="selection-preview">{fontDialog.empty ? (language === 'en' ? 'Applies to text typed at the cursor.' : '应用于光标处接下来输入的文字。') : t('所选文字：') + (fontDialog.text || '').slice(0, 100)}</p>
      <label className="field-label">{t('中文字体')}<input autoFocus aria-label={t('中文字体')} list="font-options" maxLength={100} placeholder={fontDialog.initial.east.mixed ? (language === 'en' ? 'Mixed fonts' : '多种字体') : t('保持不变')} value={eastFont} onChange={event => setEastFont(event.target.value)}/></label>
      <label className="field-label">{t('西文字体')}<input aria-label={t('西文字体')} list="font-options" maxLength={100} placeholder={fontDialog.initial.west.mixed ? (language === 'en' ? 'Mixed fonts' : '多种字体') : t('保持不变')} value={westFont} onChange={event => setWestFont(event.target.value)}/></label>
      <datalist id="font-options">{FONT_OPTIONS.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}</datalist>
      <p>{t('留空保持原设置。字体名称随 DOCX 保存；本机未安装的字体会使用替代字体显示。')}</p>
      <div className="modal-actions"><button type="button" className="secondary-button" disabled={operation} onClick={() => setFontDialog(null)}>{t('取消')}</button><button className="primary-button" disabled={operation}>{t('应用字体')}</button></div>
    </form></div>}
    {references && <ReferencesDialog doc={editor.current.activeEditor.doc} capture={references.capture} close={()=>setReferences(null)} insert={insertReference}/>}
    {error && <NoticeDialog message={error} close={()=>setError('')}/>}
    {settings && <SettingsDialog language={chosenLanguage} setLanguage={setChosenLanguage} author={chosenAuthor} setAuthor={setChosenAuthor} busy={busy} close={() => setSettings(false)} submit={applySettings}/>}
    {pageSetup && <PageDialog sections={pageSetup} sectionIndex={sectionIndex} setSectionIndex={choosePageSection} paper={paper} setPaper={setPaper} orientation={orientation} setOrientation={setOrientation} busy={operation} close={() => setPageSetup(null)} submit={applyPageSetup}/>}
  </div>;
}
const initialSource = await sessionHandoff('get').catch(() => null);
await prepareDocumentFonts(initialSource?.file || './welcome.docx').catch(console.warn);
createRoot(document.getElementById('root')).render(<App initialSource={initialSource}/>);
