// The document history belongs to SuperDoc, not Chromium's hidden textarea.
export function installHistoryShortcuts({ desktop, execute, targetWindow = window }) {
  const document = targetWindow.document;
  let composing = false;
  const start = () => { composing = true; };
  const end = () => { composing = false; };
  const editingUiText = () => Boolean(document.activeElement?.closest('.modal-backdrop, .ribbon-tools input, .ribbon-tools textarea, .ribbon-tools [contenteditable="true"]'));
  const keydown = event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.isComposing || event.keyCode === 229 || composing || editingUiText()) return;
    const key = event.key.toLowerCase();
    const command = key === 'z' ? (event.shiftKey ? 'redo' : 'undo') : key === 'y' && !event.shiftKey ? 'redo' : null;
    if (!command) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void execute(command);
  };
  const unsubscribe = desktop?.onHistoryCommand?.(command => {
    if (composing) return;
    if (!['undo', 'redo'].includes(command)) return;
    if (editingUiText()) { void desktop.nativeTextHistory(command); return; }
    void execute(command);
  });
  targetWindow.addEventListener('keydown', keydown, true);
  targetWindow.addEventListener('compositionstart', start, true);
  targetWindow.addEventListener('compositionend', end, true);
  return () => { targetWindow.removeEventListener('keydown', keydown, true); targetWindow.removeEventListener('compositionstart', start, true); targetWindow.removeEventListener('compositionend', end, true); unsubscribe?.(); };
}
