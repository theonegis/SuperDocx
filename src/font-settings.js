import JSZip from 'jszip';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const attr = (node, name) => node?.getAttributeNS(W, name) || '';
const child = (node, name) => [...(node?.children || [])].find(item => item.namespaceURI === W && item.localName === name);
const all = (node, name) => [...(node?.getElementsByTagNameNS(W, name) || [])];
const parse = text => new DOMParser().parseFromString(text, 'application/xml');

// The v2 SDM projection currently omits run fonts. Read the current exported
// OOXML instead of guessing from CSS (which can contain substituted fonts).
export async function readSelectionFonts(instance, capture) {
  const blob = await instance.export({ exportType: ['docx'], triggerDownload: false });
  const zip = await JSZip.loadAsync(blob);
  const read = async path => zip.file(path) ? parse(await zip.file(path).async('string')) : null;
  const styles = await read('word/styles.xml');
  const theme = await read('word/theme/theme1.xml');
  const styleMap = new Map(all(styles, 'style').map(node => [attr(node, 'styleId'), node]));
  const defaults = child(all(styles, 'rPrDefault')[0], 'rPr');
  function fonts(rPr, base = {}) {
    const result = { ...base };
    const f = child(rPr, 'rFonts');
    for (const key of ['ascii', 'hAnsi', 'eastAsia', 'cs']) {
      const themeRef = attr(f, key + 'Theme');
      const direct = attr(f, key);
      if (direct || themeRef) {
        result[key] = direct;
        if (themeRef) {
          const group = theme?.getElementsByTagNameNS(A, themeRef.startsWith('major') ? 'majorFont' : 'minorFont')[0];
          const family = group?.getElementsByTagNameNS(A, key === 'eastAsia' ? 'ea' : key === 'cs' ? 'cs' : 'latin')[0]?.getAttribute('typeface');
          const lang = attr(child(rPr, 'lang'), 'eastAsia') || 'zh-CN';
          const script = /^ja/i.test(lang) ? 'Jpan' : /^ko/i.test(lang) ? 'Hang' : /TW|HK|MO/i.test(lang) ? 'Hant' : 'Hans';
          result[key] = family || (key === 'eastAsia' ? [...(group?.getElementsByTagNameNS(A, 'font') || [])].find(item => item.getAttribute('script') === script)?.getAttribute('typeface') : '') || direct;
        }
      }
    }
    return result;
  }
  function style(id, base, seen = new Set()) {
    if (!id || seen.has(id)) return base;
    seen.add(id);
    const node = styleMap.get(id);
    return fonts(child(node, 'rPr'), style(attr(child(node, 'basedOn'), 'val'), base, seen));
  }
  const defaultStyle = all(styles, 'style').find(node => attr(node, 'type') === 'paragraph' && ['1', 'true'].includes(attr(node, 'default')));
  const base = style(attr(defaultStyle, 'styleId'), fonts(defaults));
  if (!capture?.selectionTarget || capture.empty) {
    const resolved = fonts(defaults);
    const defaultFonts = Object.fromEntries([...(child(defaults, 'rFonts')?.attributes || [])].filter(item => item.namespaceURI === W).map(item => [item.localName, item.value]));
    return { east: { value: resolved.eastAsia || '', mixed: false }, west: { value: resolved.ascii || resolved.hAnsi || '', mixed: !!(resolved.ascii && resolved.hAnsi && resolved.ascii !== resolved.hAnsi) }, runs: [], defaultFonts, documentDefaults: true };
  }
  const target = capture.selectionTarget;
  const story = target.story || target.start.story;
  let part = 'word/document.xml';
  if (story && story.storyType !== 'body') {
    const rels = await read('word/_rels/document.xml.rels');
    const rel = [...(rels?.documentElement.children || [])].find(node => node.getAttribute('Id') === story.refId);
    const path = rel?.getAttribute('Target');
    if (!path) throw new Error('This story cannot be resolved for font settings.');
    part = path.startsWith('/') ? path.slice(1) : 'word/' + path.replace(/^\.\//, '');
  }
  const xml = await read(part);
  const paragraphs = all(xml, 'p');
  const addresses = [];
  for (let offset = 0;;) {
    const page = await instance.activeEditor.doc.find({ select: { type: 'node', kind: 'block' }, in: story, limit: 250, offset });
    addresses.push(...page.items.filter(item => ['paragraph', 'heading', 'listItem'].includes(item.address.nodeType)).map(item => item.address.nodeId));
    offset += page.items.length;
    if (!page.items.length || offset >= page.total) break;
  }
  const segments = capture.target?.segments || [];
  const collected = [];
  const selectedRuns = [];
  let caretFonts = {};
  paragraphs.forEach((p, index) => {
    const id = p.getAttributeNS('http://schemas.microsoft.com/office/word/2010/wordml', 'paraId') || addresses[index];
    const segment = segments.find(item => item.blockId === id);
    const caret = capture.empty && target.start.blockId === id;
    if (!segment && !caret) return;
    const pPr = child(p, 'pPr');
    const inherited = style(attr(child(pPr, 'pStyle'), 'val'), base);
    const runs = [];
    let offset = 0;
    for (const run of all(p, 'r')) {
      // Nested text boxes and deleted revisions have separate text coordinates.
      let ancestor = run.parentElement;
      let skip = false;
      while (ancestor && ancestor !== p) {
        if (['del', 'moveFrom', 'txbxContent', 'p'].includes(ancestor.localName)) skip = true;
        ancestor = ancestor.parentElement;
      }
      if (skip) continue;
      const text = [...run.children].map(node => node.localName === 't' ? node.textContent : ['tab', 'br', 'cr', 'drawing', 'footnoteReference', 'endnoteReference'].includes(node.localName) ? '\uFFFC' : '').join('');
      const rPr = child(run, 'rPr');
      const resolved = fonts(rPr, style(attr(child(rPr, 'rStyle'), 'val'), inherited));
      const direct = Object.fromEntries([...(child(rPr, 'rFonts')?.attributes || [])].filter(item => item.namespaceURI === W).map(item => [item.localName, item.value]));
      runs.push({ start: offset, end: offset + text.length, fonts: resolved, direct });
      offset += text.length;
    }
    if (caret) {
      const pos = target.start.offset;
      const run = runs.find(run => run.start < pos && run.end >= pos) || runs.find(run => run.start === pos);
      collected.push(run?.fonts || fonts(child(pPr, 'rPr'), inherited));
      caretFonts = run?.direct || Object.fromEntries([...(child(child(pPr, 'rPr'), 'rFonts')?.attributes || [])].filter(item => item.namespaceURI === W).map(item => [item.localName, item.value]));
    } else {
      runs.filter(run => run.end > segment.range.start && run.start < segment.range.end).forEach(run => {
        collected.push(run.fonts);
        selectedRuns.push({
          target: { ...target, start: { kind: 'text', blockId: id, offset: Math.max(run.start, segment.range.start) }, end: { kind: 'text', blockId: id, offset: Math.min(run.end, segment.range.end) } },
          fonts: run.direct,
        });
      });
    }
  });
  const pending = capture.empty ? instance.activeEditor.host?.getPendingInlineFormat?.() : null;
  function summarize(keys) {
    if (pending?.fontFamily) return { value: pending.fontFamily, mixed: false };
    const values = [...new Set(collected.flatMap(item => {
      const families = keys.map(key => item[key]).filter(Boolean);
      return families.length ? families : [''];
    }))];
    return { value: values.length === 1 ? values[0] : '', mixed: values.length > 1 };
  }
  return { east: summarize(['eastAsia']), west: summarize(['ascii', 'hAnsi']), runs: selectedRuns, caretFonts };
}

// rFonts replaces the whole attribute bag in this SDK. Preserve each run's
// original attributes, including theme references, rather than flattening a
// mixed selection to a single Western font when only Chinese was edited.
export async function applySelectionFonts(active, initial, value, changeMode) {
  if (!initial.runs.length) throw new Error('No text runs were found in the selection.');
  for (const run of initial.runs) {
    const receipt = await active.doc.format.rFonts({ target: run.target, value: { ...run.fonts, ...value } }, { changeMode });
    if (!receipt.success && receipt.failure?.code !== 'NO_OP') throw new Error(receipt.failure?.message || 'Could not apply fonts.');
  }
}

export function changedFontPatch(initial, east, west) {
  const patch = {};
  if (east && east !== initial.east.value) Object.assign(patch, { eastAsia: east, eastAsiaTheme: null });
  if (west && west !== initial.west.value) Object.assign(patch, { ascii: west, hAnsi: west, asciiTheme: null, hAnsiTheme: null });
  return patch;
}

export async function applyDocumentDefaultFonts(active, initial, patch) {
  const fontFamily = { ...initial.defaultFonts, ...patch };
  for (const key of Object.keys(fontFamily)) if (fontFamily[key] === null) delete fontFamily[key];
  const receipt = await active.doc.styles.apply({ target: { scope: 'docDefaults', channel: 'run' }, patch: { fontFamily } });
  if (!receipt.success) throw new Error(receipt.failure?.message || 'Could not apply document fonts.');
  return receipt.changed;
}

const typingFonts = new WeakMap();
export function getTypingFonts(active) { return typingFonts.get(active)?.value || {}; }
export function clearTypingFonts(active) { typingFonts.get(active)?.dispose(); }
export async function setTypingFonts(instance, value, reportError, changeMode = 'direct') {
  const active = instance.activeEditor;
  let cursor = await active.doc.selection.current({ includeText: true });
  const initial = await readSelectionFonts(instance, cursor);
  const previous = typingFonts.get(active);
  const merged = {
    ...initial.caretFonts,
    ...previous?.value, ...value,
  };
  previous?.dispose();
  // The SDK's hidden input surface can be outside the rendered page container.
  const surface = document;
  let before = null, composing = false, applying = false, disposed = false;
  let frame = 0;
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { frame = requestAnimationFrame(finish); }); };
  const pointer = event => { if (event.target.closest?.('#document-editor')) dispose(); };
  const dispose = () => {
    disposed = true;
    surface.removeEventListener('beforeinput', prepare, true);
    surface.removeEventListener('compositionstart', compositionStart, true);
    surface.removeEventListener('compositionend', compositionEnd, true);
    surface.removeEventListener('pointerdown', pointer, true);
    surface.removeEventListener('keydown', navigation, true);
    instance.off('editor-update', schedule);
    cancelAnimationFrame(frame);
    typingFonts.delete(active);
  };
  const prepare = event => {
    if (document.querySelector('.modal-backdrop')) return;
    if (instance.activeEditor !== active) { dispose(); return; }
    if (!event.inputType.startsWith('insert') || event.inputType === 'insertFromPaste') { dispose(); return; }
    before ||= Promise.resolve(cursor);
  };
  const finish = async () => {
    if (!before || composing || applying || disposed) return;
    applying = true;
    const pending = before;
    before = null;
    try {
      const start = await pending;
      const end = await active.doc.selection.current({});
      if (disposed || instance.activeEditor !== active || !start.empty || !end.empty) return;
      const from = start.selectionTarget?.start, to = end.selectionTarget?.end;
      if (!from || !to || from.kind !== 'text' || to.kind !== 'text') { before ||= pending; return; }
      if (from.blockId === to.blockId && from.offset === to.offset) { before ||= pending; return; }
      cursor = end;
      const target = { ...start.selectionTarget, start: from, end: to };
      const receipt = await active.doc.format.rFonts({ target, value: merged }, { changeMode });
      if (!receipt.success && receipt.failure?.code !== 'NO_OP') throw new Error(receipt.failure?.message || 'Could not apply typing fonts.');
    } catch (error) { reportError(error.message); dispose(); }
    finally { applying = false; }
  };
  const compositionStart = () => { if (document.querySelector('.modal-backdrop')) return; composing = true; before ||= Promise.resolve(cursor); };
  const compositionEnd = () => { composing = false; requestAnimationFrame(finish); };
  const navigation = event => {
    if (document.querySelector('.modal-backdrop')) return;
    if (instance.activeEditor !== active) { dispose(); return; }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Escape', 'Backspace', 'Delete'].includes(event.key) || ((event.ctrlKey || event.metaKey) && ['a', 'z', 'y'].includes(event.key.toLowerCase()))) dispose();
    else if ((!event.ctrlKey && !event.metaKey && event.key.length === 1) || event.key === 'Enter') before ||= Promise.resolve(cursor);
  };
  typingFonts.set(active, { value: merged, dispose });
  surface.addEventListener('beforeinput', prepare, true);
  surface.addEventListener('compositionstart', compositionStart, true);
  surface.addEventListener('compositionend', compositionEnd, true);
  surface.addEventListener('pointerdown', pointer, true);
  surface.addEventListener('keydown', navigation, true);
  instance.on('editor-update', schedule);
}
