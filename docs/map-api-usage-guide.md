# 地图 API 使用总说明

本文档面向业务开发，汇总当前项目中可直接使用的地图接口能力，包括：

- 普通地图 `mapActions`
- 海量数据图层 `locaActions`
- GeoJSON 入参格式
- 图层样式配置
- Point / Line / Polygon / Heatmap / Loca 图层的自定义方式
- 不同 API 的典型使用场景

源码参考：

- `src/map/map-store.js`
- `src/map/map-controller.js`
- `src/map/layer-registry.js`
- `src/map/style-resolver.js`
- `src/loca/loca-store.js`
- `src/loca/loca-controller.js`
- `src/loca/loca-layer-registry.js`
- `src/examples/map-feature-examples.js`
- `src/examples/loca-feature-examples.js`

---

## 1. 整体调用方式

当前项目统一通过 actions 调地图能力，不建议业务代码直接操作 `AMap.Map`、`AMap.Marker` 或 Loca 图层实例。

调用链路：

```text
业务组件
  -> mapActions / locaActions
  -> store.commandQueue
  -> AmapMap.vue
  -> MapController / LocaController
  -> AMap 覆盖物 / Loca 图层
```

---

## 2. 什么时候用 mapActions，什么时候用 locaActions

### 用 `mapActions`

适合：

- 少量点、线、面覆盖物
- 边界面、业务区域、路线、网点图标
- 需要精确控制单个要素的样式、高亮、显隐、聚焦
- 需要图片点位、HTML 点位、自定义图钉
- 需要测距、绘图、自定义标点、坐标定位

### 用 `locaActions`

适合：

- 海量点位
- 热力图
- 网格聚合图
- 大量线面可视化渲染
- 更偏“可视化图层”的场景，而不是单个覆盖物交互

---

## 3. GeoJSON 入参要求

普通地图和 Loca 图层都支持以下数据格式：

- `FeatureCollection`
- 单个 `Feature`
- 单个 `Geometry`
- `Feature` / `Geometry` 数组

推荐统一传标准 `FeatureCollection`：

```js
const geoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'bank-001',
      properties: {
        id: 'bank-001',
        name: '中国银行合肥庐阳支行',
        category: 'bank',
        shortName: '中',
        value: 86
      },
      geometry: {
        type: 'Point',
        coordinates: [117.225, 31.863]
      }
    }
  ]
}
```

### 支持的几何类型

```text
Point
MultiPoint
LineString
MultiLineString
Polygon
MultiPolygon
```

### 推荐字段

| 字段 | 位置 | 说明 |
| --- | --- | --- |
| `id` | `feature.id` 或 `properties.id` | 要素唯一标识，建议稳定且唯一 |
| `name` | `properties.name` | 要素名称 |
| `category` | `properties.category` | 分类字段，用于分类样式和分类显隐 |
| `value` | `properties.value` | 热力图、Loca 点图、网格图常用值字段 |
| `mapStyle` | `properties.mapStyle` | 单个要素覆盖样式 |

### 裸 Geometry 的补充属性

如果传入的是裸 `Geometry`，可通过 `params.properties` 或 `params.category` 自动补默认属性：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'region-boundary',
  visible: true,
  category: 'city',
  properties: {
    id: 'region-340100',
    name: '合肥市'
  }
}, polygon)
```

---

## 4. mapActions API 说明

文件：`src/map/map-store.js`

### 4.1 activateRuler()

启用地图测距工具。

**使用场景**：测量两点或多点路径距离。

```js
mapActions.activateRuler()
```

### 4.2 clearRuler()

关闭并清除测距结果。

**使用场景**：结束测距、重置工具。

```js
mapActions.clearRuler()
```

### 4.3 restartRuler()

重新开始一次测距。

**使用场景**：用户想保留测距模式，但重新选择起点。

```js
mapActions.restartRuler()
```

### 4.4 activateDraw(shape)

启用绘图工具。

**参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `shape` | `'rectangle' \| 'circle' \| 'polygon'` | 绘制类型 |

**使用场景**：框选区域、画圆形范围、画多边形区域。

```js
mapActions.activateDraw('rectangle')
mapActions.activateDraw('circle')
mapActions.activateDraw('polygon')
```

绘制完成后结果会写入 `mapStore.drawResult`。

`drawResult` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `shape` | `string` | 绘制类型 |
| `geoJSON` | `Feature` | 绘制结果 |
| `bounds` | `object \| null` | `{ southWest, northEast }` |
| `thumbnail` | `string` | 地图截图 base64 |
| `thumbnailError` | `string` | 截图失败原因 |

### 4.5 clearDrawResult()

清空上一次绘图结果。

**使用场景**：开始新一轮绘制前先重置旧结果。

```js
mapActions.clearDrawResult()
```

### 4.6 activateCustomMarker()

启用一次性自定义标点模式。

**使用场景**：用户点击地图后放置一个临时点位。

```js
mapActions.activateCustomMarker()
```

### 4.7 zoomIn() / zoomOut()

地图放大 / 缩小。

```js
mapActions.zoomIn()
mapActions.zoomOut()
```

### 4.8 searchCoordinate(keyword)

按经纬度字符串定位。

**参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `keyword` | `string` | 形如 `117.2272,31.8206` |

**使用场景**：业务已拿到坐标，直接定位地图。

```js
mapActions.searchCoordinate('117.2272,31.8206')
```

注意：当前只支持坐标字符串，不支持地址搜索或 POI 搜索。

### 4.9 renderGeoJSONLayer(params, geoJSON)

普通地图图层渲染入口，支持 Point / Line / Polygon / Heatmap。

**参数**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `params.layerId` | `string` | 是 | 图层唯一 id |
| `params.visible` | `boolean` | 否 | 首次渲染后是否显示 |
| `params.style` | `object` | 否 | 样式配置 |
| `params.category` | `string` | 否 | 给裸 Geometry 设置默认分类 |
| `params.properties` | `object` | 否 | 给裸 Geometry 设置默认属性 |
| `params.selection` | `object` | 否 | 渲染后聚焦指定要素 |
| `geoJSON` | `FeatureCollection \| Feature \| Geometry \| Array` | 是 | 地图数据 |

**使用场景**：

- 渲染网点点位
- 渲染行政区边界
- 渲染线路
- 渲染区域面
- 渲染普通热力图

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

### 4.10 setLayerVisible(layerId, visible)

控制整个图层显示 / 隐藏。

**参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `layerId` | `string` | 图层 id |
| `visible` | `boolean` | 是否显示 |

**使用场景**：图层面板勾选开关。

```js
mapActions.setLayerVisible('bank', false)
mapActions.setLayerVisible('bank', true)
```

### 4.11 setLayerCategoryVisible(layerId, category, visible)

控制图层内某个分类显示 / 隐藏。

**参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `layerId` | `string` | 图层 id |
| `category` | `string \| string[]` | 分类名，来自 `properties.category` |
| `visible` | `boolean` | 是否显示 |

**使用场景**：同一图层内隐藏 ATM、只显示直营网点等。

```js
mapActions.setLayerCategoryVisible('bank', 'atm', false)
mapActions.setLayerCategoryVisible('bank', ['branch', 'atm'], true)
```

### 4.12 setFeaturesVisible(layerId, featureIds, visible)

按 feature id 控制单个或多个要素显隐。

**参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `layerId` | `string` | 图层 id |
| `featureIds` | `string \| string[]` | 要素 id |
| `visible` | `boolean` | 是否显示 |

**使用场景**：右侧列表筛掉某些点、隐藏指定网格、隐藏特定路线。

```js
mapActions.setFeaturesVisible('bank', 'bank-001', false)
mapActions.setFeaturesVisible('bank', ['bank-001', 'bank-002'], true)
```

### 4.13 setLayerStyle(layerId, style)

更新整个图层样式。

**参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `layerId` | `string` | 图层 id |
| `style` | `object` | 样式对象 |

**使用场景**：切换主题色、改变边界填充色、切换点位渲染方式。

```js
mapActions.setLayerStyle('region-boundary', {
  polygon: {
    fillColor: '#f97316',
    fillOpacity: 0.28,
    strokeColor: '#ea580c',
    strokeWeight: 3
  }
})
```

### 4.14 setFeatureStyle(layerId, featureId, style)

给单个要素设置覆盖样式。

**参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `layerId` | `string` | 图层 id |
| `featureId` | `string` | 要素 id |
| `style` | `object` | 单要素样式 |

**使用场景**：高亮一个点 / 一条线 / 一个面。

```js
mapActions.setFeatureStyle('region-boundary', 'region-340100', {
  polygon: {
    fillColor: '#f59e0b',
    fillOpacity: 0.28,
    strokeColor: '#f59e0b',
    strokeWeight: 4,
    zIndex: 120
  }
})
```

### 4.15 highlightFeature(layerId, featureId)

用系统默认高亮样式高亮单个要素。

**使用场景**：列表点击联动地图高亮。

```js
mapActions.highlightFeature('bank', 'bank-001')
```

默认高亮：

- point：橙色 pin
- line：橙色粗线
- polygon：橙色填充 + 描边

### 4.16 clearFeatureStyle(layerId, featureId)

清除单个要素的覆盖样式。

```js
mapActions.clearFeatureStyle('bank', 'bank-001')
```

### 4.17 clearLayerFeatureStyles(layerId)

清除某图层内所有要素级覆盖样式。

```js
mapActions.clearLayerFeatureStyles('bank')
```

### 4.18 focusFeature(layerId, featureId)

聚焦指定要素。

**使用场景**：列表选中后把地图移动到目标点位或边界。

```js
mapActions.focusFeature('bank', 'bank-001')
```

### 4.19 fitLayerView(layerId, options)

让图层进入当前视野。

**参数**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `options.padding` | `number[]` | 边距，支持 `[x, y]` 或 `[top, right, bottom, left]` |
| `options.maxZoom` | `number` | 仅普通覆盖物图层支持 |

**使用场景**：渲染后自动缩放到可见范围。

```js
mapActions.fitLayerView('bank', {
  padding: [80, 80],
  maxZoom: 14
})
```

### 4.20 clearLayer(layerId)

清除单个图层。

```js
mapActions.clearLayer('bank')
```

### 4.21 clearAllLayers()

清除所有普通地图图层。

```js
mapActions.clearAllLayers()
```

### 4.22 clearLayerByPrefix(prefix)

按前缀清除一组图层。

**使用场景**：清理临时图层、框选结果图层、搜索结果图层。

```js
mapActions.clearLayerByPrefix('temp-search-')
```

### 4.23 getLayerList() / getLayerInfo(layerId) / getFeatureInfo(layerId, featureId)

读取当前图层和要素元信息。

**使用场景**：图层面板、调试面板、右侧详情面板。

```js
const layers = mapActions.getLayerList()
const layer = mapActions.getLayerInfo('bank')
const feature = mapActions.getFeatureInfo('bank', 'bank-001')
```

返回信息通常包含：

- `visible`
- `featureCount`
- `overlayCount`
- `categories`
- `hiddenCategories`
- `hiddenFeatureIds`
- `styledFeatureIds`
- `geometryKinds`
- `hasHeatmap`
- `featureIndex`

---

## 5. locaActions API 说明

文件：`src/loca/loca-store.js`

### 5.1 renderGeoJSONLayer(params, geoJSON)

Loca 图层渲染入口。

**参数**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `params.layerId` | `string` | 是 | 图层唯一 id |
| `params.type` | `string` | 否 | 图层类型：`point`、`heatmap`、`grid`、`polygon`、`line`、`scatter`、`icon` |
| `params.visible` | `boolean` | 否 | 首次渲染后是否显示 |
| `params.layerOptions` | `object` | 否 | 传给 Loca 图层构造器的参数 |
| `params.style` | `object` | 否 | 传给 `layer.setStyle()` 的视觉样式 |
| `params.category` | `string` | 否 | 给裸 Geometry 设置默认分类 |
| `params.properties` | `object` | 否 | 给裸 Geometry 设置默认属性 |
| `geoJSON` | `FeatureCollection \| Feature \| Geometry \| Array` | 是 | 图层数据 |

**使用场景**：

- 海量点位散点图
- 热力图
- 网格聚合图
- 海量线 / 面可视化

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

### 5.2 setLayerVisible(layerId, visible)

控制整个 Loca 图层显示 / 隐藏。

```js
locaActions.setLayerVisible('bank-mass', false)
locaActions.setLayerVisible('bank-mass', true)
```

### 5.3 setLayerCategoryVisible(layerId, category, visible)

按 `properties.category` 控制分类显隐。

```js
locaActions.setLayerCategoryVisible('bank-mass', 'atm', false)
```

### 5.4 setFeaturesVisible(layerId, featureIds, visible)

按 feature id 控制要素显隐。

```js
locaActions.setFeaturesVisible('bank-mass', 'bank-001', false)
```

### 5.5 setLayerStyle(layerId, style)

更新整个 Loca 图层样式。

```js
locaActions.setLayerStyle('bank-mass', {
  radius: 7,
  color: '#f97316'
})
```

说明：如果 `style` 中涉及 `layerOptions` 变更，底层可能重建图层实例。

### 5.6 setFeatureStyle(layerId, featureId, style)

给单个 Loca 要素设置覆盖样式。

```js
locaActions.setFeatureStyle('bank-mass', 'bank-001', {
  radius: 14,
  color: '#f59e0b',
  borderWidth: 1,
  blurWidth: 0.2
})
```

### 5.7 highlightFeature(layerId, featureId)

对单个 Loca 要素做高亮。

```js
locaActions.highlightFeature('bank-mass', 'bank-001')
```

### 5.8 clearFeatureStyle(layerId, featureId)

清除单个要素覆盖样式。

```js
locaActions.clearFeatureStyle('bank-mass', 'bank-001')
```

### 5.9 clearLayerFeatureStyles(layerId)

清除某个 Loca 图层内所有单要素覆盖样式。

```js
locaActions.clearLayerFeatureStyles('bank-mass')
```

### 5.10 fitLayerView(layerId, options)

定位到当前 Loca 图层范围。

**参数**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `options.padding` | `number[]` | 支持 `[x, y]` 或 `[top, right, bottom, left]` |

```js
locaActions.fitLayerView('bank-mass', {
  padding: [80, 80]
})
```

注意：当前 Loca `fitView` 仅使用 `padding`，没有 `maxZoom` 参数。

### 5.11 clearLayer(layerId) / clearAllLayers()

清除单个或全部 Loca 图层。

```js
locaActions.clearLayer('bank-mass')
locaActions.clearAllLayers()
```

### 5.12 getLayerList() / getLayerInfo(layerId) / getFeatureInfo(layerId, featureId)

读取图层和要素元信息。

```js
const layers = locaActions.getLayerList()
const layerInfo = locaActions.getLayerInfo('bank-mass')
const featureInfo = locaActions.getFeatureInfo('bank-mass', 'bank-001')
```

返回信息通常包含：

- `visible`
- `type`
- `locaLayer`
- `featureCount`
- `visibleFeatureCount`
- `categories`
- `hiddenCategories`
- `hiddenFeatureIds`
- `styledFeatureIds`
- `geometryKinds`
- `style`
- `layerOptions`
- `featureIndex`

---

## 6. 普通地图样式协议总说明

文件：`src/map/style-resolver.js`、`src/map/layer-registry.js`

### 6.1 样式入口

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank',
  visible: true,
  style: {
    point: {},
    line: {},
    polygon: {},
    heatmap: {},
    categories: {},
    rules: []
  }
}, geoJSON)
```

也支持样式跟随数据：

- `geoJSON.style`
- `geoJSON.properties.style`
- `feature.properties.mapStyle`

### 6.2 样式优先级

同一要素最终样式按以下顺序合并，后者覆盖前者：

```text
默认样式
-> style.point / style.line / style.polygon
-> style.categories[properties.category]
-> style.rules 命中的规则
-> feature.properties.mapStyle
```

### 6.3 动态字段能力

支持按字段动态映射：

- `colorBy`
- `sizeBy`
- `radiusBy`
- `fillColorBy`
- `fillOpacityBy`
- `strokeColorBy`
- `strokeOpacityBy`
- `strokeWeightBy`
- `opacityBy`
- `zIndexBy`

示例：

```js
style: {
  point: {
    renderer: 'circle',
    radiusBy: {
      field: 'riskScore',
      stops: [
        [0, 300],
        [50, 700],
        [100, 1200]
      ],
      default: 300
    },
    fillColorBy: {
      field: 'riskScore',
      stops: [
        [0, '#22c55e'],
        [50, '#f59e0b'],
        [100, '#ef4444']
      ]
    }
  }
}
```

### 6.4 rules 规则样式

适合按字段值做条件渲染。

```js
style: {
  point: {
    renderer: 'pin',
    color: '#2563eb'
  },
  rules: [
    {
      field: 'status',
      value: 'warning',
      style: {
        point: {
          color: '#f59e0b'
        }
      }
    },
    {
      field: 'score',
      min: 80,
      style: {
        point: {
          size: 36
        }
      }
    }
  ]
}
```

### 6.5 categories 分类样式

适合同层不同业务类型区分。

```js
style: {
  point: {
    renderer: 'image',
    image: { src: '/map-icons/default.svg', size: [32, 32] }
  },
  categories: {
    branch: {
      point: {
        image: { src: '/map-icons/branch.svg' }
      }
    },
    atm: {
      point: {
        image: { src: '/map-icons/atm.svg', size: [28, 28] }
      }
    }
  }
}
```

---

## 7. Point 样式说明

### 7.1 renderer = 'pin'

使用内置图钉样式，适合快速区分点位。

```js
style: {
  point: {
    renderer: 'pin',
    color: '#2563eb',
    size: 30,
    textField: 'shortName',
    textLength: 1,
    fontSize: 14,
    zIndex: 40,
    label: {
      visible: true,
      field: 'name',
      direction: 'right',
      offset: [8, -22]
    }
  }
}
```

**常用字段**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `renderer` | `string` | `pin` |
| `color` | `string` | 图钉颜色 |
| `size` | `number \| [number, number]` | 图钉大小 |
| `textField` | `string` | 图钉内文字字段 |
| `text` | `string` | 直接指定文字 |
| `textLength` | `number` | 图钉内截断长度 |
| `fontSize` | `number` | 图钉文字大小 |
| `label.visible` | `boolean` | 是否显示 label |
| `label.field` | `string` | label 文本字段 |
| `label.content` | `string` | label 固定内容 |
| `label.direction` | `string` | `top / right / bottom / left / center` |
| `label.offset` | `number[]` | label 偏移 |
| `offset` | `number[]` | marker 偏移 |
| `anchor` | `string` | marker 锚点 |
| `zIndex` | `number` | 层级 |
| `visible` | `boolean` | 是否显示 |
| `zooms` | `number[]` | 缩放范围 |
| `bubble` | `boolean` | 事件冒泡 |
| `clickable` | `boolean` | 是否可点击 |
| `draggable` | `boolean` | 是否可拖拽 |
| `cursor` | `string` | 鼠标样式 |
| `angle` | `number` | 旋转角度 |
| `topWhenClick` | `boolean` | 点击时置顶 |

### 7.2 renderer = 'image'

使用图片图标点位。

```js
style: {
  point: {
    renderer: 'image',
    image: {
      src: '/map-icons/bank.svg',
      size: [34, 34],
      imageSize: [34, 34],
      offset: [0, 0]
    },
    anchor: 'bottom-center',
    zIndex: 30
  }
}
```

**适用场景**：银行网点、设备点、门店点、机构点。

`image` 子字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `src` / `url` | `string` | 图片地址 |
| `size` | `number[]` | 显示尺寸 |
| `imageSize` | `number[]` | 原图尺寸 |
| `offset` | `number[]` | 图片偏移 |

### 7.3 renderer = 'html'

使用 HTML 自定义点位。

```js
style: {
  point: {
    renderer: 'html',
    html: '<div class="custom-marker">A</div>',
    offset: [-12, -24],
    zIndex: 60
  }
}
```

也支持 `content` 字段。

**适用场景**：少量特殊点位、强定制 DOM 标记。

注意：HTML 会直接进入 Marker DOM，外部不可信数据不要直接透传。

### 7.4 renderer = 'circle'

把 Point 渲染为 `AMap.Circle`。

```js
style: {
  point: {
    renderer: 'circle',
    radius: 800,
    fillColor: '#1677ff',
    fillOpacity: 0.16,
    strokeColor: '#1677ff',
    strokeOpacity: 0.85,
    strokeWeight: 2,
    strokeStyle: 'solid',
    strokeDasharray: [6, 4],
    zIndex: 20
  }
}
```

**适用场景**：服务半径、风险范围、缓冲区、影响圈层。

注意：`radius` 单位是米。

**常用字段**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `radius` | `number` | 半径，单位米 |
| `fillColor` | `string` | 填充色 |
| `fillOpacity` | `number` | 填充透明度 |
| `strokeColor` | `string` | 描边色 |
| `strokeOpacity` | `number` | 描边透明度 |
| `strokeWeight` | `number` | 描边宽度 |
| `strokeStyle` | `string` | `solid` / `dashed` |
| `strokeDasharray` | `number[]` | 虚线配置 |
| `visible` | `boolean` | 是否显示 |
| `zIndex` | `number` | 层级 |
| `zooms` | `number[]` | 缩放范围 |
| `bubble` | `boolean` | 事件冒泡 |
| `cursor` | `string` | 鼠标样式 |
| `draggable` | `boolean` | 是否可拖拽 |

---

## 8. Line 样式说明

LineString / MultiLineString 会渲染成 `AMap.Polyline`。

```js
style: {
  line: {
    strokeColor: '#16a34a',
    strokeOpacity: 0.95,
    strokeWeight: 4,
    strokeStyle: 'solid',
    lineJoin: 'round',
    lineCap: 'round',
    showDir: true,
    zIndex: 35
  }
}
```

**适用场景**：路线、轨迹、边界线、巡检路径、管线。

**常用字段**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `strokeColor` | `string` | 线颜色 |
| `strokeOpacity` | `number` | 线透明度 |
| `strokeWeight` | `number` | 线宽 |
| `strokeStyle` | `string` | `solid` / `dashed` |
| `strokeDasharray` | `number[]` | 虚线配置 |
| `isOutline` | `boolean` | 是否描边 |
| `outlineColor` | `string` | 外描边颜色 |
| `borderWeight` | `number` | 外描边宽度 |
| `lineJoin` | `string` | 折线连接样式 |
| `lineCap` | `string` | 线端样式 |
| `geodesic` | `boolean` | 是否大地线 |
| `showDir` | `boolean` | 是否显示方向箭头 |
| `visible` | `boolean` | 是否显示 |
| `zIndex` | `number` | 层级 |
| `zooms` | `number[]` | 缩放范围 |
| `bubble` | `boolean` | 事件冒泡 |
| `cursor` | `string` | 鼠标样式 |

单条线高亮：

```js
mapActions.setFeatureStyle('route', 'route-001', {
  line: {
    strokeColor: '#f59e0b',
    strokeWeight: 6,
    zIndex: 120
  }
})
```

---

## 9. Polygon 样式说明

Polygon / MultiPolygon 会渲染成 `AMap.Polygon`。

```js
style: {
  polygon: {
    fillColor: '#7c3aed',
    fillOpacity: 0.14,
    strokeColor: '#7c3aed',
    strokeOpacity: 0.95,
    strokeWeight: 2,
    zIndex: 32
  }
}
```

**适用场景**：行政区边界、业务区域、商圈、多边形框选结果、网格块面。

**常用字段**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `fillColor` | `string` | 填充色 |
| `fillOpacity` | `number` | 填充透明度 |
| `strokeColor` | `string` | 边界颜色 |
| `strokeOpacity` | `number` | 边界透明度 |
| `strokeWeight` | `number` | 边界宽度 |
| `strokeStyle` | `string` | `solid` / `dashed` |
| `strokeDasharray` | `number[]` | 虚线配置 |
| `extrusionHeight` | `number` | 挤出高度 |
| `roofColor` | `string` | 顶面颜色 |
| `wallColor` | `string` | 侧面颜色 |
| `visible` | `boolean` | 是否显示 |
| `zIndex` | `number` | 层级 |
| `zooms` | `number[]` | 缩放范围 |
| `bubble` | `boolean` | 事件冒泡 |
| `cursor` | `string` | 鼠标样式 |
| `draggable` | `boolean` | 是否可拖拽 |

面高亮：

```js
mapActions.setFeatureStyle('region-boundary', 'region-340100', {
  polygon: {
    fillColor: '#f59e0b',
    fillOpacity: 0.3,
    strokeColor: '#f59e0b',
    strokeWeight: 4,
    zIndex: 120
  }
})
```

---

## 10. 普通 Heatmap 样式说明

普通地图支持 `AMap.HeatMap` 风格的热力图，前提是离线包中该能力可用。

触发方式：`style` 中出现 `heatmap`，或 `renderer/type` 被识别为热力图。

```js
mapActions.renderGeoJSONLayer({
  layerId: 'risk-heat',
  visible: true,
  style: {
    heatmap: {
      valueField: 'value',
      radius: 30,
      opacity: [0.2, 0.85],
      zIndex: 130,
      gradient: {
        0.2: '#22c55e',
        0.5: '#f59e0b',
        1: '#ef4444'
      }
    }
  }
}, geoJSON)
```

**适用场景**：风险热度、客流热度、告警密度、点位聚合热区。

**常用字段**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `valueField` | `string` | 热力值字段，默认 `value` |
| `radius` | `number` | 热力半径 |
| `opacity` | `number[]` | 透明度范围 |
| `gradient` | `object` | 颜色映射 |
| `max` | `number` | 最大值，不传时自动取数据最大值 |
| `visible` | `boolean` | 是否显示 |
| `zIndex` | `number` | 层级 |
| `zooms` | `number[]` | 缩放范围 |
| `3d` | `boolean` | 是否启用 3d 模式 |

注意：普通 heatmap 需要 Point / MultiPoint 数据。

---

## 11. Loca 图层样式说明

文件：`src/loca/loca-layer-registry.js`

支持类型：

```text
point    -> Loca.PointLayer
scatter  -> Loca.ScatterLayer
icon     -> Loca.IconLayer
heatmap  -> Loca.HeatMapLayer
grid     -> Loca.GridLayer
polygon  -> Loca.PolygonLayer
line     -> Loca.LineLayer
```

### 11.1 Loca Point

```js
locaActions.renderGeoJSONLayer({
  layerId: 'loca-bank',
  type: 'point',
  visible: true,
  layerOptions: {
    zIndex: 12,
    opacity: 0.92,
    blend: 'lighter'
  },
  style: {
    radius: (index, feature) => feature.properties.category === 'branch' ? 5.8 : 4.2,
    color: (index, feature) => feature.properties.category === 'branch' ? '#1677ff' : '#16a34a',
    borderWidth: 0,
    blurWidth: 0.65
  }
}, geoJSON)
```

**适用场景**：海量网点、设备、告警点、坐标点云。

**常用字段**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `radius` | `number \| function` | 点半径 |
| `color` | `string \| function` | 点颜色 |
| `borderWidth` | `number \| function` | 边框宽度 |
| `blurWidth` | `number \| function` | 模糊宽度 |

### 11.2 Loca Heatmap

```js
locaActions.renderGeoJSONLayer({
  layerId: 'loca-heat',
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

**适用场景**：热度分布、密度分布、强度可视化。

**常用字段**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `radius` | `number` | 半径 |
| `unit` | `string` | `px` 或 `meter` |
| `height` | `number` | 热力高度 |
| `value` | `number \| function` | 热力值 |
| `gradient` | `object` | 渐变色 |

### 11.3 Loca Grid

```js
locaActions.renderGeoJSONLayer({
  layerId: 'loca-grid',
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

**适用场景**：网格热度、片区密度、栅格分析。

**常用字段**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `unit` | `string` | `meter` / `px` |
| `radius` | `number` | 网格半径 / 尺寸 |
| `gap` | `number` | 网格间距 |
| `height` | `number` | 高度 |
| `color` | `string \| function` | 网格颜色 |

### 11.4 Loca Polygon

```js
locaActions.renderGeoJSONLayer({
  layerId: 'loca-polygon',
  type: 'polygon',
  visible: true,
  layerOptions: {
    zIndex: 9,
    opacity: 0.9
  },
  style: {
    color: '#1677ff',
    opacity: 0.38,
    borderColor: '#0f5fd0',
    borderWidth: 1
  }
}, geoJSON)
```

说明：`color` 会自动映射成：

- `topColor`
- `bottomColor`
- `sideTopColor`
- `sideBottomColor`

也可以直接传这些字段。

**常用字段**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `color` | `string` | 快捷主色 |
| `topColor` | `string` | 顶部颜色 |
| `bottomColor` | `string` | 底部颜色 |
| `sideTopColor` | `string` | 侧面顶部颜色 |
| `sideBottomColor` | `string` | 侧面底部颜色 |
| `opacity` | `number` | 透明度 |
| `borderColor` | `string` | 边框颜色 |
| `borderWidth` | `number` | 边框宽度 |

### 11.5 Loca Line

```js
locaActions.renderGeoJSONLayer({
  layerId: 'loca-line',
  type: 'line',
  visible: true,
  style: {
    color: '#1677ff',
    lineWidth: 3,
    opacity: 0.9
  }
}, geoJSON)
```

**适用场景**：大量轨迹线、迁徙线、关系线。

**常用字段**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `color` | `string \| function` | 线颜色 |
| `lineWidth` | `number \| function` | 线宽 |
| `opacity` | `number \| function` | 透明度 |

### 11.6 单要素高亮

Loca 的 `setFeatureStyle` 本质上会给目标 feature 叠加 override 样式，并单独维护 highlight layer。

```js
locaActions.setFeatureStyle('loca-bank', 'bank-001', {
  radius: 14,
  color: '#f59e0b',
  borderWidth: 1,
  blurWidth: 0.2
})
```

---

## 12. 常见使用场景建议

### 场景 1：少量网点点位

推荐：`mapActions.renderGeoJSONLayer`

原因：

- 方便做单点高亮
- 支持图片、HTML、自定义 pin
- 支持 focusFeature / setFeatureStyle

### 场景 2：行政区边界 / 商圈面

推荐：`mapActions.renderGeoJSONLayer`

原因：

- Polygon 样式直观
- 支持改色、边界加粗、聚焦
- 适合中低数量面数据

### 场景 3：海量网点 / 海量告警点

推荐：`locaActions.renderGeoJSONLayer(type: 'point')`

原因：

- 性能更好
- 支持函数式颜色和半径
- 更适合大批量点位

### 场景 4：热度分布

推荐：

- 普通热力：`mapActions` heatmap
- 大规模热力可视化：`locaActions` heatmap

### 场景 5：网格聚合

推荐：`locaActions.renderGeoJSONLayer(type: 'grid')`

原因：

- 更适合聚合表达
- 样式直接围绕网格视觉定义

### 场景 6：列表点击联动地图

推荐流程：

```js
mapActions.highlightFeature('bank', 'bank-001')
mapActions.focusFeature('bank', 'bank-001')
```

Loca 图层则使用：

```js
locaActions.setFeatureStyle('bank-mass', 'bank-001', {
  radius: 14,
  color: '#f59e0b'
})
locaActions.fitLayerView('bank-mass', {
  padding: [80, 80]
})
```

---

## 13. 完整示例

### 13.1 普通点线面混合图层

```js
mapActions.renderGeoJSONLayer({
  layerId: 'mixed-layer',
  visible: true,
  style: {
    point: {
      renderer: 'pin',
      textField: 'shortName',
      color: '#2563eb',
      size: 30,
      zIndex: 40
    },
    line: {
      strokeColor: '#16a34a',
      strokeOpacity: 0.95,
      strokeWeight: 4,
      zIndex: 35
    },
    polygon: {
      fillColor: '#7c3aed',
      fillOpacity: 0.14,
      strokeColor: '#7c3aed',
      strokeOpacity: 0.95,
      strokeWeight: 2,
      zIndex: 32
    }
  }
}, geoJSON)

mapActions.fitLayerView('mixed-layer', {
  padding: [90, 80],
  maxZoom: 14
})
```

### 13.2 普通边界图层换色

```js
mapActions.renderGeoJSONLayer({
  layerId: 'region-boundary',
  visible: true,
  style: {
    polygon: {
      fillColor: '#1677ff',
      fillOpacity: 0.14,
      strokeColor: '#1677ff',
      strokeOpacity: 1,
      strokeWeight: 2,
      zIndex: 30
    }
  }
}, regionGeoJSON)

mapActions.setLayerStyle('region-boundary', {
  polygon: {
    fillColor: '#f97316',
    fillOpacity: 0.28,
    strokeColor: '#ea580c',
    strokeOpacity: 1,
    strokeWeight: 3,
    zIndex: 45
  }
})
```

### 13.3 Loca 海量点

```js
locaActions.renderGeoJSONLayer({
  layerId: 'loca-example-mass-points',
  type: 'point',
  visible: true,
  layerOptions: {
    zIndex: 12,
    opacity: 0.92,
    blend: 'lighter'
  },
  style: {
    radius: (index, feature) => feature.properties.category === 'branch' ? 5.8 : 4.2,
    color: (index, feature) => {
      const map = {
        branch: '#1677ff',
        atm: '#16a34a',
        selfService: '#f97316'
      }
      return map[feature.properties.category] || '#1677ff'
    },
    borderWidth: 0,
    blurWidth: 0.65
  }
}, geoJSON)
```

### 13.4 Loca 热力图

```js
locaActions.renderGeoJSONLayer({
  layerId: 'loca-example-heatmap',
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

---

## 14. 注意事项

1. `layerId` 必须稳定且唯一，后续所有控制接口都依赖它。
2. `feature.id` 或 `properties.id` 建议始终提供，否则单要素控制会受影响。
3. 分类显隐依赖 `properties.category`。
4. 普通 Point 的 `renderer: 'circle'` 中 `radius` 单位是米。
5. 普通 Heatmap 依赖离线包中的 `AMap.HeatMap` 能力；如果离线包不支持，则无法显示。
6. Loca 图层更适合海量数据，不适合替代所有普通交互覆盖物。
7. `fitLayerView`：
   - 普通地图支持 `padding` 和 `maxZoom`
   - Loca 目前只使用 `padding`
8. `setLayerStyle()` 会清空当前图层已有的 feature 级 style override；如果需要保留高亮，需要重新设置。
9. HTML Marker 适合可信数据场景，外部不可信数据不要直接拼接 HTML。

---

## 15. 相关源码位置

- 普通地图对外 API：`src/map/map-store.js`
- 普通地图命令执行：`src/map/map-controller.js`
- 普通地图 GeoJSON 渲染：`src/map/layer-registry.js`
- 普通地图样式解析：`src/map/style-resolver.js`
- Loca 对外 API：`src/loca/loca-store.js`
- Loca 命令执行：`src/loca/loca-controller.js`
- Loca 图层封装：`src/loca/loca-layer-registry.js`
- 普通地图示例：`src/examples/map-feature-examples.js`
- Loca 示例：`src/examples/loca-feature-examples.js`
