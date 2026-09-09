const { app, BrowserWindow, dialog, ipcMain, protocol, session, Menu, net, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { randomUUID } = require('node:crypto');
const { lstat } = require('node:fs/promises');
const execFileAsync = require('node:util').promisify(require('node:child_process').execFile);
const { MAX_BYTES, readDocx, atomicWrite } = require('./files.cjs');
const zotero = require('./zotero.cjs').createZoteroClient();
// Account connection is session-only; no plain-text key is persisted.
for (const method of ['status','connect','search','disconnect']) ipcMain.handle('zotero:'+method, (event,arg)=>{trusted(event);return zotero[method](arg);});
ipcMain.handle('zotero:authorize',event=>{trusted(event);return shell.openExternal('https://www.zotero.org/settings/keys/new?name=SuperDocx&library_access=1&notes_access=0&write_access=0&all_groups=none');});
const origin = 'superdocx://app';
const entry = `${origin}/index.html`;
const documents = new Map();
let mainWindow;
let language = 'en';
ipcMain.handle('app:defaults',event=>{trusted(event);let username;try{username=require('node:os').userInfo().username;}catch{username=process.env.USER||process.env.USERNAME||'User';}const locale=app.getPreferredSystemLanguages()[0]||app.getLocale();return {username,language:/^zh(?:[-_]|$)/i.test(locale)?'zh':'en'};});
const tx = (zh, en) => language === 'en' ? en : zh;
ipcMain.handle('fonts:list', async event => {
  trusted(event);
  const { stdout } = await execFileAsync('fc-list', ['--format', '%{family}\n'], { timeout: 10000, maxBuffer: 8 * 1024 * 1024 });
  return [...new Set(stdout.split(/[\r\n,]+/).map(name => name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
});
ipcMain.handle('app:reload', (event) => { trusted(event); setImmediate(() => mainWindow.webContents.reload()); });
ipcMain.handle('app:language', (event, value) => { trusted(event); language = value === 'en' ? 'en' : 'zh'; installMenu(); });
let dirty = false;
let writing = false;
let closeDialog = false;
let closeRequest = null;
protocol.registerSchemesAsPrivileged([{ scheme: 'superdocx', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
function trusted(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame || event.senderFrame.url !== entry) throw new Error('Untrusted IPC sender');
}
async function confirmDiscard() {
  if (!dirty) return 'discard';
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning', title: tx('未保存的修改', 'Unsaved changes'), message: tx('文档有未保存的修改', 'This document has unsaved changes'),
    detail: tx('是否保存对文档的修改？', 'Do you want to save your changes?'),
    buttons: [tx('保存', 'Save'), tx('不保存', "Don't Save"), tx('取消', 'Cancel')], defaultId: 0, cancelId: 2, noLink: true,
  });
  return ['save', 'discard', 'cancel'][response] || 'cancel';
}
ipcMain.handle('document:close-result', (event, token, approved) => {
  trusted(event);
  if (!closeRequest || token !== closeRequest) return;
  closeRequest = null;
  closeDialog = false;
  if (approved === true && !writing) { dirty = false; mainWindow.close(); }
});
ipcMain.handle('document:dirty', (event, value) => { trusted(event); dirty = value === true; mainWindow.setDocumentEdited(dirty); });
ipcMain.handle('document:confirm-discard', async (event) => { trusted(event); return confirmDiscard(); });
ipcMain.handle('document:open', async (event) => {
  trusted(event);
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: tx('Word 文档', 'Word document'), extensions: ['docx'] }] });
  if (result.canceled || !result.filePaths[0]) return null;
  const filename = result.filePaths[0];
  const { bytes, hash } = await readDocx(filename);
  const id = randomUUID();
  documents.set(id, { filename, hash });
  return { id, name: path.basename(filename), bytes: new Uint8Array(bytes) };
});
ipcMain.handle('document:save', async (event, payload) => {
  trusted(event);
  if (writing) throw new Error(tx('正在保存，请稍候。', 'Saving, please wait.'));
  if (!payload || !(payload.bytes instanceof Uint8Array) || payload.bytes.length > MAX_BYTES) throw new Error(tx('无效的保存数据。', 'Invalid save data.'));
  writing = true;
  try {
    const record = documents.get(payload.id);
    let filename = record?.filename;
    let expectedHash = record?.hash;
    if (payload.saveAs || !record) {
      const suggested = typeof payload.name === 'string' ? path.basename(payload.name).replace(/\.docx$/i, '') : tx('未命名', 'Untitled');
      const defaultPath = record ? path.join(path.dirname(record.filename), `${suggested}.docx`) : `${suggested}.docx`;
      const result = await dialog.showSaveDialog(mainWindow, { defaultPath, filters: [{ name: tx('Word 文档', 'Word document'), extensions: ['docx'] }] });
      if (result.canceled || !result.filePath) return null;
      filename = /\.docx$/i.test(result.filePath) ? result.filePath : `${result.filePath}.docx`;
      // The native dialog may have confirmed a different name before we added
      // the extension. Never silently overwrite the actual DOCX destination.
      if (filename !== result.filePath) {
        let exists = false;
        try { await lstat(filename); exists = true; }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (exists) {
          const { response } = await dialog.showMessageBox(mainWindow, {
            type: 'warning', title: tx('替换文件', 'Replace file'),
            message: tx('目标文件已存在，是否替换？', 'The destination file already exists. Replace it?'),
            detail: filename,
            buttons: [tx('替换', 'Replace'), tx('取消', 'Cancel')],
            defaultId: 1, cancelId: 1, noLink: true,
          });
          if (response !== 0) return null;
        }
      }
      expectedHash = filename === record?.filename ? record.hash : undefined;
    }
    const hash = await atomicWrite(filename, Buffer.from(payload.bytes), expectedHash);
    const id = payload.id && record ? payload.id : randomUUID();
    documents.set(id, { filename, hash });
    return { id, name: path.basename(filename) };
  } finally { writing = false; }
});
ipcMain.handle('text:history', (event, command) => {
  trusted(event);
  if (command === 'undo') mainWindow.webContents.undo();
  else if (command === 'redo') mainWindow.webContents.redo();
  else throw new Error('Invalid history command');
});
function installMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: 'SuperDocx', submenu: [
      { role: 'about', label: tx('关于 SuperDocx', 'About SuperDocx') }, { type: 'separator' },
      { role: 'hide', label: tx('隐藏 SuperDocx', 'Hide SuperDocx') },
      { role: 'unhide', label: tx('全部显示', 'Show All') }, { type: 'separator' },
      { role: 'quit', label: tx('退出 SuperDocx', 'Quit SuperDocx') },
    ] }] : []),
    { label: tx('编辑', 'Edit'), submenu: [
      { label: tx('撤销', 'Undo'), accelerator: 'CommandOrControl+Z', click: () => mainWindow.webContents.send('document:history-command', 'undo') },
      { label: tx('重做', 'Redo'), accelerator: process.platform === 'darwin' ? 'Command+Shift+Z' : 'Control+Y', click: () => mainWindow.webContents.send('document:history-command', 'redo') }, { type: 'separator' },
      { role: 'cut', label: tx('剪切', 'Cut') }, { role: 'copy', label: tx('复制', 'Copy') },
      { role: 'paste', label: tx('粘贴', 'Paste') }, { role: 'selectAll', label: tx('全选', 'Select All') },
    ] },
    { label: tx('窗口', 'Window'), submenu: [
      { role: 'minimize', label: tx('最小化', 'Minimize') }, { role: 'zoom', label: tx('缩放窗口', 'Zoom') },
      { role: 'close', label: tx('关闭窗口', 'Close Window') },
    ] },
  ]));
}
function createWindow() {
  dirty = false;
  mainWindow = new BrowserWindow({ width: 1440, height: 1000, minWidth: 1000, minHeight: 700, title: 'SuperDocx', backgroundColor: '#f6f7fc',
    autoHideMenuBar: process.platform !== 'darwin',
    icon: app.isPackaged ? path.join(process.resourcesPath, 'icon.png') : path.join(__dirname, '../build/icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  if (process.platform !== 'darwin') mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => { if (url !== entry) event.preventDefault(); });
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  mainWindow.on('close', (event) => {
    if (writing) { event.preventDefault(); return; }
    if (!dirty) return;
    event.preventDefault();
    if (closeDialog) return;
    closeDialog = true;
    closeRequest = randomUUID();
    mainWindow.webContents.send('document:request-close', closeRequest);
  });
  mainWindow.loadURL(entry);
}
app.whenReady().then(() => {
  language = /^zh(?:[-_]|$)/i.test(app.getPreferredSystemLanguages()[0] || app.getLocale()) ? 'zh' : 'en';
  const root = path.resolve(__dirname, '../dist');
  protocol.handle('superdocx', (request) => {
    const url = new URL(request.url);
    if (url.host !== 'app') return new Response('Forbidden', { status: 403 });
    let relative;
    try { relative = decodeURIComponent(url.pathname); } catch { return new Response('Bad path', { status: 400 }); }
    const file = path.resolve(root, `.${relative}`);
    if (!file.startsWith(root + path.sep)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] }, (_details, callback) => callback({ cancel: true }));
  installMenu();
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
