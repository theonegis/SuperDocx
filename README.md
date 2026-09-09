# SuperDocx

**这是一个自用 APP 项目，主要用于 Linux 下 Word 文档的轻量编辑、审阅修订和批注。** 基于 Electron、React 和 SuperDoc 构建，目标是提供简洁的本地 DOCX 工作台，满足日常阅读、少量文字修改和文档反馈的需要。

项目并非 SuperDoc 官方客户端，也不以完整替代 Microsoft Word 为目标。文档的打开、编辑、批注与保存均在本机完成，无需账户或服务器；Zotero 云端文献库是可选的联网功能。

## 功能

- 本地打开、保存和另存为 `.docx`，批注与修订随文档保存。
- 查看、编辑、修订模式，支持定位修订、接受／拒绝和批注回复。
- 单行 Ribbon：开始、插入、页面、引用、审阅、视图。
- 常用文字和段落格式、中文／西文字体分别设置、图片、表格、目录、查找替换及页面设置。
- 状态栏显示实时字数、文档大纲开关和缩放比例；支持标题跳转、Ctrl／⌘＋滚轮及触控板捏合缩放。
- 支持中文和英文 UI；默认跟随系统语言，中文系统用中文，其余用英文。批注和修订作者默认使用电脑用户名，均可在设置中修改。
- 提醒未保存修改，保存时检测原文件是否被其他程序修改。
- Windows／Linux 默认隐藏菜单栏，按 Alt 可临时显示。

## 运行

建议使用 Node.js 22.12+ 或 24 LTS，以及 npm。

```sh
npm ci
npm start
```

首次安装需要联网下载依赖与 Electron；应用运行时的基本文档操作不需要网络。Linux 需要可用的桌面图形环境及 Electron 所需的系统库。

| 命令 | 用途 |
| --- | --- |
| `npm start` | 构建并启动桌面应用 |
| `npm run dev` | 浏览器开发预览 |
| `npm run build` | 构建前端 |
| `npm run pack` | 构建当前平台的应用目录，输出至 `release/` |
| `npm run package:linux` | 产出 Linux 安装包（`deb` + `rpm`），输出至 `release/` |
| `npm test` | 文件读写保护与 Zotero 接口单元测试 |
| `npm run test:e2e` | Electron 文档编辑、批注、保存与重开测试 |
| `npm run test:features` | 字体、修订、页面设置、双语、图片与表格测试 |
| `npm run test:references` | 基础引用及 DOCX 保存重开测试 |
| `node tests/zoom.mjs` | 状态栏缩放、字数和大纲导航测试 |

### 本机离线打包

```sh
# 先准备依赖
npm ci

# 生成 Linux .deb / .rpm（离线安装包）
npm run package:linux
```

生成文件位于 `release/` 下（需要联网环境重新执行 `npm ci`，之后即可在当前机器打包，无需额外联网运行应用）。 

### GitHub Action

仓库已新增 `.github/workflows/build-linux-packages.yml`，`push` 到 `main` 或 `v*` 标签时会自动触发 Linux 打包，并将 `release/*.deb` 与 `release/*.rpm` 上传为 Action Artifact。 

界面测试需要图形环境，截图与测试文档写入 `artifacts/`。直接运行界面测试前请先创建该目录并执行 `npm run build`。依赖、构建产物、安装包、测试文档和本地密钥不提交到仓库。

**主要使用目标是 Linux；目前开发验证主要在 macOS Apple Silicon 完成，Linux／Windows 仍需实机兼容性验证。** 仓库不附带预构建安装包。

## Zotero 与引用

通过“引用 → 插入文献 → Zotero 云端文献库”，登录 Zotero 网站并创建个人文献库只读 API Key，然后在应用中连接、搜索并插入文献。不依赖本地 Zotero 客户端；密钥只保留在本次应用会话中，文档内容不上传。

已支持 SuperDoc 原生正文引用、文献来源元数据和参考文献表，保存后可离线复用。**目前仅显示文献标题，尚未接入 CSL 排版，不支持 APA、GB/T 7714 样式切换、Zotero 自动同步或其他编辑器插件字段互通。** 真实账户连接需自行验证，自动化测试使用虚构账户数据。

## 当前边界

- 仅支持 `.docx`，文件上限 50 MB；旧版 `.doc` 需要先转换，不支持加密文档、宏、云端协作和 AI。
- 使用系统字体。缺失字体可能导致换行和分页差异；复杂表格、公式、浮动图形、大型文档和中文输入法仍需更多兼容性验证。
- 不保证与 Microsoft Word 完全一致。SuperDoc 自身保存重开测试不能代替 Word 交叉验证。
- 暂未实现自动恢复、多标签页、文件关联、自动更新和 PDF 导出。

## 项目结构

- `src/`：React 界面、Ribbon、状态栏及 SuperDoc 集成。
- `electron/`：本地文件读写、原生窗口、受限 IPC 和可选 Zotero 云端访问。
- `public/`：项目演示文档、空白文档和前端图标。
- `build/`：macOS、Windows、Linux 的应用图标及多分辨率资源。
- `tests/`：单元与 Electron 界面测试。
- `docs/`：[功能说明](docs/offline-features.md)、[验证记录](docs/validation.md)、[图标说明](docs/icon-design.md)。

## 许可

本项目使用 GPLv3 许可 (LICENSE)。第三方依赖遵循各自的许可。SuperDoc 的编辑器代码采用 AGPLv3，另有商业许可；2.12.0 实际依赖的 `@superdoc/docx-engine@0.11.0` 则使用单独的专有许可，不能将整个依赖栈视为纯 AGPL。分发产品前，应同时核对编辑器和引擎条款；闭源、商业用途和向第三方分发应用需要确认相应授权范围与离线条款。配置 `licenseKey` 或关闭遥测均不等于获得商业授权。本项目未使用 SuperDoc 官方标志，也不代表官方客户端。

官方来源：[项目](https://github.com/superdoc/docx-editor)、[文档](https://docs.superdoc.dev/editor/quickstart/)、[编辑器许可](https://docs.superdoc.dev/resources/license/)、[DOCX Engine 专有许可](https://docs.superdoc.dev/resources/docx-engine-license/)。
