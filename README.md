已按简明技术中文原则编写。

# 山野有数 · 体感一致配速表

纯前端单页应用。选择 GPX，填写完赛时间和发枪时间，生成越野配速计划。其他设置位于默认收起的 Advanced options（高级选项）。

GPX 解析、高程修复、站点定位、配速计算和文件导出全部在浏览器内完成。GPX 不上传到服务器。浏览器使用 Web Worker 计算，45 秒超时后终止任务并保留所选文件。

## 本地预览

在项目根目录执行：

```bash
make serve
```

打开 <http://127.0.0.1:8765>。命令使用 Python 静态文件服务器，计算过程不依赖 Python。任意支持 HTTPS 的静态托管服务都能运行 `web/`。本地预览使用 `localhost` 或 `127.0.0.1`，供浏览器启用 Web Crypto 和 Service Worker。

页面首次成功缓存后支持断网刷新、选择 GPX、生成表格和下载。浏览器可能清除缓存，首次访问仍需联网。应用不依赖在线字体、地图或第三方计算接口。

## 使用

1. 选择不超过 12 MB 的 GPX。
2. 填写目标时间，例如 `12:00`。
3. 填写比赛当地的发枪时间，例如 `06:00`。
4. 点击「生成配速表」。
5. 下载 SVG、PNG、CSV，或打印表格。

目标时间支持超过 24 小时。默认生成五档方案，相邻间隔 30 分钟。最短方案不大于 0 时，减小间隔或选择「仅目标方案」。

## 默认计算口径

| 设置 | 默认值 |
| --- | --- |
| 高程平滑窗口 | 100 m，按沿程距离加权平均 |
| 峰谷反转阈值 | 10 m，平滑后应用 |
| 爬升系数 | 每爬升 100 m 增加 1 等效 km |
| 距离翻倍的平均配速增幅 | 8% |
| 停站时间 | 0，可逐站修改 |
| 发枪时间 | 必填，默认留空，使用比赛当地时间 |
| 括号内容 | 到站钟点（当地时间），可切换为区间配速 |
| 参考水量 | 700 ml / 10 等效 km，仅用于赛段比较 |

高程缺口按距离插值，首尾缺口使用最近有效高程。结果展示修复数量。整条路线缺少高程时停止计算。

多条路线需要选择。重复经过或偏离超过 100 m 的站点需要确认。没有站点时默认列出起终点，也支持手动添加站点。

「且听风吟60K.gpx」的 CP10 沿用已确认的第一次经过位置。选择绑定原文件 SHA-256。其他文件需要单独确认。

水平距离保持原始轨迹口径，不按文件名缩放。原始 GPX 不修改。目标时间包含停站时间。未填写的关门时间不校核。

## 部署

部署目录为 `web/`，无需构建或安装依赖。发布时只上传静态目录，不上传 GPX、历史结果和凭据。

Cloudflare Pages 的部署命令如下。执行前配置具有目标账户 Pages 编辑权限的 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`。

```bash
npx wrangler@4 pages deploy web --project-name trail-running-pacer-sheet
```

当前域名为 <https://trail-running-pacer-sheet.million-ai.com>，已绑定 Cloudflare Pages。项目地址为 <https://trail-running-pacer-sheet.pages.dev>。域名 CNAME 指向 `trail-running-pacer-sheet.pages.dev`。

Mac 上的旧静态服务已停止，并关闭自动启动。线上访问不再依赖 Mac 或 Tunnel。

静态资源改变时，同步升级 HTML、Worker 和 Service Worker 中的资源版本参数。升级 Service Worker 的缓存版本。已有页面重新访问后安装新版缓存。

## 验证

```bash
make test
make check
```

开发验证需要 Python 3.10+ 和 Node.js 22+。Python 版本用于算法对照，线上不运行计算后端。

`make test` 执行 12 项 Python 测试和 23 项 JavaScript 测试。JavaScript 测试包含 17 项算法对照、4 项时间标注和 2 项缓存验证。对照测试逐站比较距离、爬升下降、水量、停站、配速和累计时间，容差为 `0.00001`。距离和爬升单位为 m，时间单位为 s。

浏览器截图与断网证据见 [artifacts/frontend-verification.md](artifacts/frontend-verification.md)。

## 文件

- `web/app.js`：文件读取、XML 检查、页面交互和导出操作。
- `web/pace-engine.js`：高程处理、站点定位和配速算法。
- `web/pace-time.js`：网页与导出表共用的耗时、钟点和配速标注。
- `web/pace-worker.js`：后台线程入口。
- `web/pace-svg.js`：保留坡度分布、分段高程图和彩色单元格的 SVG 导出器。
- `web/service-worker.js`：静态资源缓存。
- `app.py`：保留的 Python 对照实现，线上不使用。
- `tests/`：输入测试和跨语言算法对照。
- `design/hand-drawn-design-guide.md`：设计指南。

这是一套基于体感一致思路的独立实现。模型未计入技术路面、天气与个人肌力差异。目标时间不代表能力评估。

已遵循简明技术中文原则。
