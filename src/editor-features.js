import { t } from './i18n';
export const FONT_OPTIONS = [
  ['宋体', 'SimSun'], ['黑体', 'SimHei'], ['楷体', 'KaiTi'], ['仿宋', 'FangSong'],
  ['微软雅黑', 'Microsoft YaHei'], ['苹方', 'PingFang SC'], ['宋体（macOS）', 'Songti SC'],
  ['思源宋体', 'Source Han Serif SC'], ['思源黑体', 'Source Han Sans SC'],
  ['Noto Serif CJK SC', 'Noto Serif CJK SC'], ['Noto Sans CJK SC', 'Noto Sans CJK SC'],
  ...['Arial', 'Calibri', 'Cambria', 'Times New Roman', 'Georgia', 'Helvetica', 'Courier New', 'Liberation Serif', 'Liberation Sans'].map(name => [name, name]),
].map(([label, value]) => ({ label, value }));

export const TOOLBAR = {
  container: '#document-toolbar', responsiveTo: 'container', overflow: 'visible',
  includeItems: ['formatting-marks', 'table-of-contents'],
  excludeItems: ['ai', 'document-mode', 'zoom'], // Mode is exposed in the Review tab.
  fontOptions: FONT_OPTIONS,
  strings: {
    undo: '撤销', redo: '重做', bold: '加粗', italic: '斜体', underline: '下划线',
    strikethrough: '删除线', 'font-family': '字体', 'font-size': '字号', 'text-color': '文字颜色',
    'highlight-color': '突出显示', link: '插入链接', image: '插入本地图片', table: '插入表格',
    'table-actions': '表格操作', 'table-of-contents': '目录', 'text-align': '对齐',
    'bullet-list': '项目符号', 'numbered-list': '编号', 'indent-decrease': '减少缩进',
    'indent-increase': '增加缩进', 'line-height': '行距', 'linked-style': '样式',
    'linked-style-label': '样式', ruler: '标尺', 'measurement-unit': '度量单位',
    'formatting-marks': '格式标记', 'copy-format': '格式刷', 'clear-formatting': '清除格式',
    search: '查找与替换', zoom: '缩放', 'track-changes-accept-selection': '接受所选修订',
    'track-changes-reject-selection': '拒绝所选修订',
  },
};

export async function localImage(file) {
  if (!file.size || file.size > 20 * 1024 * 1024) throw new Error(t('请选择小于 20 MB 的 PNG 或 JPEG 图片。'));
  const type = file.type.toLowerCase() || (/\.png$/i.test(file.name) ? 'image/png' : /\.jpe?g$/i.test(file.name) ? 'image/jpeg' : '');
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(type)) throw new Error(t('仅支持 PNG 或 JPEG 图片。'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = String(reader.result);
        const image = new Image();
        image.src = data;
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight) throw new Error('Empty image');
        resolve(data);
      } catch { reject(new Error(t('无法读取图片。'))); }
    };
    reader.onerror = () => reject(new Error(t('无法读取图片。')));
    reader.onabort = () => reject(new Error(t('无法读取图片。')));
    reader.readAsDataURL(file.slice(0, file.size, type));
  });
}

export function ensureSuccess(receipt) {
  if (receipt === true || receipt?.success === true || receipt?.ok === true) return;
  if (receipt?.failure?.code === 'NO_OP') return;
  throw new Error(receipt?.failure?.message || receipt?.reason?.message || t('编辑器未能完成操作，请检查选区和文档模式。'));
}

export function appToolbarItems(actions) {
  const icon = paths => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return [
    ['app-fonts', '字体设置', 'beginFonts', '<path d="m5 8 6 6M4 14l6-6 2-3H2m5-3v3m7 17 5-11 5 11m-8-4h6"/>'],
    ['app-page', '页面设置', 'beginPageSetup', '<rect x="3" y="3" width="18" height="6" rx="1"/><rect x="3" y="13" width="7" height="8" rx="1"/><rect x="14" y="13" width="7" height="8" rx="1"/>'],
    ['app-settings', '设置', 'openSettings', '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m9 3 .5-1h5l.5 3 2 1 3-.5 2.5 4-2.5 2v2l2.5 2-2.5 4-3-.5-2 1-.5 3h-5L9 20l-2-1-3 .5-2.5-4 2.5-2v-2l-2.5-2 2.5-4 3 .5Z"/>'],
  ].map(([id, label, action, svg]) => ({ id, type: 'button', size: 'compact', region: 'center', icon: icon(svg), tooltip: t(label), attributes: { ariaLabel: t(label), className: id === 'app-fonts' ? 'app-font-control' : 'app-tool-control' }, onSelect: () => actions.current[action]() }));
}
