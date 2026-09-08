# 验证记录

日期：2026-09-08。验证的是本项目的集成行为，不是对引擎内部实现的测试或性能评测。

## 环境

- macOS / Apple Silicon（arm64）
- Node.js 24.19.0
- Electron 44.2.0、React 19.2.8、SuperDoc 2.12.0
- 实际锁定引擎依赖：`@superdoc/docx-engine` 0.11.0
- 浏览器预览使用本机 Google Chrome

## 已通过

1. `npm run build`：生产构建完成，JS、CSS 与 worker 都输出为本地资源。存在编辑器 bundle 较大的提示，不影响构建。
2. `npm test`：2 项文件测试通过，涵盖格式／大小初筛、写入、外部修改冲突和失败时原内容保留。
3. 浏览器集成：真实输入文字、鼠标拖选、添加中文批注、导出、解包核对 XML、重新打开。
4. Electron 集成：原生打开和保存桥接、取消另存为保留未保存标记、另存为及原路径保存、重新打开、查看模式阻止输入、外部修改冲突、另存为恢复、损坏输入不替换当前文档。
5. DOCX 内容：保存后的 `word/document.xml` 包含修改文字与批注锚点，`word/comments.xml` 包含新增批注、本地作者和原有批注。
6. 离线策略：集成操作期间未观察到页面发起意外 HTTP(S)/WebSocket 请求；主动外部 fetch 被阻止。桌面主进程另外拦截远程 HTTP(S)/WebSocket/FTP 请求，遥测显式禁用。
7. 跨应用读取：LibreOffice headless 成功将浏览器导出的 DOCX 读取为 Writer 文档并转换为纯文本，转换结果包含本次文字修改。
8. 打包：成功生成 `release/mac-arm64/SuperDocx.app`。对这个实际打包应用运行同一 Electron 往返流程，全部通过，未捕获页面 JavaScript 异常。

Electron 原生文件对话框在自动测试中替换为固定选择结果，文件读取、DOCX 编辑与导出、IPC 和磁盘写入仍使用真实应用代码。

## 尚未覆盖

- Microsoft Word 人工交叉核对、复杂版式逐页对照。
- 大型文档、复杂表格、公式、目录、域、浮动图片和系统缺失字体。
- 中文输入法真实 composition 过程（已验证中文文档和中文批注，不能代替输入法验收）。
- 批注回复、解决、重新打开状态的完整跨应用往返测试。
- 未保存关闭对话框的自动化点击、进程崩溃和断电恢复。
- Windows/Linux、Intel macOS、签名、公证和安装器。
- 操作系统级全进程抓包；“未观察到请求”仅指本次集成操作的页面观察范围，不能表述为全系统网络审计。

## 产物

- `artifacts/test-results.json`：实际打包应用的测试结果。
- `artifacts/desktop.png`：实际打包应用的截图。
- `artifacts/desktop-copy.docx`：保存冲突后另存为恢复的验证文件。
- `artifacts/browser-roundtrip.docx` / `.txt`：浏览器导出及 LibreOffice 读取结果。
- `release/mac-arm64/SuperDocx.app`：约 484 MB，未签名，仅作为本机集成验证产物；不代表已获第三方分发授权。

## 本机重现

```sh
npm test
npm run test:e2e
npm run pack -- --config.electronDist=node_modules/electron/dist
SUPERDOCX_TEST_EXECUTABLE="$PWD/release/mac-arm64/SuperDocx.app/Contents/MacOS/SuperDocx" node tests/smoke.mjs
```

首次 Electron 二进制自动下载在当前网络中失败，最终下载同版本镜像，并用官方 npm 包内 SHA256 校验通过后解压。没有修改引擎代码，也没有绕过任何许可或访问控制。


## 精简界面与多平台图标更新

- 删除工作区之外的顶部品牌栏、宣传标题、页脚标语；文件栏、工具栏、文档与批注区、状态栏保留。
- 更新后实际 macOS 应用的 DOCX 编辑、批注和保存往返测试通过。
- macOS 包的 `CFBundleIconFile` 已指向新 `icon.icns`。
- ICNS 容器及多尺寸图像条目、ICO 的 10 个 PNG 图像条目与像素尺寸已检查；Linux 提供 10 种 PNG 尺寸。
- 已查看 16–256 px 图标在浅色及深色背景上的显示。
- Windows/Linux 配置 `autoHideMenuBar` 并显式设置初始菜单栏隐藏；Alt 临时显示，macOS 菜单行为保留。
- Windows/Linux 的真实窗口和安装包尚未在对应操作系统上验证。

## 0.2.0 离线编辑与界面扩充

- 恢复默认内置编辑工具，并启用目录与格式标记；双层分组工具栏取代额外设置栏。字体高级设置位于字体组。
- 新增中西文字体分别设置、修订模式与审阅面板、按分节页面设置、空白新建、中文／English 及作者设置。
- 字体验证检查 DOCX XML 的 `w:rFonts` 中 `eastAsia`、`ascii`、`hAnsi` 属性，重开后再次导出仍保留。
- 修订验证检查未决定插入的 `w:ins`；拒绝后文字移除，接受后文字保留且不再有待处理插入。
- 页面设置验证 A4 横向输出为 16838 × 11906 twip，避免将接口英寸误作为 twip 传入。
- 设置重载验证未保存文字和标记保留；系统菜单语言跟随设置。测试使用隔离的临时用户配置。
- 图片验证本地 PNG 被嵌入 `word/media/`，表格写入 `w:tbl`；搜索替换保存后重开仍有替换内容，操作期间没有远程请求。
- 检查 1000 × 700 窗口的工具可达性和正文滚动；关闭、审阅、表单、加载界面统一样式。
- 新增证据：`artifacts/features-results.json`、`artifacts/rich-editing.docx`、`artifacts/ribbon.png`、`artifacts/english.png`、`artifacts/narrow.png`、`artifacts/settings-ui.png`、`artifacts/review-ui.png`。

本轮发现完整工具栏在销毁旧引擎后仍可能有延迟读取，因此普通文件切换改用公开 `replaceFile()`；设置变化使用一次本地文档交接并重载界面。没有修改引擎内部代码或屏蔽未处理错误。默认采用固定 100% 缩放，避免连续适应宽度在页面方向变化时产生反馈抖动。

## 0.3 Ribbon 与 Zotero 基础引用验证（2026-09-08）

- `npm test`：文件读写保护、Zotero 账户权限检查、搜索参数编码、敏感／附件数据排除、断开连接，通过。
- `tests/features.mjs`：六页签 Ribbon 下的中西文字体 DOCX 保存／重开、修订接受／拒绝、页面尺寸、中英文切换保留未保存文字、1000px 窗口，通过。
- `tests/smoke.mjs`：打开、编辑、批注、保存、重开、只读模式、文件冲突及损坏文件处理，通过。
- `tests/rich-editing.mjs`：分类页签中的图片、表格、查找替换与保存重开，通过；文档操作无页面远程请求。
- `tests/citations.mjs`：真实 SuperDoc 2.12.0 插入来源、正文引用和参考文献表；检查 DOCX 内 CITATION／BIBLIOGRAPHY 字段及来源元数据，重开后仍可枚举并更新，通过。
- `tests/references-ui.mjs`：以虚构云端账户与文献替代 IPC 数据，操作真实 React 界面及 SuperDoc：连接、选择、插入、更新文献表、保存重开、离线再次引用，通过。此测试不等于真实账户联网验证。

当前引用结果采用 SuperDoc 原生标题显示。没有验证或声称 APA、GB/T 7714、CSL、Zotero 插件互通、Word 原生更新或真实云端账户测试通过。连接密钥不落盘，仅主进程会话保留。

已生成 `release/mac-arm64/SuperDocx.app` 0.3.0（未签名 Apple Silicon 测试包），并在打包产物上通过引用端到端测试与 Ribbon／审阅／设置视觉检查。Windows／Linux 本轮未运行测试。

## 0.3.1 紧凑界面（2026-09-08）

顶部文件栏由 90px 压缩为 46px，文件名与元数据同行。开始之外的 Ribbon 页签显示本地化图标与文字；缩放、度量单位及审阅、参考文献表操作补齐图标。原生控件保留原有事件和可访问名称。

`tests/features.mjs` 通过：中英文切换、字体、审阅、页面设置和窄窗口；`tests/preview.mjs` 在打包后的 0.3.1 应用上通过 46px 高度检查，并检查五个工具页签与设置窗口。已更新 Apple Silicon 测试包。

## 0.3.2 提示对话框（2026-09-08）

顶部错误／操作提示条改为统一 NoticeDialog，提供确认和关闭按钮、Esc 关闭、键盘焦点约束及关闭后焦点恢复。顶部英文打开按钮缩短为 Open。中英文提示、确认和 Esc 操作已通过 Electron 界面检查；已重新打包。

## 0.3.3 状态栏、缩放与大纲（2026-09-08）

`tests/zoom.mjs` 通过：文档文字几何尺寸随 100%→110% 改变而文件栏高度不变；真实 Ctrl＋滚轮、模拟 ctrl-wheel 捏合与 ⌘-wheel 事件；普通滚动不改比例；25%–300% 边界、重置；Electron 页面缩放因子始终为 1；缩放不产生未保存标记；中英文混排输入后字数增量；多页 DOCX 标题大纲及实际滚动跳转。触控板物理硬件与 Windows／Linux 本轮未实测。

## 0.3.4 系统默认设置（2026-09-08）

首次启动通过受限 IPC 读取 `os.userInfo().username` 和 Electron 系统首选语言。中文语言标签（含 zh-CN、zh-TW）默认中文，其余默认英文；已保存偏好优先。验证了真实 OS 用户名、中文／英文／法文系统语言映射，以及手动作者与界面语言在重载后保持。
