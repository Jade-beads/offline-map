# Loca 海量数据图层说明

Loca 是独立于普通 AMap 覆盖物的一条海量数据渲染通道。当前项目把它放在 `src/loca`，不放进 `src/map`，这样普通点线面覆盖物和 Loca 可视化图层可以各自演进。

## 适用场景

优先使用 `locaActions`：

- 大量点位散点，例如几百到几万条网点、设备、告警点。
- 热力图，例如按接口返回的 `value` 字段渲染热度。
- 网格热力图，例如按固定网格聚合展示密度。
- Loca 支持的线、面可视化。

继续使用 `mapActions`：

- 少量点线面覆盖物。
- 需要精确操作单个 Marker、Polyline、Polygon。
- 需要点位 HTML、图片图标、高亮、单覆盖物事件等普通覆盖物能力。

## 文件结构

```text
src/loca/loca-store.js                Loca 状态、命令和对外 actions
src/loca/loca-controller.js           Loca 命令消费和图层生命周期
src/loca/loca-layer-registry.js       GeoJSON 到 Loca Layer 的封装
src/examples/loca-feature-examples.js Loca 功能按钮示例，可按需删除
```

`AmapMap.vue` 只做一件事：地图初始化成功后读取静态脚本注入的 `window.Loca`，创建 `Loca.Container({ map })`，然后消费 `locaActions` 发出的命令。

## 离线资源

`public/index.html` 中静态引入：

```text
<script src="<%= BASE_URL %>amap/Loca.js"></script>
```

构建后会复制到：

```text
dist/amap/Loca.js
```

## 渲染入口

```js
import { locaActions } from '@/loca/loca-store'

locaActions.renderGeoJSONLayer({
  layerId: 'bank-mass',
  type: 'point',
  visible: true,
  layerOptions: {
    zIndex: 12,
    opacity: 0.92,
    blend: 'lighter'
  },
  style: {
    radius: 5,
    color: '#1677ff'
  }
}, geoJSON)
```

参数说明：

- `layerId`：业务图层唯一标识。后续显隐、清除、查询信息都靠它。
- `type`：Loca 图层类型。当前封装支持 `point`、`heatmap`、`grid`、`polygon`、`line`、`scatter`、`icon`。
- `visible`：首次渲染后是否显示。
- `layerOptions`：传给 Loca 图层构造器的配置，例如 `zIndex`、`opacity`、`blend`、`zooms`。
- `style`：传给 Loca `layer.setStyle()` 的样式配置。
- `category`：当传入的是未包装的 GeoJSON Geometry 时，可作为默认 `properties.category`。
- `properties`：当传入的是未包装 Geometry 时，合并为默认 `properties`。

`geoJSON` 可以是 `FeatureCollection`、单个 `Feature`、单个 Geometry，或这些对象的数组。推荐业务接口侧最终整理成标准 `FeatureCollection`。

## 图层类型

```text
type: 'point'    -> Loca.PointLayer
type: 'heatmap'  -> Loca.HeatMapLayer
type: 'grid'     -> Loca.GridLayer
type: 'polygon'  -> Loca.PolygonLayer
type: 'line'     -> Loca.LineLayer
type: 'scatter'  -> Loca.ScatterLayer
type: 'icon'     -> Loca.IconLayer
```

如果不传 `type`，封装会根据 GeoJSON 几何类型推断：点为 `point`，线为 `line`，面为 `polygon`。热力图、网格图必须显式传 `type`。

## 海量点示例

```js
async function renderBankMassPoints() {
  const list = await fetch('/api/bank-points').then((res) => res.json())

  const geoJSON = {
    type: 'FeatureCollection',
    features: list.map((item) => ({
      type: 'Feature',
      id: item.id,
      properties: {
        id: item.id,
        name: item.name,
        category: item.category,
        value: item.value
      },
      geometry: {
        type: 'Point',
        coordinates: [item.lng, item.lat]
      }
    }))
  }

  locaActions.renderGeoJSONLayer({
    layerId: 'bank-mass',
    type: 'point',
    visible: true,
    layerOptions: {
      zIndex: 12,
      opacity: 0.92,
      blend: 'lighter'
    },
    style: {
      radius: (index, feature) => feature.properties.category === 'branch' ? 6 : 4,
      color: (index, feature) => feature.properties.category === 'atm' ? '#16a34a' : '#1677ff',
      borderWidth: 0,
      blurWidth: 0.65
    }
  }, geoJSON)
}
```

## 热力图示例

```js
locaActions.renderGeoJSONLayer({
  layerId: 'bank-heat',
  type: 'heatmap',
  visible: true,
  layerOptions: {
    zIndex: 8,
    opacity: 0.86
  },
  style: {
    radius: 32,
    unit: 'px',
    height: 0,
    value: (index, feature) => feature.properties.value,
    gradient: {
      0.2: '#22d3ee',
      0.45: '#84cc16',
      0.7: '#facc15',
      1: '#ef4444'
    }
  }
}, geoJSON)
```

## 150 米网格热力图示例

```js
locaActions.renderGeoJSONLayer({
  layerId: 'bank-grid',
  type: 'grid',
  visible: true,
  layerOptions: {
    zIndex: 10,
    opacity: 0.78,
    hasSide: false
  },
  style: {
    unit: 'meter',
    radius: 150,
    gap: 0,
    height: 0,
    color: (index, feature) => {
      const value = feature.properties.value
      if (value > 75) return '#ef4444'
      if (value > 45) return '#f59e0b'
      return '#14b8a6'
    }
  }
}, geoJSON)
```

## 显隐和清除

控制整个 Loca 图层：

```js
locaActions.setLayerVisible('bank-mass', false)
locaActions.setLayerVisible('bank-mass', true)
```

控制图层内分类：

```js
locaActions.setLayerCategoryVisible('bank-mass', 'atm', false)
locaActions.setLayerCategoryVisible('bank-mass', 'atm', true)
```

清除图层：

```js
locaActions.clearLayer('bank-mass')
```

清除全部 Loca 图层：

```js
locaActions.clearAllLayers()
```

## 样式更新和视野定位

更新整个 Loca 图层样式：

```js
locaActions.setLayerStyle('bank-mass', {
  radius: 7,
  color: '#f97316'
})
```

定位到当前图层范围：

```js
locaActions.fitLayerView('bank-mass', {
  padding: [80, 80]
})
```

查询 Loca 图层信息：

```js
const layers = locaActions.getLayerList()
const layerInfo = locaActions.getLayerInfo('bank-mass')
```

返回信息包含：

```text
layerId
visible
type
locaLayer
featureCount
visibleFeatureCount
categories
hiddenCategories
geometryKinds
style
layerOptions
updatedAt
```

## 当前按钮示例

页面左下角功能演示中新增了这些按钮：

```text
Loca海量点
Loca热力
Loca网格
隐藏网点
显示网点
清除Loca
Loca信息
```

示例代码在 `src/examples/loca-feature-examples.js`，它只调用 `locaActions`，不依赖 `src/map` 内部实现，后续可以直接删除或替换成真实业务接口调用。
