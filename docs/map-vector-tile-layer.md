# 矢量瓦片业务图层使用说明

这套能力用于接入后端发布的标准 MVT / pbf 矢量瓦片业务图层，例如房价网格、人口密度网格、商圈面、道路业务线网等。它不替代 `renderGeoJSONLayer()`，也不影响现有 GeoJSON、WMS、Loca 链路。

## 适用场景

- 数据量很大，不适合一次性返回完整 GeoJSON。
- 业务数据已经按 `{z}/{x}/{y}.pbf` 或 query 形式发布成矢量瓦片。
- 只需要按地图视口和缩放级别加载当前瓦片。
- 点击或 hover 后需要获取瓦片内命中的业务要素。

## 基础渲染

```js
mapActions.renderVectorTileLayer({
  layerId: 'avg-price-grid',
  url: 'http://内网服务/tiles/avg-price-grid/[z]/[x]/[y].pbf',
  visible: true,
  opacity: 0.86,
  zIndex: 62,
  zooms: [8, 18],
  dataZooms: [8, 14],
  tileSize: 256,
  styles: {
    polygon: {
      sourceLayer: 'avg_price_grid',
      color: function (properties) {
        const value = Number(properties.avgPrice)
        if (value >= 30000) return '#ef4444'
        if (value >= 20000) return '#f97316'
        if (value >= 10000) return '#facc15'
        return '#84cc16'
      },
      borderColor: 'rgba(255,255,255,0.75)',
      borderWidth: 0.5
    }
  }
})
```

## 当前 MVT 服务示例

后端服务地址：

```txt
http://192.168.100.109:3000/mv_grid_thinning/{z}/{x}/{y}.pbf
```

业务层可以直接传 `{z}/{x}/{y}` 地址模板，项目会在矢量瓦片入口内部自动转换成高德需要的 `[z]/[x]/[y]` 模板。

```js
mapActions.renderVectorTileLayer({
  layerId: 'mv-grid-thinning',
  url: 'http://192.168.100.109:3000/mv_grid_thinning/{z}/{x}/{y}.pbf',
  visible: true,
  opacity: 0.82,
  zIndex: 64,
  zooms: [8, 18],
  dataZooms: [8, 14],
  tileSize: 256,
  styles: {
    polygon: {
      // 这里必须和 pbf 内部 source layer 名称一致。
      // 如果后端实际 layer 名不是 mv_grid_thinning，只需要改这里。
      sourceLayer: 'mv_grid_thinning',
      // MVT 样式会进入 worker 序列化，建议使用 function 表达式，不要使用对象方法简写，也不要依赖外部闭包函数。
      color: function (properties) {
        const value = Number(
          properties.avgPrice ||
          properties.avg_price ||
          properties.price ||
          properties.value ||
          properties.num ||
          properties.count
        )

        if (value >= 30000) return '#ef4444'
        if (value >= 20000) return '#f97316'
        if (value >= 10000) return '#facc15'
        if (value >= 5000) return '#84cc16'
        return '#6b5ea8'
      },
      borderColor: 'rgba(255,255,255,0.65)',
      borderWidth: 0.4
    }
  },
  events: {
    click(features, event) {
      console.log('点击网格', features, event)
    },
    mousemove(features, event) {
      console.log('hover 网格', features, event)
    }
  },
  eventOptions: {
    click: {
      featType: 'polygon',
      buffer: 4
    },
    mousemove: {
      featType: 'polygon',
      buffer: 4
    }
  }
})
```

## 参数说明

| 参数 | 说明 |
| --- | --- |
| `layerId` | 图层唯一 id，后续显隐、样式 patch、清除都靠它定位。 |
| `url` | pbf 瓦片地址，支持高德的 `[z]`、`[x]`、`[y]` 占位符；也兼容常见的 `{z}`、`{x}`、`{y}` 写法。 |
| `visible` | 是否显示图层，默认 `true`。 |
| `opacity` | 图层透明度，范围通常是 `0 ~ 1`。 |
| `zIndex` | 图层层级，数值越大越靠上。 |
| `zooms` | 图层可见缩放范围。 |
| `dataZooms` | 后端实际提供的数据缩放范围，超过范围时由高德图层使用边界级别数据。 |
| `tileSize` | 瓦片尺寸，常见为 `256`。 |
| `styles` / `style` | MVT 样式配置，支持 `point`、`line`、`polygon`、`polyhedron`。 |
| `events` | 图层事件，目前高德支持 `click`、`mousemove`。 |
| `eventOptions` | 事件拾取配置，可按事件名传 `featType`、`buffer` 等参数。 |

## 样式字段

### polygon 面

```js
{
  sourceLayer: 'avg_price_grid', // pbf 内部的 layer 名称
  color: '#f97316',              // 填充色，也可以是函数
  borderColor: '#ffffff',        // 边界颜色
  borderWidth: 1,                // 边界宽度
  dash: [10, 5],                 // 虚线配置
  visible: true                  // 是否显示
}
```

### line 线

```js
{
  sourceLayer: 'road_business',
  color: '#2563eb',
  lineWidth: 2,
  dash: [8, 4],
  visible: true
}
```

### point 点

```js
{
  sourceLayer: 'poi_business',
  radius: 4,
  color: '#1677ff',
  borderColor: '#ffffff',
  borderWidth: 1,
  visible: true
}
```

## 修改样式

局部修改使用现有通用入口 `patchLayerStyle()`：

```js
mapActions.patchLayerStyle('avg-price-grid', {
  opacity: 0.68,
  polygon: {
    borderColor: 'rgba(17,24,39,0.8)',
    borderWidth: 1
  }
})
```

完整替换样式使用 `setLayerStyle()`：

```js
mapActions.setLayerStyle('avg-price-grid', {
  polygon: {
    sourceLayer: 'avg_price_grid',
    color: '#f59e0b',
    borderColor: '#ffffff',
    borderWidth: 0.5
  }
})
```

## 显示隐藏和清除

```js
mapActions.setLayerVisible('avg-price-grid', false)
mapActions.setLayerVisible('avg-price-grid', true)
mapActions.clearLayer('avg-price-grid')
```

## 事件拾取

```js
mapActions.renderVectorTileLayer({
  layerId: 'avg-price-grid',
  url: 'http://内网服务/tiles/avg-price-grid/[z]/[x]/[y].pbf',
  styles: {
    polygon: {
      sourceLayer: 'avg_price_grid',
      color: '#84cc16'
    }
  },
  events: {
    click(features, event) {
      console.log('命中的瓦片要素', features, event)
    },
    mousemove(features) {
      console.log('hover 命中要素', features)
    }
  },
  eventOptions: {
    click: {
      featType: 'polygon',
      buffer: 4
    },
    mousemove: {
      featType: 'polygon',
      buffer: 4
    }
  }
})
```

## 和 GeoJSON 高亮的配合

MVT 图层适合承载海量业务数据，但单个要素高亮不建议直接改整层样式。推荐流程：

1. MVT 图层承载大数据底层业务面、线、点。
2. 点击或 hover 后拿到业务 id，或用点击坐标请求后端空间查询接口。
3. 后端返回单个或少量 GeoJSON。
4. 前端用 `renderGeoJSONLayer()` 渲染一层高亮覆盖物。

这样既能保留海量数据性能，也能复用现有 GeoJSON 高亮、定位、清除能力。

## 离线包检查

当前能力依赖高德离线包暴露 `AMap.MapboxVectorTileLayer`。可以在浏览器控制台检查：

```js
typeof AMap.MapboxVectorTileLayer
```

返回 `'function'` 才能正常渲染。若返回 `'undefined'`，说明当前离线包缺少完整的 MVT 图层插件，需要补齐高德授权离线包。
