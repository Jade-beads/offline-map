# 地图工作台结构说明

当前项目是 Vue2 + 高德地图 JSAPI 的地图工作台骨架。项目保留离线 JSAPI 加载、官方默认底图、顶部地图工具和 GeoJSON 图层渲染链路，不再内置业务数据和演示数据。

## 核心链路

```text
业务接口
  -> 转成 GeoJSON FeatureCollection
  -> mapActions.renderGeoJSONLayer(params, geoJSON)
  -> mapStore.commandQueue
  -> AmapMap.vue 按顺序消费命令
  -> MapController.renderLayer(payload)
  -> layer-registry 渲染 AMap 覆盖物
```

海量数据或 Loca 可视化走独立链路：

```text
业务接口
  -> 转成 GeoJSON FeatureCollection
  -> locaActions.renderGeoJSONLayer(params, geoJSON)
  -> locaStore.commandQueue
  -> AmapMap.vue 按顺序消费 Loca 命令
  -> LocaController.renderLayer(payload)
  -> loca-layer-registry 渲染 Loca 图层
```

## 关键文件

```text
src/components/MapWorkspace.vue       页面壳和顶部地图工具
src/components/AmapMap.vue            地图初始化、官方默认底图、地图状态同步
src/examples/map-feature-examples.js  功能演示示例，只调用 mapActions，可按需删除
src/examples/loca-feature-examples.js Loca 海量数据演示，只调用 locaActions，可按需删除
src/map/map-store.js                  地图状态和命令分发
src/map/map-controller.js             高德地图操作入口
src/map/layer-registry.js             GeoJSON 到覆盖物的渲染注册
src/map/style-resolver.js             GeoJSON 样式协议解析
src/loca/loca-store.js                Loca 命令分发和图层信息
src/loca/loca-controller.js           Loca 容器与图层生命周期
src/loca/loca-layer-registry.js       GeoJSON 到 Loca 图层的渲染注册
```

## 文档索引

```text
project-architecture.md               项目结构、离线加载、部署配置
map-controller-api.md                 mapActions 与 MapController 命令说明
map-geojson-layer-protocol.md         GeoJSON 数据结构、显隐、定位示例
map-style-protocol.md                 点线面、图片、动态样式、热力图示例
loca-mass-data-layer.md               Loca 海量点、热力、网格图层使用说明
```

## 当前范围

- 保留顶部搜索、测距、绘图、自定义标点、缩放工具。
- 保留 GeoJSON 点、线、面、热力图样式协议入口。
- `src/examples` 只放可删除的功能演示，不进入 `src/map` 地图内核。
- `src/loca` 是独立的 Loca 海量数据通道，不把 Loca 逻辑混进 `src/map`。
- 不再内置 mock 接口、业务初始数据和在线 JSAPI 加载逻辑。
- `map-store` 只负责地图状态和命令分发，不缓存接口返回的业务数据。

## 离线 JSAPI 加载

项目完全使用离线高德 JSAPI 包，不使用 `@amap/amap-jsapi-loader`，也不再通过源码里的动态 loader 拉取 JSAPI。

当前入口在 `public/index.html` 中静态引入：

```text
public/amap/AMap3.js
public/amap/plugin.js
public/amap/Loca.js
```

`AmapMap.vue` 初始化时直接读取：

```js
const AMap = window.AMap
const Loca = window.Loca
```

`.env` 当前只保留 `VUE_APP_PUBLIC_PATH`，用于控制构建后的静态资源前缀。

## 官方默认底图

地图初始化时不再创建自定义 `AMap.TileLayer`，也不再读取本地瓦片服务配置。

`AmapMap.vue` 只调用：

```js
new AMap.Map(container, {
  zoom,
  center
})
```

不传 `layers` 时，高德 JSAPI 会创建官方默认底图。业务图层仍然通过 `mapActions.renderGeoJSONLayer(params, geoJSON)` 渲染到地图上。

## 注入地图数据

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank',
  visible: true,
  selection: {
    type: 'bank',
    id: 'bank-001'
  }
}, geoJSON)
```

`geoJSON` 必须是 `FeatureCollection`。地图层只消费 GeoJSON 和样式协议，不直接适配后端原始字段。

## 最小业务接入示例

业务层从接口获取数据后，整理成 GeoJSON，再调用地图渲染入口：

```js
async function renderBankLayer() {
  const response = await fetch('/api/bank-branches')
  const branches = await response.json()

  const geoJSON = {
    type: 'FeatureCollection',
    features: branches.map((item) => ({
      type: 'Feature',
      id: item.id,
      properties: {
        id: item.id,
        name: item.name,
        category: item.category,
        shortName: item.shortName
      },
      geometry: {
        type: 'Point',
        coordinates: [item.lng, item.lat]
      }
    }))
  }

  mapActions.renderGeoJSONLayer({
    layerId: 'bank',
    visible: true,
    style: {
      point: {
        renderer: 'pin',
        textField: 'shortName',
        size: 30
      }
    }
  }, geoJSON)
}
```

控制整个图层：

```js
mapActions.setLayerVisible('bank', false)
mapActions.setLayerVisible('bank', true)
```

控制图层内分类：

```js
mapActions.setLayerCategoryVisible('bank', 'atm', false)
```

详细协议见：

- [map-controller-api.md](./map-controller-api.md)
- [map-geojson-layer-protocol.md](./map-geojson-layer-protocol.md)
- [map-style-protocol.md](./map-style-protocol.md)

## 内网部署检查

```text
1. 确认 public/amap/AMap3.js 存在
2. 确认 public/amap/Loca.js 存在
3. 确认 public/amap/2.0.1 与 init.js 保持在同一目录
4. 如果使用其他插件包，确认对应入口仍保留在 public/amap 中
5. 构建后检查 dist/amap 是否包含同样的离线资源
6. 使用官方默认底图时，浏览器 Network 会出现高德官方底图资源请求
```

## 离线无官方底图模式

当前项目不再使用高德官方默认底图。`AmapMap.vue` 初始化时显式传入：

```js
{
  layers: [],
  features: [],
  showLabel: false,
  showIndoorMap: false
}
```

这会保留 AMap 坐标、覆盖物、事件和 Loca 能力，但不会创建官方默认底图层，也不会主动加载官方底图样式、字形、图标和瓦片数据。底图和默认图层应由内网本地资源或业务系统单独提供。

离线包 `public/amap/AMap3.js` 已移除 `web/init`、初始化监控上报和 `maps/checkredirect` 探测，默认 logo 图片改为透明内联资源，避免内网启动时访问高德外网。`public/amap/Loca.js` 已关闭 `/count` 统计上报。`public/amap/plugin.js` 作为本地静态文件加载，用于注册 `WebGLRender` 等模块，避免运行时请求 `mapsplugincdn`。
