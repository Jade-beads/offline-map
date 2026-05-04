# 地图能力方法说明

本文档描述当前项目对外使用的 `mapActions` 与 `locaActions`。业务侧优先调用 actions，不直接操作 `AMap.Map`、覆盖物实例或 Loca layer。

示例代码集中放在：

- `src/examples/map-feature-examples.js`
- `src/examples/loca-feature-examples.js`
- `src/examples/action-method-demos.js`

这些示例文件与 `src/map`、`src/loca` 隔离，可以按需删除或替换成真实接口调用。

## 调用链路

```text
业务组件 / 示例按钮
  -> mapActions 或 locaActions
  -> commandQueue
  -> AmapMap.vue
  -> MapController / LocaController
  -> AMap 覆盖物 / Loca 图层
```

`renderGeoJSONLayer(params, geoJSON)` 的既有用法保持不变。

## mapActions

### setActiveTool(toolId)

使用场景：更新当前激活工具状态，例如测距、绘图、自定义标点。

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `toolId` | `string` | 工具 id，例如 `ruler`、`draw:polygon` |

示例：

```js
mapActions.setActiveTool('ruler')
```

### dispatchMapCommand(type, payload)

使用场景：内部命令派发入口。业务层通常不直接调用，除非需要临时验证底层命令。

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `type` | `string` | 命令类型 |
| `payload` | `any` | 命令参数 |

示例：

```js
mapActions.dispatchMapCommand('zoom:in')
```

### clearHandledCommands(seq)

使用场景：`AmapMap.vue` 消费命令队列后清理历史命令。业务层不建议直接调用。

示例：

```js
mapActions.clearHandledCommands(12)
```

### setLayerInfo(layerId, info)

使用场景：Controller 同步图层元信息到 store。业务层不建议直接调用。

示例：

```js
mapActions.setLayerInfo('bank', {
  visible: true,
  featureCount: 20
})
```

### removeLayerInfo(layerId)

使用场景：Controller 清除图层时同步删除元信息。业务层不建议直接调用。

示例：

```js
mapActions.removeLayerInfo('bank')
```

### clearLayerInfo()

使用场景：清空普通地图图层元信息，通常由销毁或重置流程使用。

示例：

```js
mapActions.clearLayerInfo()
```

### getLayerList()

使用场景：获取当前所有普通图层信息，用于图层面板、调试面板。

返回：`Array<LayerInfo>`

示例：

```js
const layers = mapActions.getLayerList()
```

### getLayerInfo(layerId)

使用场景：读取某个图层的可见状态、分类、要素数量等。

示例：

```js
const layer = mapActions.getLayerInfo('bank')
```

### getFeatureInfo(layerId, featureId)

使用场景：右侧列表点击前读取某个要素的元信息。

示例：

```js
const feature = mapActions.getFeatureInfo('bank', 'bank-001')
```

### activateRuler()

使用场景：启用测距工具。

示例：

```js
mapActions.activateRuler()
```

### clearRuler()

使用场景：关闭并清除测距覆盖物。

示例：

```js
mapActions.clearRuler()
```

### restartRuler()

使用场景：重新开始一次测距。

示例：

```js
mapActions.restartRuler()
```

### activateDraw(shape)

使用场景：启用绘图工具。

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `shape` | `rectangle | circle | polygon` | 绘制类型 |

示例：

```js
mapActions.activateDraw('polygon')
```

绘制完成后，地图层会自动把结果写入 `mapStore.drawResult`。业务组件不需要直接访问 `AMap.MouseTool`：

```js
import { mapActions, mapStore } from '@/map/map-store'

export default {
  data() {
    return {
      mapStore
    }
  },
  watch: {
    'mapStore.drawResult'(result) {
      if (!result) return

      console.log(result.shape)
      console.log(result.geoJSON)
      console.log(result.bounds)
      console.log(result.thumbnail)
    }
  },
  methods: {
    drawPolygon() {
      mapActions.clearDrawResult()
      mapActions.activateDraw('polygon')
    }
  }
}
```

`drawResult` 字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `shape` | `rectangle | circle | polygon` | 绘制类型 |
| `geoJSON` | `Feature` | 绘制结果。矩形/多边形为 `Polygon`，圆形为带 `properties.radius` 的 `Point` |
| `bounds` | `object | null` | `{ southWest, northEast }` 边界信息 |
| `thumbnail` | `string` | 地图 canvas 截图，base64 png |
| `thumbnailError` | `string` | 截图失败原因，常见于跨域瓦片导致 canvas 被污染 |

### clearDrawResult()

使用场景：开始新一轮绘制前清空上一次绘制结果。

示例：

```js
mapActions.clearDrawResult()
mapActions.activateDraw('rectangle')
```

### activateCustomMarker()

使用场景：下一次点击地图时添加一个临时自定义点。

示例：

```js
mapActions.activateCustomMarker()
```

### zoomIn() / zoomOut()

使用场景：放大或缩小地图。

示例：

```js
mapActions.zoomIn()
mapActions.zoomOut()
```

### searchCoordinate(keyword)

使用场景：按经纬度字符串定位。当前不做 POI 或地址搜索。

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `keyword` | `string` | 形如 `117.2272,31.8206` |

示例：

```js
mapActions.searchCoordinate('117.2272,31.8206')
```

### renderGeoJSONLayer(params, geoJSON)

使用场景：普通 AMap 覆盖物渲染入口，支持点、线、面、热力图。

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `params.layerId` | `string` | 图层唯一 id |
| `params.visible` | `boolean` | 初始是否显示 |
| `params.style` | `object` | 图层样式 |
| `params.events` | `object` | 普通覆盖物事件入口，支持 `click`、`mouseover`、`mouseout`，也支持 `hover` 作为 `mouseover` 的别名 |
| `params.hoverStyle` | `object` | 鼠标移入时的临时高亮样式，结构与 `style` 一致 |
| `params.clickStyle` | `object` | 鼠标点击后的选中高亮样式，结构与 `style` 一致；点击下一个要素会替换上一个选中态 |
| `params.category` | `string` | 未包装 Geometry 的默认分类 |
| `params.properties` | `object` | 未包装 Geometry 的默认属性 |
| `params.selection` | `object` | 渲染后自动聚焦的 `{ type, id }` |
| `geoJSON` | `FeatureCollection | Feature | Geometry | Array` | 业务接口返回或前端整理后的数据 |

示例：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank',
  visible: true,
  style: {
    point: {
      renderer: 'pin',
      color: '#1677ff',
      size: 30
    }
  }
}, geoJSON)
```

事件和交互高亮示例：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank',
  visible: true,
  style: {
    point: {
      renderer: 'pin',      // 默认点位样式
      color: '#1677ff',
      size: 30,
      zIndex: 80
    }
  },
  hoverStyle: {
    point: {
      color: '#f59e0b',     // 鼠标移入时的点位颜色
      size: 36,             // 鼠标移入时的点位大小，单位：像素
      zIndex: 130           // 鼠标移入时抬高层级，避免被其他覆盖物遮挡
    },
    line: {
      strokeColor: '#f59e0b',
      strokeWeight: 6
    },
    polygon: {
      fillColor: '#f59e0b',
      fillOpacity: 0.28,
      strokeColor: '#f59e0b',
      strokeWeight: 4
    }
  },
  clickStyle: {
    point: {
      color: '#dc2626',     // 点击选中后的点位颜色
      size: 40,             // 点击选中后的点位大小，单位：像素
      zIndex: 140
    }
  },
  events: {
    click(feature, event) {
      // feature 是当前 GeoJSON Feature
      // event.featureId / event.category / event.properties 可直接用于右侧详情面板
      console.log('click', event.featureId, event.properties)
    },
    mouseover(feature, event) {
      console.log('hover', event.featureId)
    },
    mouseout(feature, event) {
      console.log('leave', event.featureId)
    }
  }
}, geoJSON)
```

如果点位使用自定义 HTML，也可以在交互样式中替换 HTML 内容，从而通过 CSS class 达到高亮效果：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank-html',
  visible: true,
  style: {
    point: {
      renderer: 'html',
      html: '<i class="bank-marker"></i>',
      size: [28, 28]
    }
  },
  hoverStyle: {
    point: {
      renderer: 'html',
      html: '<i class="bank-marker bank-marker--hover"></i>',
      size: [36, 36],
      zIndex: 130
    }
  },
  clickStyle: {
    point: {
      renderer: 'html',
      html: '<i class="bank-marker bank-marker--active"></i>',
      size: [40, 40],
      zIndex: 140
    }
  }
}, geoJSON)
```

`renderer: 'html'` 时，`size` 会作为外层 HTML marker 容器宽高，同时用于计算 `offset`。一般不需要再传 `anchor: 'center'`；如果强行同时传 `anchor` 和 `offset`，不同离线包实现可能会出现重复偏移。

Point 使用 `renderer: 'circle'` 时，会把点位渲染成 `AMap.Circle`，常用于服务半径、辐射范围、缓冲区等场景：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank-radius',
  visible: true,
  style: {
    point: {
      renderer: 'circle',      // 使用圆形覆盖物渲染 Point
      radius: 800,             // 圆半径，单位：米
      fillColor: '#1677ff',    // 圆形填充颜色
      fillOpacity: 0.16,       // 圆形填充透明度，0 完全透明，1 完全不透明
      strokeColor: '#1677ff',  // 圆形边界颜色
      strokeOpacity: 0.85,     // 圆形边界透明度，0 完全透明，1 完全不透明
      strokeWeight: 2,         // 圆形边界线宽，单位：像素
      strokeStyle: 'solid',    // 圆形边界线样式：solid 实线，dashed 虚线
      strokeDasharray: [6, 4], // 虚线配置，表示 6px 线段 + 4px 间隔；仅 strokeStyle 为 dashed 时使用
      zIndex: 20               // 覆盖物层级，数值越大越靠上
    }
  }
}, geoJSON)
```

如果半径来自接口字段，可以使用 `radiusBy`：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank-radius',
  visible: true,
  style: {
    point: {
      renderer: 'circle',          // 使用圆形覆盖物渲染 Point
      radiusBy: {
        field: 'radius',           // 从 feature.properties.radius 读取半径
        default: 800               // radius 字段不存在或不可用时的默认半径，单位：米
      },
      fillColor: '#22c55e',        // 圆形填充颜色
      fillOpacity: 0.14,           // 圆形填充透明度
      strokeColor: '#16a34a',      // 圆形边界颜色
      strokeWeight: 2              // 圆形边界线宽，单位：像素
    }
  }
}, geoJSON)
```

### renderGeoJSONClusterLayer(params, geoJSON)

使用场景：普通 AMap 点聚合入口，适合银行网点、商户点位等较多点数据。底层使用离线包里的 `AMap.MarkerCluster` / `AMap.MarkerClusterer`，默认聚合点使用本地 HTML 样式，不依赖高德线上聚合图片。

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `params.layerId` | `string` | 聚合图层唯一 id |
| `params.visible` | `boolean` | 初始是否显示 |
| `params.style.gridSize` | `number` | 聚合网格大小，单位：像素 |
| `params.style.maxZoom` | `number` | 大于该缩放级别后不再聚合 |
| `params.style.minClusterSize` | `number` | 形成聚合点的最小点数 |
| `params.style.averageCenter` | `boolean` | 聚合点是否使用平均中心 |
| `params.style.point` | `object` | 单点样式，支持 `renderer: 'pin' | 'html' | 'image'` |
| `params.style.cluster` | `object` | 聚合点样式，支持 `color`、`textColor`、`borderColor`、`size`、`zIndex` |
| `params.events.click` | `function` | 点击单点回调，参数为 `(feature, event)` |
| `params.events.clusterClick` | `function` | 点击聚合点回调，参数为 `(event)` |
| `geoJSON` | `FeatureCollection | Feature | Geometry | Array` | 只会读取 `Point` / `MultiPoint`，线面会自动忽略 |

示例：

```js
mapActions.renderGeoJSONClusterLayer({
  layerId: 'bank-cluster',
  visible: true,
  style: {
    gridSize: 80,          // 聚合网格大小，像素越大越容易聚合
    maxZoom: 16,           // 16 级以上显示散点
    minClusterSize: 2,     // 至少 2 个点才聚合
    averageCenter: true,   // 聚合点使用平均中心
    point: {
      renderer: 'image',
      size: [32, 32],
      image: {
        size: [32, 32],
        imageSize: [32, 32],
        src: ({ properties }) => iconMap[properties.bankType] || iconMap.默认
      },
      zIndex: 90
    },
    cluster: {
      color: '#1677ff',
      textColor: '#ffffff',
      borderColor: '#ffffff',
      size: [46, 46],
      zIndex: 140
    }
  },
  events: {
    click(feature, event) {
      console.log('单点点击', event.featureId, event.properties)
    },
    clusterClick(event) {
      console.log('聚合点点击', event.count, event.clusterData)
    }
  }
}, geoJSON)
```

聚合图层仍然复用通用图层控制方法：

```js
mapActions.setLayerVisible('bank-cluster', false)
mapActions.setLayerCategoryVisible('bank-cluster', '中国银行', false)
mapActions.setFeaturesVisible('bank-cluster', ['9691', '9692'], false)
mapActions.fitLayerView('bank-cluster', { padding: [80, 80] })
mapActions.focusFeature('bank-cluster', '9691')
mapActions.clearLayer('bank-cluster')
```

### setLayerVisible(layerId, visible)

使用场景：控制整个普通图层显示隐藏。

示例：

```js
mapActions.setLayerVisible('bank', false)
mapActions.setLayerVisible('bank', true)
```

### setLayerStyle(layerId, style)

使用场景：不重新传 GeoJSON，只更新整个普通图层样式。

示例：

```js
mapActions.setLayerStyle('region', {
  polygon: {
    fillColor: '#f97316',
    fillOpacity: 0.28,
    strokeColor: '#ea580c',
    strokeWeight: 3
  }
})
```

### setLayerCategoryVisible(layerId, category, visible)

使用场景：控制同一图层内某个分类显示隐藏。

示例：

```js
mapActions.setLayerCategoryVisible('bank', 'atm', false)
mapActions.setLayerCategoryVisible('bank', ['branch', 'atm'], true)
```

### setFeaturesVisible(layerId, featureIds, visible)

使用场景：按要素 id 控制显示隐藏。

示例：

```js
mapActions.setFeaturesVisible('bank', 'bank-001', false)
mapActions.setFeaturesVisible('bank', ['bank-001', 'bank-002'], true)
```

### clearLayer(layerId)

使用场景：清除指定普通图层。

示例：

```js
mapActions.clearLayer('region-boundary')
```

### clearAllLayers()

使用场景：清空所有普通图层，适合页面重置或模块切换。

示例：

```js
mapActions.clearAllLayers()
```

### clearLayerByPrefix(prefix)

使用场景：按图层 id 前缀批量清理，例如行政区边界统一使用 `region-` 前缀。

示例：

```js
mapActions.clearLayerByPrefix('region-')
```

### setFeatureStyle(layerId, featureId, style)

使用场景：修改指定点、线、面的临时样式。

示例：

```js
mapActions.setFeatureStyle('bank', 'bank-001', {
  point: {
    renderer: 'pin',
    color: '#f59e0b',
    size: 36,
    zIndex: 120
  }
})
```

### highlightFeature(layerId, featureId, style)

使用场景：右侧列表点击后高亮对应要素。`style` 不传时使用默认高亮样式。

示例：

```js
mapActions.highlightFeature('bank', 'bank-001')
mapActions.focusFeature('bank', 'bank-001')
```

### clearFeatureStyle(layerId, featureId)

使用场景：取消某个要素的临时样式。

示例：

```js
mapActions.clearFeatureStyle('bank', 'bank-001')
```

### clearLayerFeatureStyles(layerId)

使用场景：取消整个图层的所有临时高亮。

示例：

```js
mapActions.clearLayerFeatureStyles('bank')
```

### focusFeature(layerId, featureId)

使用场景：把指定要素移动到地图视野中。点会 `setZoomAndCenter`，线面会 `setFitView`。

示例：

```js
mapActions.focusFeature('bank', 'bank-001')
```

### fitLayerView(layerId, options)

使用场景：让整个图层进入视野。普通覆盖物和 AMap 热力图都支持。

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options.padding` | `number[]` | `[top, right, bottom, left]` 或 `[vertical, horizontal]` |
| `options.maxZoom` | `number` | 普通覆盖物最大缩放级别 |
| `options.immediately` | `boolean` | 是否立即调整 |

示例：

```js
mapActions.fitLayerView('region', {
  padding: [80, 80],
  maxZoom: 14
})
```

### setViewport(viewportPatch)

使用场景：地图移动、缩放后同步当前视野状态。业务层一般只读 `mapStore.viewport`，不直接调用。

示例：

```js
mapActions.setViewport({
  center: [117.2272, 31.8206],
  zoom: 11
})
```

## locaActions

### dispatchLocaCommand(type, payload)

使用场景：内部命令派发入口。业务层通常不直接调用。

示例：

```js
locaActions.dispatchLocaCommand('loca:layer:visible', {
  layerId: 'bank-mass',
  visible: true
})
```

### clearHandledCommands(seq)

使用场景：`AmapMap.vue` 消费 Loca 命令后清理历史命令。

示例：

```js
locaActions.clearHandledCommands(5)
```

### setLayerInfo(layerId, info) / removeLayerInfo(layerId) / clearLayerInfo()

使用场景：LocaController 同步图层元信息。业务层通常不直接调用。

示例：

```js
locaActions.setLayerInfo('bank-mass', { visible: true })
locaActions.removeLayerInfo('bank-mass')
locaActions.clearLayerInfo()
```

### getLayerList() / getLayerInfo(layerId) / getFeatureInfo(layerId, featureId)

使用场景：读取 Loca 图层和要素元信息。

示例：

```js
const layers = locaActions.getLayerList()
const layer = locaActions.getLayerInfo('bank-mass')
const feature = locaActions.getFeatureInfo('bank-mass', 'bank-001')
```

### renderGeoJSONLayer(params, geoJSON)

使用场景：Loca 海量数据渲染入口，支持点、热力、网格、线、面等 Loca layer。

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `params.layerId` | `string` | 图层唯一 id |
| `params.type` | `point | heatmap | grid | line | polygon | scatter | icon` | Loca 图层类型 |
| `params.visible` | `boolean` | 初始是否显示 |
| `params.style` | `object` | 传给 `layer.setStyle()` 的样式 |
| `params.layerOptions` | `object` | 传给 Loca layer 构造器的选项 |
| `params.category` | `string` | 未包装 Geometry 的默认分类 |
| `params.properties` | `object` | 未包装 Geometry 的默认属性 |
| `geoJSON` | `FeatureCollection | Feature | Geometry | Array` | 业务数据 |

示例：

```js
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

### setLayerVisible(layerId, visible)

使用场景：控制整个 Loca 图层显示隐藏。

示例：

```js
locaActions.setLayerVisible('bank-mass', false)
```

### setLayerCategoryVisible(layerId, category, visible)

使用场景：按 `properties.category` 控制 Loca 图层内分类显隐。

示例：

```js
locaActions.setLayerCategoryVisible('bank-mass', 'branch', false)
```

### setFeaturesVisible(layerId, featureIds, visible)

使用场景：按要素 id 控制 Loca 数据显隐。

示例：

```js
locaActions.setFeaturesVisible('bank-mass', 'bank-001', false)
```

### setLayerStyle(layerId, style)

使用场景：更新整个 Loca 图层样式。只改变 `style` 时不会重建 layer；`layerOptions` 变化时会重建。

示例：

```js
locaActions.setLayerStyle('bank-mass', {
  radius: 7,
  color: '#f97316'
})
```

### setFeatureStyle(layerId, featureId, style)

使用场景：给 Loca 图层中的单个要素增加临时样式。适合右侧列表点选高亮。

示例：

```js
locaActions.setFeatureStyle('bank-mass', 'bank-001', {
  radius: 14,
  color: '#f59e0b',
  borderWidth: 1,
  blurWidth: 0.2
})
```

### highlightFeature(layerId, featureId, style)

使用场景：Loca 单要素高亮。`style` 不传时使用默认高亮样式。

示例：

```js
locaActions.highlightFeature('bank-mass', 'bank-001')
```

### clearFeatureStyle(layerId, featureId)

使用场景：取消单个 Loca 要素的临时样式。

示例：

```js
locaActions.clearFeatureStyle('bank-mass', 'bank-001')
```

### clearLayerFeatureStyles(layerId)

使用场景：取消整个 Loca 图层的所有临时高亮。

示例：

```js
locaActions.clearLayerFeatureStyles('bank-mass')
```

### fitLayerView(layerId, options)

使用场景：按 Loca 图层数据范围调整地图视野。

示例：

```js
locaActions.fitLayerView('bank-mass', {
  padding: [80, 80]
})
```

### clearLayer(layerId)

使用场景：清除指定 Loca 图层。

示例：

```js
locaActions.clearLayer('bank-mass')
```

### clearAllLayers()

使用场景：清空所有 Loca 图层。

示例：

```js
locaActions.clearAllLayers()
```

## 按钮示例

当前页面左下角按钮已经接入常用示例：

```text
普通图层：渲染点线面、隐藏点、显示点、渲染边界、边界换色、清除边界、高亮点/线/面、取消高亮、前缀图层、清前缀、要素信息、图层信息、清空地图
Loca：海量点、换色、高亮、清高亮、热力、网格、隐藏网点、显示网点、清除Loca、Loca信息、清空Loca
```

完整的一方法一示例索引在：

```js
import { mapMethodDemos, locaMethodDemos } from '@/examples/action-method-demos'

mapMethodDemos.renderGeoJSONLayer()
mapMethodDemos.highlightFeature()
locaMethodDemos.renderGeoJSONLayer()
locaMethodDemos.highlightFeature()
```
