# 应用图标

使用内置 imagegen 生成折角文档与青蓝紫蝴蝶图案，参考 SuperDoc 标志的元素与配色。源图保存在 `build/icon-source.png`，无文字；最终采用全幅浅蓝实色背景，没有模拟透明棋盘格。

## 平台资源

| 用途 | 文件 | 尺寸 |
| --- | --- | --- |
| macOS Finder / Dock | `build/icon.icns` | 16、32、64、128、256、512、1024；iconset 包含标准 @2x 配对 |
| Windows EXE / 安装器 / 任务栏 | `build/icon.ico` | 16、20、24、32、40、48、64、96、128、256 |
| Linux 桌面 / 启动器 | `build/icons/` | 16、24、32、48、64、96、128、256、512、1024 |
| Electron 窗口图标 | `build/icon.png` | 1024 |
| 浏览器 favicon | `public/favicon.png` | 64 |

Windows 的 20、24、40、48 等尺寸用于常见 DPI 缩放下的系统图标槽位。Linux 打包配置指向多尺寸 PNG 目录。各资源从高分辨率源图分别缩小生成，避免从较小文件逐级放大。

构建时直接使用已提交的图标资源，不要求 Windows/Linux 安装 macOS 工具。修改源图后，可在 macOS 运行 `npm run icons` 重新生成；转换脚本使用系统 sips/iconutil，并将 PNG 图像封装为 ICO。

## 最终生成提示词

Generate a single finished square desktop app icon, 1024 by 1024. OPAQUE FULL-BLEED PALE ICE BLUE BACKGROUND, covering every pixel all the way to all four corners. No outer margin, NO checkerboard, NO transparency, NO rounded-square container, NO gray grid. Center a folded white document page with two azure text lines, with a bold elegant butterfly overlapping the lower-right of the paper. Four smooth dimensional wings cyan and azure on the left, royal blue violet purple on the right. Beautiful clean macOS-inspired dimensional icon, crisp simplified silhouette. Paper and butterfly occupy 80 percent of image, subtle blue shadows, no lettering or wordmark. Palette references SuperDoc logo: document paper cyan blue and violet butterfly. Actual icon artwork only.
