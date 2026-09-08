# 离线功能与操作入口

本轮以 SuperDoc 2.12.0 的公开工具栏、UI controller 和 Document API 为基础扩充桌面集成。所有文档字节、图片和设置在本机处理。

| 功能 | 入口与行为 |
| --- | --- |
| 文档操作 | 新建空白 DOCX、打开、保存、另存为；保留外部修改冲突检测 |
| 基础格式 | 字体／字号快速下拉、粗体、斜体、下划线、删除线、文字颜色、突出显示 |
| 中西文字体 | 字体组高级设置：统一字体、中文字体、西文字体；分项优先于统一值，留空保留原设置 |
| 段落 | 样式、对齐、项目符号、编号、缩进、行距 |
| 插入 | 本地 PNG／JPEG 图片（20 MB 以内）、链接、表格、目录；右键／斜杠菜单保留引擎提供的上下文操作 |
| 表格 | 选中表格后使用表格操作，按当前上下文启用行列、合并、拆分及边框操作 |
| 格式辅助 | 格式刷、清除格式、格式标记、标尺、厘米／英寸、缩放 |
| 查找替换 | 工具栏搜索或 Cmd/Ctrl F；查找、替换、全部替换及匹配选项 |
| 审阅 | 查看、编辑、修订三种模式；审阅工具栏定位、单项或全部接受／拒绝；接受或拒绝后仍需保存 |
| 批注 | 添加、原生批注回复／编辑／解决等上下文操作；随 DOCX 保存 |
| 页面设置 | 按分节选择 A4／Letter、纵向／横向；标尺可调整页边距 |
| 设置 | 中文与 English；设置批注／修订作者；保存在本机 |

工具栏采用开始、插入、页面、引用、审阅、视图六个页签，每页一行工具。字体和字号位于字体组，字体高级设置紧邻字体控件。审阅、页面和应用设置并入工具栏；没有额外的设置栏。小窗口中工具栏可横向滚动，控件不会被裁掉。

设置应用会用本地 IndexedDB 暂存一次当前 DOCX，重载界面后恢复内容及未保存状态；读取成功后删除这份临时交接数据。此流程重置撤销历史，不是自动保存或历史版本系统。

字体通过 `format.rFonts` 写入 DOCX：中文使用 `eastAsia`，西文使用 `ascii`／`hAnsi`，并清除相应主题字体覆盖。界面不下载或捆绑商业字体；缺少字体时的显示和分页可能不同。正文内容不会随 UI 语言切换而翻译。

## 支持范围

这是功能更完整的本地 SuperDoc 集成，不等同于 Microsoft Word，也不声称实现 Document API 的所有 427 个操作。在线协作、云端版本历史、AI 和在线校对需要另外的服务，离线版不启用。PDF 打印／导出、多标签、自动恢复、文件关联及自动更新尚未实现。旧版 `.doc` 仍需先转换。

SuperDoc 2.12.0 没有统一的全界面语言参数。应用、系统菜单、工具栏提示、搜索和右键菜单采用中英文配置；少量没有公开翻译槽的控件由限定于界面控件的兼容层翻译。不会修改文档文字、批注正文或字体名。未覆盖的引擎诊断和个别深层内置提示可能仍显示英文。

## 官方依据

- [工具栏配置与本地图片](https://docs.superdoc.dev/editor/built-in-ui/configure-the-toolbar/)
- [修订审阅](https://docs.superdoc.dev/editor/track-changes/)
- [标尺](https://docs.superdoc.dev/editor/built-in-ui/ruler/)
- [字体字段](https://docs.superdoc.dev/document-api/reference/format/r-fonts/)
- [页面设置](https://docs.superdoc.dev/document-api/reference/sections/set-page-setup/)


## Zotero 与引用（0.3）

- 可选 Zotero Web API 连接，个人文献库标题／作者／年份搜索与分页；不依赖本地客户端。登录 Zotero 官方网站并获取只读 API Key，应用会话结束后清除密钥。
- 文档来源由 `citations.sources` 管理，正文通过 `citations.insert` 插入，文末通过 `citations.bibliography` 插入／更新。保存后可离线读取和再次引用。
- 原生显示仅为标题；完整 CSL 样式排版、文献元数据云端刷新、群组库及 OnlyOffice／Zotero 原生插件字段互通尚未实现。
- 云端读取由 Electron 主进程向固定 `api.zotero.org` 发起 GET，请求不包含文档内容，密钥不写入 URL 或磁盘。渲染器仍阻止远程网络请求。
- 参考：[OnlyOffice Zotero 插件](https://github.com/ONLYOFFICE/onlyoffice.github.io/tree/master/sdkjs-plugins/content/zotero)、[Zotero Web API](https://www.zotero.org/support/dev/web_api/v3/basics)、[SuperDoc citations.insert](https://docs.superdoc.dev/document-api/reference/citations/insert/)。未复制 OnlyOffice 源码或图形资源。

## 状态栏（0.3.3）

左侧提供文档大纲开关与正文实时字数；右侧提供缩小、比例、放大，点击比例重置 100%。大纲按标题级别缩进，点击通过 `ui.viewport.scrollIntoView` 定位；没有标题样式时显示空状态。

文档区域支持 Ctrl／⌘＋滚轮和 Chromium 触控板捏合事件缩放（25%–300%），普通滚轮保留滚动。只调整文档缩放，不改变浏览器界面缩放，不标记文档已修改。字数读取完整正文投影，中文逐字计数，英文／数字按词计数，不计空白和标点；不声称与 Microsoft Word 的复杂修订／域统计口径完全相同。

### 本机字体替代（0.3.5）

打开文档前加载本机字体别名：宋体／SimSun、黑体／SimHei、楷体／KaiTi（含 GB2312 名称）优先使用原字体；缺失时分别寻找本机宋体类、黑体类、楷体类字体。没有同类字体时继续按衬线／非衬线类别回退。其他缺失字体根据 `word/fontTable.xml` 的 family、pitch 和 PANOSE 信息，选择本机衬线、非衬线或等宽字体；无法判断类别时报告缺失，不臆测类别。

替代通过浏览器 `FontFace` 的 `local()` 加载，不下载或附带系统字体，不改写 DOCX 中的原字体名称。底部「字体替代」按钮显示缺失字体及替代名称。替代字体的字形、字宽和分页可能不同；安装原字体后重启应用可恢复原字体优先。若系统连候选类别字体也不可用，则保留浏览器最终回退并报告缺失。

当前 SuperDoc 2.12.0 的独立 `eastAsia` 字体渲染另有限制：在中文声明为宋体、西文声明为 Arial 的复现样本中，引擎仍使用 Arial 的中文回退。上述替代处理只作用于引擎实际采用的字体名称，不能保证修正这个独立问题；分项字体的 DOCX 保存已验证，不能等同于显示一致。

字体设置在没有文字选区时自动选择全部正文（含正文中的表格文字），直接打开设置窗口并标明应用范围；已有选区时保留原范围。页眉、页脚及批注不属于自动全选的正文范围。
