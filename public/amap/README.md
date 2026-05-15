# AMap 离线静态资源说明

这个目录保存项目当前使用的高德离线 JSAPI、插件和 Loca 静态资源。应用通过 `public/index.html` 的本地 `script` 标签加载这些文件，业务代码只消费 `window.AMap` 和 `window.Loca`。

## 当前入口资源

`public/index.html` 默认按顺序加载以下文件：

- `AMap3.js`：高德 JSAPI 主入口，负责暴露 `window.AMap`。
- `mapsplugin.js`：项目常用 AMap 插件集合，例如测距、绘图、编辑、热力、聚合、MVT 等能力。
- `render.js`：离线包运行时依赖的渲染相关资源。
- `Loca.js`：高德 Loca 可视化能力，负责暴露 `window.Loca`。

## 配套资源

- `2.0.1/`：离线 JSAPI 运行时可能引用的样式、图标、字体或内部资源。
- `assets/`：AMap/Loca 运行时可能引用的图片、样式和插件静态资源。

这些目录属于离线包的一部分，不要因为业务代码没有直接 import 就删除。

## 维护规则

- 不在业务代码中直接引用这个目录下的内部资源文件。
- 不使用 `@amap/amap-jsapi-loader` 动态加载 JSAPI。
- 不把 `webapi.amap.com` 作为默认 JSAPI 加载入口。
- 如果新增 AMap 插件能力，先确认当前离线包是否已包含该插件；缺失时应补齐离线包，而不是在业务代码里堆兜底逻辑。
- 不新增无依据的“离线兜底”补丁；遇到 SDK 能力缺失时，给出明确提示并按能力边界处理。
