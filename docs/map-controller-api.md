# MapController API

`MapController` 是业务状态层和高德地图实例之间的地图操作入口。业务组件不要直接调用 `AMap.Map`，统一通过 `mapActions` 发出命令。

## 工作方式

```text
业务代码
  -> mapActions.xxx()
  -> mapStore.commandQueue
  -> AmapMap.vue drainCommandQueue()
  -> controller.handleCommand(command)
  -> AMap.Map / AMap 覆盖物
```

`MapController` 不保存接口业务数据，只保存地图实例、工具实例和已渲染图层实例。

## 创建

地图初始化完成后创建：

```js
const controller = new MapController({
  AMap,
  map,
  actions: mapActions
})
```

参数说明：

| 字段 | 类型 | 用途 |
| --- | --- | --- |
| `AMap` | `object` | 离线包导出的高德命名空间。 |
| `map` | `AMap.Map` | 已创建的地图实例。 |
| `actions` | `object` | 当前传入 `mapActions`，用于必要时回写工具状态。 |

## 命令入口

`AmapMap.vue` 会按顺序消费 `mapStore.commandQueue`，并调用：

```js
controller.handleCommand(command)
```

命令结构：

```js
{
  seq: 1,
  type: 'layer:render',
  payload: {}
}
```

`seq` 用于保证命令按顺序消费，并清理已处理命令。

## 支持的命令

```text
ruler:start
ruler:clear
ruler:restart
draw:start
marker:start
zoom:in
zoom:out
map:center-by-coordinate
layer:render
layer:visible
layer:category-visible
layer:clear
layer:feature-style
layer:feature-style:clear
layer:feature-styles:clear
layer:fit-view
layer:focus
infowindow:close
```

## 示例：缩放地图

```js
mapActions.zoomIn()
mapActions.zoomOut()
```

内部命令：

```js
{ type: 'zoom:in' }
{ type: 'zoom:out' }
```

对应高德能力：

```js
map.zoomIn()
map.zoomOut()
```

## 示例：按坐标搜索定位

```js
mapActions.searchCoordinate('117.225,31.863')
```

内部会解析字符串：

```js
const position = keyword.split(',').map((item) => Number(item.trim()))
```

当解析结果是两个有效数字时，调用：

```js
map.setZoomAndCenter(14, position)
```

注意：当前入口只处理经纬度字符串，不做地址搜索、POI 搜索、逆地理编码。内网环境如果需要这些能力，应由业务接口返回坐标后再调用地图渲染或定位命令。

## 示例：测距工具

```js
mapActions.activateRuler()
```

内部命令：

```js
{ type: 'ruler:start' }
```

对应高德能力：

```js
new AMap.RangingTool(map, options)
rangingTool.turnOn()
```

清除：

```js
mapActions.clearRuler()
```

重新选择：

```js
mapActions.restartRuler()
```

注意：

- 测距依赖离线包中的 `AMap.RangingTool`。
- 如果离线包缺少该插件，控制台会输出 warning，并自动清空当前激活工具状态。
- `rangingTool.turnOff(true)` 会清除测距过程中生成的覆盖物。

## 示例：绘图工具

```js
mapActions.activateDraw('rectangle')
mapActions.activateDraw('circle')
mapActions.activateDraw('polygon')
```

内部命令：

```js
{
  type: 'draw:start',
  payload: {
    shape: 'polygon'
  }
}
```

对应高德能力：

```js
const mouseTool = new AMap.MouseTool(map)
mouseTool.rectangle(options)
mouseTool.circle(options)
mouseTool.polygon(options)
```

注意：

- 绘图依赖离线包中的 `AMap.MouseTool`。
- 开始绘图前会关闭测距工具和自定义标点监听。
- `mouseTool.close(false)` 会停止当前绘制操作，但保留已绘制的覆盖物。

## 示例：自定义标点

```js
mapActions.activateCustomMarker()
```

内部命令：

```js
{ type: 'marker:start' }
```

执行后，下一次点击地图会创建一个 `AMap.Marker`：

```js
new AMap.Marker({
  position: event.lnglat,
  content: '<div class="custom-map-marker"><span></span></div>',
  offset: new AMap.Pixel(-12, -24),
  title: '自定义标点',
  extData: {
    id: `custom-${Date.now()}`,
    type: 'custom-marker',
    position
  }
})
```

事件处理说明：

- 优先使用 `map.once('click', handler)`。
- 如果离线包不支持 `once`，则使用 `map.on` + 回调内 `map.off` 模拟一次性事件。
- 解绑时使用同一个 handler 引用，符合高德事件系统要求。

## 示例：渲染 GeoJSON 图层

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank',
  visible: true,
  category: 'bank',
  style: {
    point: {
      renderer: 'pin',
      color: '#1677ff'
    }
  }
}, geoJSON)
```

内部命令：

```js
{
  type: 'layer:render',
  payload: {
    layerId: 'bank',
    geoJSON,
    visible: true,
    style: {},
    defaultProperties: {
      category: 'bank'
    }
  }
}
```

`MapController.renderLayer()` 会按 `layerId` 获取或创建图层实例：

```js
const layer = this.getLayer(payload.layerId)
layer.setData(payload.geoJSON, payload.style)
```

如果 `payload.infoWindow` 存在，`MapController` 会包装当前图层的 `events.click`：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank',
  visible: true,
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
      context.close()
    }
  },
  events: {
    click(feature, event) {
      console.log('业务点击回调仍会执行', event.featureId)
    }
  }
}, geoJSON)
```

说明：

- 点击覆盖物时先打开共享信息窗体，再执行业务传入的 `events.click`。
- `fields` 模式会转义展示内容；`content` 字符串或函数返回值视为业务可信 HTML。
- `actions` 按钮统一走 `infoWindow.onAction(action, context)`，`context.close()` 会派发关闭当前信息窗体的动作。
- 信息窗体位置优先使用事件坐标；点覆盖物缺少事件坐标时读取覆盖物位置。
- 离线包缺少 `AMap.InfoWindow` 时，控制器会使用 `AMap.Marker` 承载同一份窗体内容。

图层渲染细节见：

- [map-geojson-layer-protocol.md](./map-geojson-layer-protocol.md)
- [map-style-protocol.md](./map-style-protocol.md)

## 示例：关闭点击信息窗体

```js
mapActions.closeInfoWindow()
```

内部命令：

```js
{
  type: 'infowindow:close'
}
```

说明：

- 关闭的是当前普通 GeoJSON 覆盖物点击打开的信息窗体。
- 使用 `AMap.InfoWindow` 时调用共享实例的 `close()`。
- 使用 Marker 承载窗体时会把该临时 Marker 从地图上移除。

## 示例：控制图层显示隐藏

```js
mapActions.setLayerVisible('bank', false)
mapActions.setLayerVisible('bank', true)
```

内部命令：

```js
{
  type: 'layer:visible',
  payload: {
    layerId: 'bank',
    visible: false
  }
}
```

说明：

- 图层必须先渲染过。
- 隐藏不会销毁图层数据。
- 再次显示不需要重新传 GeoJSON。

## 示例：控制图层内分类显示隐藏

```js
mapActions.setLayerCategoryVisible('bank', 'atm', false)
mapActions.setLayerCategoryVisible('bank', ['bank', 'atm'], true)
```

内部命令：

```js
{
  type: 'layer:category-visible',
  payload: {
    layerId: 'bank',
    category: 'atm',
    visible: false
  }
}
```

分类来自 `feature.properties.category`。分类显隐只作用于当前图层实例，不修改 GeoJSON 数据。

## 示例：清除图层覆盖物

```js
mapActions.clearLayer('region-boundary')
```

内部命令：

```js
{
  type: 'layer:clear',
  payload: {
    layerId: 'region-boundary'
  }
}
```

说明：

- 清除会销毁当前图层覆盖物，并从 `MapController` 的图层表中删除该图层。
- 清除后再次显示必须重新调用 `renderGeoJSONLayer`。
- 如果图层未渲染过，命令会直接忽略，不会创建空图层。

## 示例：读取图层信息

```js
const layers = mapActions.getLayerList()
const regionLayer = mapActions.getLayerInfo('region-boundary')
```

返回的是轻量元信息，不包含真实 `AMap.Marker`、`AMap.Polygon` 等覆盖物实例：

```js
{
  layerId: 'region-boundary',
  visible: true,
  featureCount: 1,
  overlayCount: 1,
  categories: ['city'],
  hiddenCategories: [],
  styledFeatureIds: [],
  geometryKinds: ['polygon'],
  hasHeatmap: false,
  updatedAt: 1710000000000
}
```

`layerRegistry` 会在渲染、显隐、分类显隐、清除、高亮样式变化时自动同步。

## 示例：修改指定要素样式

右侧列表点击某条数据时，传入图层 id 和 Feature id：

```js
mapActions.highlightFeature('bank', 'bank-001')
mapActions.focusFeature('bank', 'bank-001')
```

默认高亮会按几何类型分别应用：

```text
point   放大橙色图钉
line    加粗橙色线
polygon 橙色描边和填充
```

也可以完全自定义样式：

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

取消某个要素的临时样式：

```js
mapActions.clearFeatureStyle('bank', 'bank-001')
```

清除整个图层所有临时样式：

```js
mapActions.clearLayerFeatureStyles('bank')
```

说明：

- 这些样式是临时覆盖，不会修改接口返回的 GeoJSON。
- 取消临时样式后，会恢复到 `renderGeoJSONLayer` 时传入的图层样式。
- 点、线、面统一按 Feature id 定位。裸 Geometry 默认 id 是 `geometry-0`，也可以通过 `properties.id` 指定稳定 id。
- `focusFeature` 可以和高亮一起使用，让右侧列表对应的点、线、面进入地图视野。

## 示例：让图层进入视野

```js
mapActions.renderGeoJSONLayer({
  layerId: 'region',
  visible: true
}, polygon)

mapActions.fitLayerView('region', {
  padding: [80, 80, 80, 80],
  maxZoom: 16
})
```

内部命令：

```js
{
  type: 'layer:fit-view',
  payload: {
    layerId: 'region',
    options: {
      padding: [80, 80, 80, 80],
      maxZoom: 16
    }
  }
}
```

说明：

- `fitLayerView` 只对已经渲染过的图层生效，不会创建空图层。
- 该命令会按 `map-store` 命令队列顺序执行。紧跟在 `renderGeoJSONLayer` 后调用时，会先渲染，再调用 `map.setFitView`。
- `padding` 支持 `[top, right, bottom, left]`，也支持 `[vertical, horizontal]`。
- `maxZoom` 可选，用来限制自动缩放的最大级别。

## 示例：定位图层要素

渲染时带 `selection`：

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

内部会额外发送：

```js
{
  type: 'layer:focus',
  payload: {
    type: 'bank',
    id: 'bank-001'
  }
}
```

说明：

- `type` 当前按图层 id 使用。
- 点要素优先使用 `setZoomAndCenter(14, position)`。
- 线面要素使用 `setFitView([overlay], false, [80, 80, 80, 80])`。

## 生命周期

组件销毁时必须调用：

```js
controller.destroy()
```

清理内容：

```text
测距工具覆盖物
MouseTool 当前操作
自定义标点 click 监听
临时自定义 Marker
所有 GeoJSON 图层
AMap.Map 实例
```

`AmapMap.vue` 还会在销毁前解绑 `moveend`、`zoomend` 事件，并移除比例尺控件。

## 离线包能力检查

当前代码对下面能力做了缺失保护：

```text
AMap.Scale           缺失时跳过比例尺控件，并输出 warning
AMap.RangingTool     缺失时测距命令自动结束，并输出 warning
AMap.MouseTool       缺失时绘图命令自动结束，并输出 warning
AMap.Marker          缺失时自定义标点命令自动结束，并输出 warning
AMap.HeatMap         缺失时热力图不渲染，并输出 warning
```
