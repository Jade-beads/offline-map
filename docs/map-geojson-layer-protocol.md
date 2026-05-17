# GeoJSON 图层协议

地图层优先接收标准 GeoJSON `FeatureCollection`。为了方便业务接入，也兼容单个 `Feature`、裸 `Geometry`，以及由 `Feature` 或 `Geometry` 组成的数组。业务层负责请求接口、整理数据、决定样式；地图层只负责把 GeoJSON 转成高德覆盖物。

## 调用入口

```js
mapActions.renderGeoJSONLayer(params, geoJSON)
```

`params` 参数：

```js
{
  layerId: 'bank',
  visible: true,
  style: {},
  category: 'bank',
  properties: {
    category: 'bank',
    source: 'business-api'
  },
  infoWindow: {
    title: 'name',
    fields: [
      { label: '地址', field: 'address' }
    ],
    actions: [
      { key: 'detail', label: '查看详情', type: 'primary' }
    ],
    onAction(action, context) {
      console.log(action.key, context.featureId)
    }
  },
  selection: {
    type: 'bank',
    id: 'bank-001'
  }
}
```

| 字段 | 类型 | 必填 | 用途 |
| --- | --- | --- | --- |
| `layerId` | `string` | 是 | 图层唯一标识。后续显隐、分类显隐都依赖它。 |
| `visible` | `boolean` | 否 | 本次渲染后是否显示。默认新图层会显示。 |
| `style` | `object` | 否 | 图层样式协议。详见 [map-style-protocol.md](./map-style-protocol.md)。 |
| `category` | `string` | 否 | 给未携带 `properties.category` 的 Feature 或裸 Geometry 设置默认分类。 |
| `properties` | `object` | 否 | 给未格式化 GeoJSON 补充默认 `properties`。原始 Feature/Geometry 自带的 `properties` 优先级更高。 |
| `infoWindow` | `object` | 否 | 点击覆盖物时打开的信息窗体配置，只作用于普通 GeoJSON 点、线、面覆盖物。 |
| `selection` | `object` | 否 | 渲染后定位某个要素。`type` 对应 `layerId`，`id` 对应 Feature id。 |

`map-store` 只负责发送渲染命令，不保存 GeoJSON、图层列表或接口返回的业务数据。

`infoWindow` 支持两种展示方式：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank',
  visible: true,
  infoWindow: {
    title: 'name',
    fields: [
      { label: '机构类型', field: 'category' },
      { label: '地址', field: 'address' }
    ]
  }
}, geoJSON)
```

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank',
  visible: true,
  infoWindow: {
    content(feature, properties) {
      return `<div class="map-info-window">${properties.name}</div>`
    },
    actions: [
      { key: 'detail', label: '查看详情', type: 'primary' }
    ],
    onAction(action, context) {
      console.log(action.key, context.layerId, context.featureId)
      context.close()
    }
  }
}, geoJSON)
```

说明：

- `fields` 模式会转义标题、字段标签和字段值，适合纯信息展示。
- `content` 返回值视为业务可信 HTML，可以和 `actions` 同时使用。
- `actions` 有值时必须提供 `onAction`，按钮点击回调的 `context` 包含 `layerId`、`featureId`、`properties`、`lnglat`、`overlay` 和 `close()`。
- 信息窗体使用共享实例，点击下一个覆盖物会替换内容和位置。

渲染后让整个图层进入地图视野：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'region',
  visible: true
}, polygon)

mapActions.fitLayerView('region')
```

也可以传入视野边距和最大缩放级别：

```js
mapActions.fitLayerView('region', {
  padding: [80, 80, 80, 80],
  maxZoom: 16
})
```

`fitLayerView` 是独立命令，会在当前命令队列中按顺序执行。因此紧跟在 `renderGeoJSONLayer` 后调用时，会先渲染图层，再调整地图视野。

## GeoJSON 基本要求

```js
const geoJSON = {
  type: 'FeatureCollection',
  features: []
}
```

也可以直接传入裸几何对象：

```js
const polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [116.391, 39.907],
      [116.405, 39.907],
      [116.405, 39.918],
      [116.391, 39.918],
      [116.391, 39.907]
    ]
  ]
}

mapActions.renderGeoJSONLayer({
  layerId: 'region',
  visible: true,
  category: 'city-boundary',
  style: {
    polygon: {
      fillColor: '#1677ff',
      fillOpacity: 0.18,
      strokeColor: '#1677ff',
      strokeWeight: 2
    }
  }
}, polygon)
```

裸 `Geometry` 会在地图层内部自动包装成 `Feature`，默认 id 为 `geometry-0`。如果调用参数里传了 `category`，地图层会补成 `properties.category`，因此也可以继续使用 `setLayerCategoryVisible` 做分类显隐。

需要补多个默认属性时，使用 `properties`：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'region-boundary',
  visible: true,
  properties: {
    id: 'region-340100',
    category: 'city',
    name: '合肥市'
  }
}, polygon)
```

当前支持的几何类型：

```text
Point
MultiPoint
LineString
MultiLineString
Polygon
MultiPolygon
```

推荐每个 Feature 都提供稳定 id：

```js
{
  type: 'Feature',
  id: 'bank-001',
  properties: {
    id: 'bank-001',
    name: '中国银行合肥庐阳支行',
    category: 'bank'
  },
  geometry: {
    type: 'Point',
    coordinates: [117.225, 31.863]
  }
}
```

`id` 可放在 Feature 根级，也可放在 `properties.id`。分类显隐使用 `properties.category`。

## 示例：渲染点图层

适合网点、设备、机构、人员位置等点位。

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
        shortName: '中'
      },
      geometry: {
        type: 'Point',
        coordinates: [117.225, 31.863]
      }
    },
    {
      type: 'Feature',
      id: 'atm-001',
      properties: {
        id: 'atm-001',
        name: '长江路 ATM',
        category: 'atm',
        shortName: 'A'
      },
      geometry: {
        type: 'Point',
        coordinates: [117.231, 31.858]
      }
    }
  ]
}

mapActions.renderGeoJSONLayer({
  layerId: 'bank',
  visible: true,
  style: {
    point: {
      renderer: 'pin',
      textField: 'shortName',
      textLength: 1,
      size: 30
    },
    categories: {
      bank: {
        point: { color: '#2563eb' }
      },
      atm: {
        point: { color: '#16a34a' }
      }
    }
  }
}, geoJSON)
```

说明：

- `geometry.type` 是 `Point`，地图层会创建 `AMap.Marker`。
- `style.point.renderer: 'pin'` 使用内置图钉样式。
- `textField` 从 `properties.shortName` 取文字。
- `categories` 按 `properties.category` 覆盖默认样式。

## 示例：渲染线图层

适合线路、轨迹、边界线、管线等。

```js
const geoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'route-001',
      properties: {
        id: 'route-001',
        name: '巡检路线',
        category: 'main'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [117.214, 31.846],
          [117.223, 31.852],
          [117.236, 31.861]
        ]
      }
    }
  ]
}

mapActions.renderGeoJSONLayer({
  layerId: 'route',
  visible: true,
  style: {
    line: {
      strokeColor: '#1677ff',
      strokeOpacity: 0.9,
      strokeWeight: 4,
      strokeStyle: 'solid',
      showDir: true,
      zIndex: 30
    }
  }
}, geoJSON)
```

说明：

- `LineString` 会创建 `AMap.Polyline`。
- `MultiLineString` 也支持，路径会作为多段线传入高德。
- 线宽较粗时可打开 `showDir` 显示方向箭头。

## 示例：渲染面图层

适合行政边界、业务区域、网格、商圈等。

```js
const geoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'area-001',
      properties: {
        id: 'area-001',
        name: '三孝口商圈',
        category: 'core'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [117.242, 31.878],
          [117.276, 31.881],
          [117.285, 31.856],
          [117.251, 31.848],
          [117.242, 31.878]
        ]]
      }
    }
  ]
}

mapActions.renderGeoJSONLayer({
  layerId: 'business-area',
  visible: true,
  style: {
    polygon: {
      fillColor: '#1677ff',
      fillOpacity: 0.18,
      strokeColor: '#1677ff',
      strokeOpacity: 0.9,
      strokeWeight: 2,
      zIndex: 20
    }
  }
}, geoJSON)
```

说明：

- `Polygon` 坐标是三层数组：`[ring[]]`。
- 外环建议首尾闭合。
- 带洞面、多个面可使用 `MultiPolygon`。

## 示例：整个图层显示隐藏

先渲染一次：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank',
  visible: true
}, geoJSON)
```

后续只控制已渲染图层，不需要重复传 GeoJSON：

```js
mapActions.setLayerVisible('bank', false)
mapActions.setLayerVisible('bank', true)
```

`layerId` 必须和渲染时一致。

## 示例：清除图层覆盖物

适合省市区选择器清空、关闭边界图层、切换到不需要边界的业务模式等场景：

```js
mapActions.clearLayer('region-boundary')
```

清除后该图层的覆盖物和内部状态都会被释放。后续要再次显示，需要重新调用 `renderGeoJSONLayer`。

## 示例：读取图层信息

```js
const layers = mapActions.getLayerList()
const layer = mapActions.getLayerInfo('bank')
```

图层信息只保存业务元数据，例如 `visible`、`featureCount`、`overlayCount`、`categories`、`styledFeatureIds` 等，不保存高德覆盖物实例。

## 示例：高亮指定点线面

右侧列表点击某条业务数据时，用该数据对应的 Feature id 调用：

```js
mapActions.highlightFeature('bank', 'bank-001')
mapActions.focusFeature('bank', 'bank-001')
```

自定义点位高亮：

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

自定义线或面高亮：

```js
mapActions.setFeatureStyle('route', 'route-001', {
  line: {
    strokeColor: '#f59e0b',
    strokeWeight: 6,
    zIndex: 120
  }
})

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

取消高亮：

```js
mapActions.clearFeatureStyle('bank', 'bank-001')
```

临时样式只作用于当前地图图层，不修改原始 GeoJSON。重新 `renderGeoJSONLayer` 会清空该图层的临时样式。

`focusFeature` 可选，用来把右侧列表点击的点、线、面同步移动到地图视野中。

## 示例：图层内分类显示隐藏

如果一个图层里有多类覆盖物，用 `properties.category` 标识分类：

```js
mapActions.setLayerCategoryVisible('bank', 'bank', false)
mapActions.setLayerCategoryVisible('bank', 'bank', true)
```

也可以一次控制多个分类：

```js
mapActions.setLayerCategoryVisible('bank', ['bank', 'atm'], false)
```

分类显隐不会修改接口数据，也不会进入 `map-store` 缓存，只作用于当前地图上已经渲染的覆盖物。

## 示例：渲染后定位某个要素

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

说明：

- `selection.type` 当前按图层 id 使用，应与 `layerId` 一致。
- `selection.id` 对应 Feature 根级 `id` 或 `properties.id`。
- 点要素会调用 `setZoomAndCenter`，线面要素会调用 `setFitView`。

## 示例：热力点数据

热力图只接受点要素，数值字段默认是 `value`，也可以通过样式中的 `valueField` 指定。

```js
const geoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'heat-001',
      properties: {
        id: 'heat-001',
        category: 'customer',
        heatValue: 92
      },
      geometry: {
        type: 'Point',
        coordinates: [117.214, 31.841]
      }
    }
  ]
}

mapActions.renderGeoJSONLayer({
  layerId: 'customer-heat',
  visible: true,
  style: {
    renderer: 'heatmap',
    heatmap: {
      valueField: 'heatValue',
      max: 100,
      radius: 30
    }
  }
}, geoJSON)
```

注意：当前离线包未包含可用的官方 `AMap.HeatMap`，因此这段协议是预留入口。补齐离线 HeatMap 插件后，无需调整业务调用方式。
