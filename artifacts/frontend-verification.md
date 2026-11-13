已按简明技术中文原则编写。

# 纯前端改造验证

验证日期：2026-11-10。

## 计算结果

`make test` 通过 10 项 Python 测试和 15 项 JavaScript 对照测试。JavaScript 对照测试通过 Python 实现生成预期值，并通过公共计算入口逐项比较。

比较字段包括路线距离、爬升下降、逐站里程、等效距离、水量、停站、累计用时、配速和高程曲线。数值容差为 `0.00001`，长度单位为 m，时间单位为 s。

「且听风吟60K.gpx」的结果为 55.31 km、爬升约 1906 m、下降约 1905 m。修复数量为 217。CP10 使用第一次经过的 47.76857 km。五档终点时间准确。

算法测试覆盖缺失高程、多路线和手动站点。测试还覆盖停站超过目标、关门超时和超过 24 小时的目标。其他用例包括短目标、非法参数和无效坐标。测试也覆盖不连续轨迹段和跨日期变更线。

## 浏览器验证

使用 ego-browser 操作真实页面。验证依据包括可见表格、浏览器资源请求和截图。

| 场景 | 结果 | 证据 |
| --- | --- | --- |
| 纯静态服务生成 | 显示 55.31 km 与 1906 m，默认收起高级选项 | `frontend-desktop.png` |
| 本地断网刷新和生成 | 断网后重新选择文件，生成 13 小时方案 | `frontend-offline.png`、`frontend-offline-proof.json` |
| 本地断网导出 | SVG、PNG、CSV 下载成功 | `downloads/frontend-offline.*` |
| 公网生成 | 现有域名加载版本化脚本，未调用计算接口 | `frontend-public-desktop.png` |
| 公网手机断网计算 | 12:30 目标生成成功，计算接口请求数为 0 | `frontend-public-mobile-offline.png`、`frontend-public-proof.json` |
| 手机布局 | 390 px 视口下，页面宽度为 390 px，宽表格独立滚动 | `frontend-public-mobile-offline.png` |
| 公网 PNG 导出 | 保留坡度分布、分段高程图和彩色数值格 | `downloads/frontend-native.png` |
| 错误文件后恢复 | 损坏文件和全部缺少高程均显示提示，按钮恢复可用 | 浏览器可见状态检查 |
| 多路线 | 自动展开高级选项，选择第二条后生成约 0.97 km 路线 | `frontend-multiple-track.png` |

应用只有中文界面和既有英文装饰文案，没有语言切换功能。本次没有新增语言支持。45 秒超时终止 Worker 的分支尚未在浏览器中强制触发。

## 部署状态

生产环境已迁到 Cloudflare Pages。Pages 项目为 `trail-running-pacer-sheet`，静态目录为 `web/`。域名 CNAME 指向 `trail-running-pacer-sheet.pages.dev`，绑定状态为 `active`。

Mac 上的旧静态服务已停止，并关闭自动启动。停用本地服务后，自定义域名仍返回 HTTP 200。浏览器绕过 Service Worker 和 HTTP 缓存后，重新读取 GPX 并生成表格成功。

Pages 公网页面显示 55.31 km、爬升约 1906 m。五档终点时间准确，计算接口请求数为 0。截图为 `pages-custom-domain.png`，验证数据为 `pages-proof.json`。

Cloudflare 曾缓存旧版 `app.js`。资源使用 `frontend-v3` 版本参数后，公网页面已加载浏览器计算版本。

## 文件

- [桌面截图](frontend-public-desktop.png)
- [手机断网截图](frontend-public-mobile-offline.png)
- [公网断网证据](frontend-public-proof.json)
- [导出表格](downloads/frontend-native.png)

已遵循简明技术中文原则。
