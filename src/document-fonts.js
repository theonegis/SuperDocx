import JSZip from 'jszip';
import { applyDocumentDefaultFonts } from './font-settings';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const W14 = 'http://schemas.microsoft.com/office/word/2010/wordml';
const elements = (node, name) => [...node.getElementsByTagNameNS(W, name)];
const attribute = (node, name) => node?.getAttributeNS(W, name) || '';

// Snapshot every supported story before writing. Preserve each run's other
// font channels, formatting and text instead of exporting/reimporting a DOCX.
export async function applyDocumentFonts(instance, initial, patch, changeMode, onMutation) {
  const active = instance.activeEditor;
  const zip = await JSZip.loadAsync(await instance.export({ exportType: ['docx'], triggerDownload: false }));
  const read = async name => zip.file(name) ? new DOMParser().parseFromString(await zip.file(name).async('string'), 'application/xml') : null;
  const body = await read('word/document.xml');
  const stories = [{ xml: body, story: { kind: 'story', storyType: 'body' } }];
  const rels = await read('word/_rels/document.xml.rels');
  for (const rel of [...(rels?.documentElement.children || [])]) {
    if (!/\/(header|footer)$/.test(rel.getAttribute('Type') || '') || rel.getAttribute('TargetMode') === 'External') continue;
    const target = rel.getAttribute('Target');
    const part = new URL(target, 'https://docx.invalid/word/document.xml').pathname.slice(1);
    stories.push({ xml: await read(part), story: { kind: 'story', storyType: 'headerFooterPart', refId: rel.getAttribute('Id') } });
  }
  for (const type of ['footnote', 'endnote']) {
    const xml = await read(`word/${type}s.xml`);
    for (const note of xml ? elements(xml, type) : []) {
      if (attribute(note, 'type') && attribute(note, 'type') !== 'normal') continue;
      stories.push({ xml: note, story: { kind: 'story', storyType: type, noteId: attribute(note, 'id') } });
    }
  }
  const runs = [];
  for (const { xml, story } of stories) {
    if (!xml) throw new Error('Cannot read a document story for font settings.');
    // Do not silently report whole-document success for unsupported textboxes.
    if (elements(xml, 'txbxContent').length) throw new Error('全文字体设置暂不支持含文本框的文档，请选择文字后设置字体。');
    const addresses = [];
    for (let offset = 0;;) {
      const page = await active.doc.find({ select: { type: 'node', kind: 'block' }, in: story, limit: 250, offset });
      addresses.push(...page.items.filter(item => ['paragraph', 'heading', 'listItem'].includes(item.address.nodeType)).map(item => item.address.nodeId));
      offset += page.items.length;
      if (!page.items.length || offset >= page.total) break;
    }
    elements(xml, 'p').forEach((p, index) => {
      const blockId = p.getAttributeNS(W14, 'paraId') || addresses[index];
      let offset = 0;
      for (const run of elements(p, 'r')) {
        let ancestor = run.parentElement, skip = false;
        while (ancestor && ancestor !== p) {
          if (['del', 'moveFrom', 'p'].includes(ancestor.localName)) skip = true;
          ancestor = ancestor.parentElement;
        }
        if (skip) continue;
        const length = [...run.children].reduce((sum, node) => sum + (node.localName === 't' ? node.textContent.length : ['tab', 'br', 'cr', 'drawing', 'footnoteReference', 'endnoteReference'].includes(node.localName) ? 1 : 0), 0);
        if (length) {
          if (!blockId) throw new Error('Cannot resolve a paragraph for font settings.');
          const font = elements(run, 'rFonts')[0];
          const original = Object.fromEntries([...(font?.attributes || [])].filter(item => item.namespaceURI === W).map(item => [item.localName, item.value]));
          runs.push({ target: { kind: 'selection', story, start: { kind: 'text', blockId, offset }, end: { kind: 'text', blockId, offset: offset + length } }, value: { ...original, ...patch } });
        }
        offset += length;
      }
    });
  }
  if (instance.activeEditor !== active) throw new Error('The active document changed. Reopen font settings.');
  for (const run of runs) {
    const receipt = await active.doc.format.rFonts(run, { changeMode });
    if (!receipt.success && receipt.failure?.code !== 'NO_OP') throw new Error(receipt.failure?.message || 'Could not apply document fonts.');
    if (receipt.success) onMutation();
  }
  if (await applyDocumentDefaultFonts(active, initial, patch)) onMutation();
}
