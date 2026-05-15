# 项目记忆

## 地图视觉主题

- 点聚合默认主题色：`#B6002A`。
- `mapActions.renderGeoJSONClusterLayer()` 未显式传入 `style.point.color` 或 `style.cluster.color` 时，应使用该主题色。

## 地图加载方案

- 项目继续维护离线高德 JSAPI 方案，不使用 `@amap/amap-jsapi-loader` 动态加载。
- `public/index.html` 通过本地 script 标签加载 `public/amap/AMap3.js`、`public/amap/mapsplugin.js`、`public/amap/render.js` 和 `public/amap/Loca.js`。
- 业务代码只读取 `window.AMap` 和 `window.Loca`，不要直接耦合 `public/amap/` 内部资源路径。
