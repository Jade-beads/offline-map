# AMap 静态资源说明

这个目录保留高德 JSAPI 的内网静态资源。项目当前不再维护“完全离线可用”目标，但仍通过 `public/index.html` 中的 `script` 标签注入 AMap/Loca 能力，业务代码只消费 `window.AMap` 和 `window.Loca`。

## 当前入口资源

`public/index.html` 默认加载以下文件：

- `AMap3.js`：高德 JSAPI 主入口，负责暴露 `window.AMap`。
- `mapsplugin.js`：项目常用 AMap 插件集合，例如绘图、编辑、热力、聚合等能力。
- `Loca.js`：高德 Loca 可视化能力，负责暴露 `window.Loca`。

## 历史保留资源

以下资源暂时保留，但默认入口不主动加载：

- `render.js`：历史 WebGLRender 相关资源，当前不作为默认依赖。
- `2.0.1`：历史样式/资源文件，保留用于兼容排查。
- `assets/`：AMap/Loca 运行时可能引用的图片、样式和插件静态资源。

## 维护规则

- 不在业务代码中直接引用这个目录下的内部资源文件。
- 如果 JSAPI 部署地址从应用本地目录切换到内网固定域名，只改 `public/index.html` 的 `script src`。
- 如果新增 AMap 插件能力，优先确认内网 JSAPI 包是否已包含该插件，再更新 `public/index.html` 或内网包。
- 不再新增“离线兜底”补丁；遇到 SDK 能力缺失时，明确提示当前 AMap/Loca SDK 不支持。
