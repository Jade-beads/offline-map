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
| `id` | `string` | 本次绘图覆盖物 id，可用于后续编辑或删除 |
| `shape` | `rectangle | circle | polygon` | 绘制类型 |
| `geoJSON` | `Feature` | 绘制结果。矩形/多边形为 `Polygon`，圆形为带 `properties.radius` 的 `Point` |
| `bounds` | `object | null` | `{ southWest, northEast }` 边界信息 |
| `thumbnail` | `string` | 地图 canvas 截图，base64 png |
| `thumbnailError` | `string` | 截图失败原因，常见于跨域瓦片导致 canvas 被污染 |

绘制完成后，地图层还会维护 `mapStore.drawOverlayInfo`，用于描述当前地图上临时绘图覆盖物的生命周期状态：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 当前激活的绘图覆盖物 id |
| `shape` | `rectangle | circle | polygon` | 当前激活覆盖物类型 |
| `editing` | `boolean` | 当前覆盖物是否处于编辑状态 |
| `overlayCount` | `number` | 地图上保留的临时绘图覆盖物数量 |

绘图覆盖物支持右键菜单。用户在已绘制图形上右键时，菜单会根据当前状态动态展示，点击任意菜单动作后会自动收起：

| 菜单项 | 说明 |
| --- | --- |
| 编辑图形 | 当前图形未编辑且离线包具备对应 Editor 时展示。圆形使用 `AMap.CircleEditor`，矩形优先使用 `AMap.RectangleEditor`，多边形使用 `AMap.PolygonEditor` |
| 完成编辑 | 当前图形正在编辑时展示。关闭编辑器，并把修改后的 `geoJSON` / `bounds` / `thumbnail` 写回 `mapStore.drawResult` |
| 删除图形 | 删除当前右键命中的绘图覆盖物，并清空当前 `drawResult` |
| 清空绘图 | 地图上存在多个临时绘图覆盖物时展示。删除所有临时绘图覆盖物，并清空 `drawResult` |

如果业务层需要维护多个临时图形，建议监听 `mapStore.drawOverlayAction`，它表示“本次发生的绘图操作”。`drawResult` 仍然表示当前图形结果，`drawOverlayAction` 用来告诉业务层应该新增、更新、删除还是清空列表。

`drawOverlayAction` 字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `type` | `create | update | edit-start | edit-stop | delete | clear` | 本次操作类型 |
| `id` | `string` | 被操作的图形 id，`clear` 时为空字符串 |
| `shape` | `rectangle | circle | polygon | string` | 被操作的图形类型，`clear` 时为空字符串 |
| `result` | `object | null` | 当前操作对应的图形结果，结构同 `drawResult` |
| `overlayCount` | `number` | 操作后地图上剩余的临时绘图覆盖物数量 |
| `timestamp` | `number` | 操作产生时间戳 |
| `ids` | `string[]` | 仅 `clear` 时存在，表示被清空的图形 id 列表 |
| `records` | `Array<{ id, shape, result }>` | 仅 `clear` 时存在，表示被清空图形的快照 |

多个图形列表维护示例：

```js
import { mapActions, mapStore } from '@/map/map-store'

export default {
  data() {
    return {
      mapStore,
      drawList: []
    }
  },
  watch: {
    'mapStore.drawOverlayAction'(action) {
      if (!action) return

      if (['create', 'update', 'edit-stop'].includes(action.type) && action.result) {
        const index = this.drawList.findIndex((item) => item.id === action.id)
        if (index > -1) {
          this.$set(this.drawList, index, action.result)
        } else {
          this.drawList.push(action.result)
        }
      }

      if (action.type === 'delete') {
        this.drawList = this.drawList.filter((item) => item.id !== action.id)
      }

      if (action.type === 'clear') {
        this.drawList = []
      }
    }
  },
  methods: {
    edit(row) {
      mapActions.startEditDrawOverlay(row.id)
    },
    remove(row) {
      mapActions.deleteDrawOverlay(row.id)
    },
    clearAll() {
      mapActions.clearDrawOverlay()
    }
  }
}
```

### clearDrawResult()

使用场景：开始新一轮绘制前清空上一次绘制结果。

示例：

```js
mapActions.clearDrawResult()
mapActions.activateDraw('rectangle')
```

注意：`clearDrawResult()` 只清空结果数据，不会删除地图上的绘图覆盖物。如果要删除地图上的临时图形，请使用下面的覆盖物生命周期方法。

### clearDrawOverlay()

使用场景：清空地图上所有通过 `activateDraw()` 画出来的临时覆盖物，同时清空 `mapStore.drawResult` 和 `mapStore.drawOverlayInfo`。

示例：

```js
mapActions.clearDrawOverlay()
```

### startEditDrawOverlay(id)

使用场景：业务层通过按钮开启指定绘图覆盖物的编辑能力。`id` 不传时，默认编辑当前激活或最近一次绘制的覆盖物。

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 可选，`mapStore.drawResult.id` 或 `mapStore.drawOverlayInfo.id` |

示例：

```js
mapActions.startEditDrawOverlay(mapStore.drawResult.id)
```

### stopEditDrawOverlay()

使用场景：结束当前绘图覆盖物编辑，并把修改后的结果写回 `mapStore.drawResult`。

示例：

```js
mapActions.stopEditDrawOverlay()
```

### deleteDrawOverlay(id)

使用场景：删除指定绘图覆盖物。`id` 不传时，默认删除当前激活或最近一次绘制的覆盖物。

示例：

```js
mapActions.deleteDrawOverlay(mapStore.drawResult.id)
```

### activateCoordinatePicker()

使用场景：业务层需要让用户在地图上点击一次，获取该位置经纬度，同时把坐标文本复制到剪贴板。顶部工具条的“拾取坐标”按钮就是调用这个方法。

调用后地图层会先退出测距、绘图、临时标点等占用点击事件的工具，然后等待下一次地图左键点击。点击完成后，地图层会写入 `mapStore.coordinatePickResult`，并把 `activeTool` 清空。

示例：

```js
mapActions.activateCoordinatePicker()
```

结果监听：

```js
watch: {
  'mapStore.coordinatePickResult'(result) {
    if (!result) return

    console.log(result.position) // [lng, lat]
    console.log(result.coordinate) // "lng,lat"
  }
}
```

`coordinatePickResult` 字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `position` | `[number, number]` | 经纬度数组 |
| `lng` | `number` | 经度 |
| `lat` | `number` | 纬度 |
| `coordinate` | `string` | 逗号拼接后的坐标文本，会被自动复制 |
| `timestamp` | `number` | 拾取时间戳 |

### activateCustomMarker()

使用场景：下一次点击地图时添加一个临时自定义点。

示例：

```js
mapActions.activateCustomMarker()
```

标点完成后，地图层会自动把坐标写入 `mapStore.customMarkerResult`。业务组件可以监听这个字段获取经纬度：

```js
import { mapActions, mapStore } from '@/map/map-store'

export default {
  data() {
    return {
      mapStore
    }
  },
  watch: {
    'mapStore.customMarkerResult'(marker) {
      if (!marker) return

      console.log(marker.position) // [lng, lat]
      console.log(marker.lng)
      console.log(marker.lat)
      console.log(marker.name)
    }
  },
  methods: {
    pickMarker() {
      mapActions.activateCustomMarker()
    }
  }
}
```

`customMarkerResult` 字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 本次临时标点 id，格式为 `custom-${timestamp}` |
| `type` | `custom-marker` | 结果类型 |
| `name` | `string` | 锚点名称，默认 `自定义锚点`，可通过右键菜单或 `updateCustomMarkerName()` 修改 |
| `position` | `[number, number]` | `[lng, lat]` 经纬度数组 |
| `lng` | `number` | 经度 |
| `lat` | `number` | 纬度 |
| `createdAt` | `number` | 生成时间戳 |
| `updatedAt` | `number` | 最近一次修改时间戳 |

自定义锚点支持右键菜单。用户在锚点上右键时，菜单包含下面几个动作；点击任意动作后菜单会自动收起：

| 菜单项 | 说明 |
| --- | --- |
| 修改名称 | 弹出名称输入框，确认后更新锚点名称、`title`、`label` 和 `customMarkerResult` |
| 保存锚点 | 不直接请求接口，而是写入 `mapStore.customMarkerSaveRequest`，由业务层监听后调用接口 |
| 删除锚点 | 删除当前锚点，并清空当前 `customMarkerResult` |

业务层保存接口示例：

```js
import { mapActions, mapStore } from '@/map/map-store'

export default {
  data() {
    return {
      mapStore
    }
  },
  watch: {
    async 'mapStore.customMarkerSaveRequest'(marker) {
      if (!marker) return

      await saveAnchorApi({
        id: marker.id,
        name: marker.name,
        lng: marker.lng,
        lat: marker.lat,
        position: marker.position
      })

      mapActions.clearCustomMarkerSaveRequest()
    }
  }
}
```

### updateCustomMarkerName(id, name)

使用场景：业务层通过自己的表单修改指定锚点名称。`id` 不传时，默认修改当前激活或最近一次创建的锚点。

示例：

```js
mapActions.updateCustomMarkerName(mapStore.customMarkerResult.id, '客户A')
```

### saveCustomMarker(id)

使用场景：业务层通过按钮触发保存请求。地图层会把锚点信息写入 `mapStore.customMarkerSaveRequest`，业务层监听后调用接口。

示例：

```js
mapActions.saveCustomMarker(mapStore.customMarkerResult.id)
```

### deleteCustomMarker(id)

使用场景：删除指定自定义锚点。`id` 不传时，默认删除当前激活或最近一次创建的锚点。

示例：

```js
mapActions.deleteCustomMarker(mapStore.customMarkerResult.id)
```

### setCustomMarkerResult(result) / clearCustomMarkerResult()

使用场景：`MapController` 写入自定义标点结果，或业务层开始新一轮选点前主动清空上一次结果。业务层通常只需要调用 `clearCustomMarkerResult()`。

示例：

```js
mapActions.clearCustomMarkerResult()
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

### renderWMSLayer(params)

使用场景：加载 GeoServer 发布的 OGC WMS 图片图层。WMS 是服务端按瓦片返回图片，不是 GeoJSON，所以它不走 `renderGeoJSONLayer()`，也不支持单个 Feature 高亮、分类显隐。

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `params.layerId` | `string` | WMS 图层唯一 id |
| `params.url` | `string` | GeoServer WMS 地址，例如 `/geoserver/demo/wms` |
| `params.visible` | `boolean` | 初始是否显示 |
| `params.opacity` | `number` | 图层透明度，范围 `0 - 1` |
| `params.zIndex` | `number` | 图层层级 |
| `params.zooms` | `[number, number]` | 可见缩放级别 |
| `params.blend` | `boolean` | 缩放切换时是否混合瓦片，透明图层通常建议 `false` |
| `params.param` | `object` | WMS GetMap 参数，传 `LAYERS`、`VERSION`、`FORMAT`、`TRANSPARENT`、`STYLES` 等 |

示例：

```js
mapActions.renderWMSLayer({
  layerId: 'geo-server-grid',
  url: 'http://内网地址/geoserver/demo/wms',
  visible: true,
  opacity: 0.85,
  zIndex: 60,
  zooms: [3, 20],
  blend: false,
  param: {
    LAYERS: 'demo:avg_price_grid',
    VERSION: '1.1.1',
    FORMAT: 'image/png',
    TRANSPARENT: true,
    STYLES: ''
  }
})
```

修改透明度、层级或切换 GeoServer 样式：

```js
mapActions.patchLayerStyle('geo-server-grid', {
  opacity: 0.5,
  zIndex: 80,
  param: {
    STYLES: 'heat_style'
  }
})
```

控制显示隐藏和清除：

```js
mapActions.setLayerVisible('geo-server-grid', false)
mapActions.setLayerVisible('geo-server-grid', true)
mapActions.clearLayer('geo-server-grid')
```

注意事项：

- GeoServer 图层建议发布或支持 `EPSG:3857`，高德 WMS 图层按 Web Mercator 瓦片体系请求。
- `BBOX`、`WIDTH`、`HEIGHT`、`REQUEST` 不需要业务层传，高德图层会按瓦片自动补。
- 透明叠加建议使用 `FORMAT: 'image/png'` 和 `TRANSPARENT: true`。
- 如果前端和 GeoServer 不同域，需要后端开启 CORS 或通过网关转发。

### setLayerVisible(layerId, visible)

使用场景：控制整个普通图层显示隐藏。

示例：

```js
mapActions.setLayerVisible('bank', false)
mapActions.setLayerVisible('bank', true)
```

### setLayerStyle(layerId, style)

使用场景：不重新传 GeoJSON，只更新整个普通图层样式。

注意：这是“替换式更新”。传入的 `style` 会成为新的图层样式，之前没有再次传入的样式字段不会保留。需要只改一两个字段时，优先使用 `patchLayerStyle()`。

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

### patchLayerStyle(layerId, stylePatch)

使用场景：不重新传 GeoJSON，只局部修改图层样式。适合热力图工具条改透明度、边界只改填充透明度、右侧筛选后临时调整点位颜色等。

行为说明：

| 项 | 说明 |
| --- | --- |
| 更新方式 | 深合并到当前图层样式上 |
| 支持图层 | 普通点线面图层、AMap 热力图、点聚合图层 |
| 是否重传 GeoJSON | 不需要 |
| 是否清空单要素高亮 | 不清空，`setFeatureStyle()` / `highlightFeature()` 的临时样式会保留 |
| 如何重置样式 | 使用 `setLayerStyle()` 传完整新样式，或重新调用 `renderGeoJSONLayer()` |

普通点线面示例：

```js
mapActions.patchLayerStyle('bank', {
  point: {
    color: '#f59e0b' // 只修改点颜色，保留原来的 renderer、size、label 等字段
  },
  polygon: {
    fillOpacity: 0.32 // 只修改面的填充透明度，保留边界颜色和线宽
  }
})
```

热力图工具条示例：

```js
mapActions.patchLayerStyle('bank-heatmap', {
  heatmap: {
    opacity: [0.15, 0.62] // 修改 AMap.HeatMap 透明度
  }
})
```

点聚合示例：

```js
mapActions.patchLayerStyle('bank-cluster', {
  cluster: {
    color: '#f97316' // 修改聚合气泡颜色，保留 gridSize、maxZoom 等聚合配置
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

注意：这是“替换式更新”。只想改透明度、半径、渐变里的某一项时，优先使用 `patchLayerStyle()`。

示例：

```js
locaActions.setLayerStyle('bank-mass', {
  radius: 7,
  color: '#f97316'
})
```

### patchLayerStyle(layerId, stylePatch)

使用场景：局部修改 Loca 图层样式或图层构造选项。适合海量点调半径、Loca 热力图工具条调透明度、网格热力图调网格大小等。

行为说明：

| 项 | 说明 |
| --- | --- |
| 更新方式 | 深合并到当前 `style` 和 `layerOptions` |
| 支持图层 | Loca 点、热力、网格、线、面等当前封装图层 |
| 是否重传 GeoJSON | 不需要 |
| 是否清空高亮 | 不清空，`highlightFeature()` / `setFeatureStyle()` 的临时高亮会保留 |
| `layerOptions` 变化 | 需要时会重建 Loca layer，但数据和显隐状态仍由封装层接管 |

海量点示例：

```js
locaActions.patchLayerStyle('bank-mass', {
  radius: 8.5,        // 修改点半径
  blurWidth: 0.35,    // 修改扩散宽度
  layerOptions: {
    opacity: 0.72     // 修改整个 Loca layer 透明度
  }
})
```

Loca 热力图工具条示例：

```js
locaActions.patchLayerStyle('bank-heat', {
  layerOptions: {
    opacity: 0.58
  },
  gradient: {
    0.2: '#22d3ee',
    0.7: '#facc15',
    1: '#ef4444'
  }
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
普通图层：渲染点线面、Patch普通样式、隐藏点、显示点、渲染边界、边界换色、清除边界、高亮点/线/面、取消高亮、前缀图层、清前缀、点聚合、Patch聚合样式、要素信息、图层信息、清空地图
Loca：海量点、换色、PatchLoca样式、高亮、清高亮、热力、网格、隐藏网点、显示网点、清除Loca、Loca信息、清空Loca
```

## 热力图工具条

组件位置：`src/components/HeatmapToolbar.vue`。

使用场景：业务侧渲染热力图后，需要在地图上展示热力值图例，并允许用户控制热力图显示隐藏、透明度。

当前示例：点击左下角 `Loca热力` 按钮后，会使用 `src/examples/loca-feature-examples.js` 中生成的测试点位数据渲染 Loca 热力图，并显示热力图工具条。

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `layerId` | `string` | 被控制的热力图图层 id |
| `mode` | `loca | map` | `loca` 控制 `locaActions`，`map` 控制 `mapActions` |
| `title` | `string` | 可选，工具条标题 |
| `stops` | `Array` | 可选，图例色带分段，包含 `value`、`color`、`label` |

工具条会根据 `layerId` 自动读取当前图层信息：

- Loca 图层读取 `getLayerInfo(layerId).layerOptions.opacity`。
- 普通 HeatMap 图层读取 `getLayerInfo(layerId).styleSnapshot.heatmap.opacity`。
- `visible` 会从 `getLayerInfo(layerId).visible` 回填。

示例：

```vue
<HeatmapToolbar
  v-if="heatmapToolbarVisible"
  layer-id="loca-example-heatmap"
  mode="loca"
  title="热力图"
/>
```

内部调用：

```js
locaActions.setLayerVisible(layerId, visible)
locaActions.patchLayerStyle(layerId, {
  layerOptions: {
    opacity: opacity / 100
  }
})
```

完整的一方法一示例索引在：

```js
import { mapMethodDemos, locaMethodDemos } from '@/examples/action-method-demos'

mapMethodDemos.renderGeoJSONLayer()
mapMethodDemos.patchLayerStyle()
mapMethodDemos.highlightFeature()
locaMethodDemos.renderGeoJSONLayer()
locaMethodDemos.patchLayerStyle()
locaMethodDemos.highlightFeature()
```

## 聚合点 SVG 样式

使用场景：`mapActions.renderGeoJSONClusterLayer()` 渲染点聚合时，需要把聚合点本身改成自定义 SVG 或图片。这里修改的是 `style.cluster`，不是单点的 `style.point`。

内联 SVG 示例：

```js
mapActions.renderGeoJSONClusterLayer({
  layerId: 'bank-cluster',
  visible: true,
  style: {
    gridSize: 80,
    cluster: {
      renderer: 'html',
      size: [52, 52],
      html: ({ count }) => `
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="23" fill="#1677ff" stroke="#fff" stroke-width="3"/>
          <text x="26" y="31" text-anchor="middle" font-size="16" fill="#fff">${count}</text>
        </svg>
      `
    }
  }
}, geoJSON)
```

SVG/PNG 文件示例：

```js
mapActions.renderGeoJSONClusterLayer({
  layerId: 'bank-cluster',
  visible: true,
  style: {
    gridSize: 80,
    cluster: {
      renderer: 'image',
      size: [52, 52],
      image: {
        src: '/cluster-icons/bank-cluster.svg'
      },
      text: ({ count }) => count
    }
  }
}, geoJSON)
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `cluster.renderer` | `html` 使用内联 HTML/SVG，`image` 使用 SVG/PNG 图片，不传则使用默认圆形数字样式 |
| `cluster.size` | 聚合点尺寸，例如 `[52, 52]` |
| `cluster.html` / `cluster.content` | `renderer: 'html'` 时使用，支持字符串或函数 |
| `cluster.image.src` / `cluster.image.url` | `renderer: 'image'` 时使用，支持本地路径、data URL、http 地址，也支持函数 |
| `cluster.text` | `renderer: 'image'` 时覆盖在图片上的数字文案，支持函数 |
| `cluster.label` | 设为 `false` 时，图片模式不显示覆盖文案 |
