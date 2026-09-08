# SuperDoc 离线桌面客户端可行性

核查日期：2026-09-08。目标：使用 Electron + React，实现 Word 文档查看、简单文字修改和批注，视觉参考用户提供的 SuperDoc 官网截图。

## 结论

可行。SuperDoc 已具备本地 DOCX 解析、分页渲染、编辑和批注能力；Electron 提供 Chromium 执行环境与本地文件系统桥接；React 负责应用外壳。编辑内核无需自行重写，也不需要为单用户离线功能搭建后端服务。

此结论针对 `.docx` 和基本编辑场景，不代表兼容所有 Word 功能，也不代表所有文档都能与 Word 像素级一致。

## 官方依据与实现对应

| 需求 | 官方能力 | 客户端实现 |
| --- | --- | --- |
| 打开本地文档 | `document` 接受 File/Blob | 原生选择文件 → 主进程读取 → IPC 字节 → File |
| 阅读与文字编辑 | `viewing` / `editing` 模式 | 顶部模式切换，通过运行时方法修改模式 |
| 批注 | 原生批注创建、回复、解决及 DOCX 持久化 | 复用内置批注 UI，添加按钮捕获所选文字 |
| 保存 | `export({ triggerDownload: false })` 返回 Blob | IPC 传回主进程，写入用户选择的路径 |
| 完全离线 | 编辑内核无需服务器；遥测可关闭 | 本地打包 JS/CSS/worker，关闭遥测并拦截外联 |
| 官网风格 | 编辑器和工具栏可分容器嵌入 | React 外壳采用蓝色按钮、浅渐变、文档卡片布局 |

依据：[官方仓库](https://github.com/superdoc/docx-editor)、[加载和保存](https://docs.superdoc.dev/editor/load-and-save-documents/)、[模式](https://docs.superdoc.dev/editor/document-modes/)、[批注](https://docs.superdoc.dev/editor/built-in-ui/comments/)、[导出](https://docs.superdoc.dev/editor/export-options/)、[遥测](https://docs.superdoc.dev/editor/telemetry/)。

## 架构

```text
Electron 主进程
  原生文件对话框 → DOCX 字节读取
  文件摘要检查 → 临时文件写入 → 替换目标文件
             ↕ 限定 IPC / preload
React 渲染进程（隔离、沙箱）
  应用标题 / 打开 / 保存 / 模式 / 批注操作
             ↕ 本地 File / 导出 Blob
SuperDoc 2.12.0
  DOCX 原生模型 / 本地 worker / 分页 / 工具栏 / 批注
```

生产界面通过 `superdocx://app` 读取包内资源，不加载官网页面。没有数据库、账号服务器、协同服务或文档上传接口。桌面运行时拦截 HTTP(S)、WebSocket、FTP，禁用外部窗口和页面跳转。内部文档图片允许 blob/data URL，未安装在线校对、AI 或协同提供方。

[Electron 官方安全建议](https://www.electronjs.org/docs/latest/tutorial/security)支持主进程与渲染进程隔离、沙箱、限制导航以及校验 IPC 发送方。

## 产品边界

1. **格式**：优先 `.docx`；`.doc` 是另一种旧格式，需通过 Word 或 LibreOffice 转换。首版不加入自动转换服务。
2. **排版**：字体缺失、中文字体回退、公式、域、复杂表格与浮动对象是需要实测的重点。不能把“导出成功”等同于“格式完全不变”。
3. **批注**：必须写回 Word 批注结构。不能只保存在 React 状态或附属 JSON 中，否则换到 Word 后就看不到。使用原生导出并进行重开测试。
4. **离线**：部署前下载依赖；运行时资源全部本地化。系统缺失字体需要本地安装或使用具备再分发许可的字体包，不能依赖 Google Fonts/CDN。
5. **保护修改**：保存时只在写入成功后更新保存状态；另存为取消不清空未保存标记；外部修改冲突不直接覆盖。
6. **许可**：编辑器为 AGPLv3／商业许可双轨，但 2.12.0 的 `@superdoc/docx-engine@0.11.0` 使用单独的专有许可。因此不能根据编辑器的开源标记推断整个产品可自由分发。当前定位为 SuperDoc 驱动的本地集成验证；向第三方分发安装包、闭源及正式商业用途需同时确认两部分授权范围。技术离线运行与许可义务是两个独立问题。[编辑器许可](https://docs.superdoc.dev/resources/license/)、[引擎专有许可](https://docs.superdoc.dev/resources/docx-engine-license/)

## 从原型到可分发产品

- 已实现：Electron + React 工程、本地文件打开和保存、SuperDoc 编辑与原生批注接入、界面、运行时断网策略、保存冲突检查。
- 后续产品化：用户身份设置、本地恢复草稿、真实文档兼容性集、多平台打包、代码签名、公证、安装包和文件关联。
- 在 macOS、Windows、Linux 各自验收后才能声称支持该平台。本机运行不证明跨平台兼容。

## 验收标准

1. 断网启动，打开含中文、表格、图片及批注的 DOCX。
2. 输入并修改中英文，基础格式、撤销与重做正常。
3. 新建批注、回复、解决，保存、关闭、重新打开后核对文字与批注。
4. 用 Microsoft Word 或 LibreOffice 交叉核对原文、排版、批注及作者信息。
5. 验证另存为取消、文件损坏、原文件被外部修改、保存失败与未保存关闭。
6. 监测本地运行期间请求，确保没有遥测和文档上传。

自动测试结果及未覆盖部分在 `docs/validation.md` 中记录。
