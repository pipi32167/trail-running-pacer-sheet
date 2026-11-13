已按简洁原则编写。

# 项目约定

- 在项目根目录执行 `make serve`，浏览器访问 `http://127.0.0.1:8765`。这是静态预览服务，线上只需部署 `web/`，计算全部在浏览器内完成。
- 浏览器计算核心为 `web/pace-engine.js`，通过 Web Worker 执行。Python 的 `app.py` 与项目内 even-effort-pace-chart skill 保留为测试对照，移植算法时必须保持结果一致。
- 默认采用 100 m 爬升平滑窗口与 10 m 峰谷反转阈值，不为匹配某个爬升总量自动调参。
- 特定路线已确认的站点位置必须绑定源文件 SHA-256，不能用于其他文件。
- GPX 仅在浏览器内处理，禁止向服务端发送路线内容。原始 GPX 和 `output/` 历史结果不覆盖。静态部署只发布 `web/`。
- 修改静态资源时升级 `web/service-worker.js` 的缓存版本，保证断网缓存包含全部 Worker 依赖。
- 页面要求 GPX、目标完赛时间和发枪时间。发枪时间默认留空，填写后才能生成。可选参数放在默认收起的高级选项。
- 样式依据 `design/hand-drawn-design-guide.md`，使用其中的颜色、字体与控件令牌。

## Testing

- 执行 `make test` 检查 Python 输入行为和 JavaScript 与 Python 的逐站结果一致性，执行 `make check` 检查语法。
- 修改行为时，先写失败测试并看到红色结果，再实现至绿色；通过后才重构。
- 测试通过 `process_request` 公共入口断言结果，不依赖内部调用顺序。
- 浏览器验收使用 ego-browser，并将截图保存在 `artifacts/`。

已遵循简洁原则。
