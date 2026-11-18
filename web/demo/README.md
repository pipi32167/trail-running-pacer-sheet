# 地图投轨迹 · 方案 A / B 演示

同一份 GPX、同一套坡度配色与站点标注，只换渲染引擎与底图。用来在两条技术路线之间做选择。

| 页面 | 内容 |
|---|---|
| `a-leaflet.html` | 方案 A：Leaflet 1.9.4 + 栅格瓦片（OpenTopoMap / OSM / CARTO Voyager） |
| `b-maplibre.html` | 方案 B：MapLibre GL JS 5 + OpenFreeMap 矢量瓦片，可切 4 套样式，可叠山体阴影与 3D 地形 |
| `compare.html` | 并排对比，两侧共享同一视野与缩放（可关） |

打开方式：`make serve` 后访问 <http://127.0.0.1:8765/demo/compare.html>。

## 数据

`route.json` 由 `scripts/build-demo-route.py` 从 `且听风吟60K.gpx` 生成：

```bash
python3 scripts/build-demo-route.py 且听风吟60K.gpx
```

- 30653 个轨迹点抽稀到 901 点（道格拉斯-普克，容差 6 m），27 KB。
- 217 个缺失高程按索引线性插值补齐，与页面口径一致。
- 爬升按 100 m 平滑窗口 + 10 m 峰谷反转阈值统计，得 1917 m（页面算得 1906 m，差值来自边界处理）。
- 距轨迹最近点超过 20 m 的站点会在弹窗里显示实际偏移量（CP4 25 m、CP10 27.8 m、起点 23.7 m）。

## 两个引擎的实测差异

| 项 | A：Leaflet | B：MapLibre |
|---|---|---|
| 库体积（gzip） | 约 42 KB | 约 230 KB |
| 渲染 | DOM/SVG 或 Canvas 2D | WebGL |
| 底图 | 只能换瓦片源，样式由提供方决定 | 矢量样式可全量改色、可隐藏图层 |
| 高清屏 | 需 @2x 瓦片；多数免费源没有，字会糊 | 矢量渲染，任意 DPR 都清晰 |
| 地形 | 底图自带等高线（OpenTopoMap） | 可叠 Terrarium DEM 山体阴影与 3D 倾斜 |
| 中文注记 | 由瓦片烘焙，样式不统一 | 由 OSM name 标签实时排版 |
| 视野换算 | 256 px 瓦片 | 512 px 瓦片，同视野 zoom 少 1（demo 里已换算） |

## 实测到的可达性

本机（国内网络）实测：

- `tile.openstreetmap.org`、`tile.opentopomap.org`：curl 直连 20 s 超时；浏览器内可达（走系统代理）。
- `tiles.openfreemap.org`、`basemaps.cartocdn.com`、`server.arcgisonline.com`、Terrarium S3：直连正常。
- OpenFreeMap 首屏矢量瓦片较慢，需要 10–30 s 才铺满，期间只剩山体阴影。

结论：只做一种底图会在某些网络下白屏，实际产品必须准备第二个源和“图纸模式”降级。

## 已知限制

- 坡度色带按 ±400 m 窗口计算：窗口取 ±100 m 时，900 段在两像素级别交替，肉眼会糊成一条灰线。
- 演示页不进入应用的 Service Worker 缓存清单，离线打不开。
- 瓦片用量遵守各源政策：OpenTopoMap 是志愿服务器，不能当公共底图压测；OSM 官方瓦片禁止 App 级使用。
