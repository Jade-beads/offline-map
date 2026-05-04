# 地图 API 参考手册

> 适用对象：需要按“接口字典”方式逐项查询参数、返回值、字段含义的开发人员。
>
> 目标：把当前项目中对外可调用的地图 API、GeoJSON 协议、样式协议全部表格化整理，作为正式接口手册使用。

---

## 1. 文档目录

- 1）GeoJSON 数据协议
- 2）`mapActions` 接口手册
- 3）`locaActions` 接口手册
- 4）普通地图样式协议
- 5）Loca 样式协议
- 6）返回信息结构
- 7）推荐调用模板

---

## 2. GeoJSON 数据协议

### 2.1 支持的数据格式

| 数据格式 | 是否支持 | 说明 |
| --- | --- | --- |
| `FeatureCollection` | 是 | 推荐使用 |
| 单个 `Feature` | 是 | 适合单对象渲染 |
| 单个 `Geometry` | 是 | 适合只渲染一个 Point / Polygon |
| `Feature[]` | 是 | 会自动转为内部 Feature 列表 |
| `Geometry[]` | 是 | 会自动包装成 Feature |

### 2.2 推荐标准格式

```js
const geoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'feature-001',
      properties: {
        id: 'feature-001',
        name: '示例要素',
        category: 'branch',
        value: 86,
        shortName: '中'
      },
      geometry: {
        type: 'Point',
        coordinates: [117.2272, 31.8206]
      }
    }
  ]
}
```

### 2.3 Feature 结构说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `type` | `string` | 是 | 固定为 `Feature` |
| `id` | `string \| number` | 强烈推荐 | 要素唯一标识 |
| `properties` | `object` | 推荐 | 业务属性 |
| `geometry` | `object` | 是 | GeoJSON 几何对象 |

### 2.4 properties 推荐字段说明

| 字段 | 类型 | 是否推荐 | 用途 |
| --- | --- | --- | --- |
| `id` | `string \| number` | 强烈推荐 | feature id 兜底 |
| `name` | `string` | 推荐 | 显示名称 |
| `category` | `string` | 强烈推荐 | 分类样式、分类显隐 |
| `shortName` | `string` | 推荐 | pin 点内部文字 |
| `value` | `number` | 推荐 | 热力图 / Loca 数值字段 |
| `mapStyle` | `object` | 按需 | 单要素样式覆盖 |

### 2.5 geometry 支持类型

| geometry.type | 支持 | 常见用途 |
| --- | --- | --- |
| `Point` | 是 | 点位 |
| `MultiPoint` | 是 | 多点位 |
| `LineString` | 是 | 路线 / 轨迹 |
| `MultiLineString` | 是 | 多段线 |
| `Polygon` | 是 | 区域 / 边界 |
| `MultiPolygon` | 是 | 多区域 |

### 2.6 Polygon 坐标要求

| 项目 | 说明 |
| --- | --- |
| 坐标层级 | `coordinates: [[ [lng, lat], ... ]]` |
| 是否建议首尾闭合 | 建议闭合 |
| 是否支持洞 | 支持，通过多 ring 表达 |
| 是否支持多个面 | 支持，使用 `MultiPolygon` |

---

## 3. mapActions 接口手册

文件位置：`src/map/map-store.js`

### 3.1 总览

| 方法名 | 主要用途 | 是否建议业务直接调用 |
| --- | --- | --- |
| `setActiveTool` | 设置当前工具状态 | 一般不需要 |
| `dispatchMapCommand` | 直接派发底层命令 | 一般不需要 |
| `clearHandledCommands` | 清理命令队列 | 不建议 |
| `setDrawResult` | 写入绘图结果 | 一般不需要 |
| `clearDrawResult` | 清空绘图结果 | 建议 |
| `setLayerInfo` | 写入图层信息 | 不建议 |
| `removeLayerInfo` | 删除图层信息 | 不建议 |
| `clearLayerInfo` | 清空图层信息 | 不建议 |
| `getLayerList` | 获取图层列表 | 建议 |
| `getLayerInfo` | 获取图层信息 | 建议 |
| `getFeatureInfo` | 获取要素信息 | 建议 |
| `activateRuler` | 启用测距 | 建议 |
| `clearRuler` | 清除测距 | 建议 |
| `restartRuler` | 重新测距 | 建议 |
| `activateDraw` | 启用绘图 | 建议 |
| `activateCustomMarker` | 启用自定义标点 | 建议 |
| `zoomIn` | 放大 | 建议 |
| `zoomOut` | 缩小 | 建议 |
| `searchCoordinate` | 坐标定位 | 建议 |
| `renderGeoJSONLayer` | 渲染普通地图图层 | 强烈建议 |
| `setLayerVisible` | 图层显隐 | 强烈建议 |
| `setLayerStyle` | 修改图层样式 | 强烈建议 |
| `setLayerCategoryVisible` | 分类显隐 | 强烈建议 |
| `setFeaturesVisible` | 指定要素显隐 | 强烈建议 |
| `clearLayer` | 清除单图层 | 强烈建议 |
| `clearAllLayers` | 清除所有普通图层 | 强烈建议 |
| `clearLayerByPrefix` | 按前缀清除图层 | 建议 |
| `setFeatureStyle` | 单要素改样式 | 强烈建议 |
| `highlightFeature` | 单要素默认高亮 | 强烈建议 |
| `clearFeatureStyle` | 清除单要素样式 | 强烈建议 |
| `clearLayerFeatureStyles` | 清除图层内全部单要素样式 | 强烈建议 |
| `focusFeature` | 聚焦指定要素 | 强烈建议 |
| `fitLayerView` | 图层视野定位 | 强烈建议 |
| `setViewport` | 手动改 store 视野 | 一般不需要 |

---

### 3.2 setActiveTool(toolId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `setActiveTool(toolId)` |
| 主要用途 | 只改当前激活工具状态 |
| 典型场景 | 需要手动同步工具栏状态时 |
| 是否建议直接调用 | 一般不需要，通常直接调用 `activateRuler` / `activateDraw` 等更高层方法 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `toolId` | `string` | 是 | 例如 `ruler`、`draw:polygon`、`custom-marker` |

示例：

```js
mapActions.setActiveTool('ruler')
```

---

### 3.3 dispatchMapCommand(type, payload)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `dispatchMapCommand(type, payload)` |
| 主要用途 | 底层命令派发入口 |
| 是否建议直接调用 | 不建议，除非做底层调试 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `type` | `string` | 是 | 底层命令名 |
| `payload` | `any` | 否 | 命令参数 |

示例：

```js
mapActions.dispatchMapCommand('zoom:in')
```

---

### 3.4 clearHandledCommands(seq)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `clearHandledCommands(seq)` |
| 主要用途 | 清理已消费命令 |
| 是否建议直接调用 | 不建议 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `seq` | `number` | 是 | 已处理到的命令序号 |

---

### 3.5 setDrawResult(result)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `setDrawResult(result)` |
| 主要用途 | 写入绘图结果 |
| 是否建议直接调用 | 一般不需要 |

### 3.6 clearDrawResult()

| 项目 | 说明 |
| --- | --- |
| 方法名 | `clearDrawResult()` |
| 主要用途 | 清空历史绘图结果 |
| 典型场景 | 开始新一轮绘图前先重置 |
| 是否建议直接调用 | 建议 |

示例：

```js
mapActions.clearDrawResult()
mapActions.activateDraw('polygon')
```

---

### 3.7 getLayerList()

| 项目 | 说明 |
| --- | --- |
| 方法名 | `getLayerList()` |
| 返回 | `Array<LayerInfo>` |
| 主要用途 | 获取全部普通图层信息 |
| 典型场景 | 图层面板、调试面板 |

示例：

```js
const layers = mapActions.getLayerList()
```

### 3.8 getLayerInfo(layerId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `getLayerInfo(layerId)` |
| 返回 | `LayerInfo \| null` |
| 主要用途 | 获取单图层信息 |
| 典型场景 | 判断图层是否已存在、读当前状态 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `layerId` | `string` | 是 | 图层 id |

示例：

```js
const layer = mapActions.getLayerInfo('bank-layer')
```

### 3.9 getFeatureInfo(layerId, featureId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `getFeatureInfo(layerId, featureId)` |
| 返回 | `FeatureInfo \| null` |
| 主要用途 | 获取单个要素元信息 |
| 典型场景 | 列表选中后读取属性 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `layerId` | `string` | 是 | 图层 id |
| `featureId` | `string \| number` | 是 | 要素 id |

示例：

```js
const feature = mapActions.getFeatureInfo('bank-layer', 'bank-001')
```

---

### 3.10 activateRuler()

| 项目 | 说明 |
| --- | --- |
| 方法名 | `activateRuler()` |
| 主要用途 | 启用测距工具 |
| 典型场景 | 距离测量 |
| 是否建议直接调用 | 建议 |

示例：

```js
mapActions.activateRuler()
```

### 3.11 clearRuler()

| 项目 | 说明 |
| --- | --- |
| 方法名 | `clearRuler()` |
| 主要用途 | 清除测距 |
| 典型场景 | 退出测距、删除测距结果 |

### 3.12 restartRuler()

| 项目 | 说明 |
| --- | --- |
| 方法名 | `restartRuler()` |
| 主要用途 | 重新开始测距 |
| 典型场景 | 用户想重新选起点 |

---

### 3.13 activateDraw(shape)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `activateDraw(shape)` |
| 主要用途 | 启用绘图工具 |
| 典型场景 | 框选范围、多边形区域、圆形区域 |
| 是否建议直接调用 | 建议 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `shape` | `'rectangle' \| 'circle' \| 'polygon'` | 是 | 绘图类型 |

示例：

```js
mapActions.activateDraw('rectangle')
mapActions.activateDraw('circle')
mapActions.activateDraw('polygon')
```

绘图结果读取：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `shape` | `string` | 绘图类型 |
| `geoJSON` | `Feature` | 绘图结果 |
| `bounds` | `object \| null` | 范围边界 |
| `thumbnail` | `string` | 截图 base64 |
| `thumbnailError` | `string` | 截图失败说明 |

---

### 3.14 activateCustomMarker()

| 项目 | 说明 |
| --- | --- |
| 方法名 | `activateCustomMarker()` |
| 主要用途 | 下一次点击地图时放一个临时点 |
| 典型场景 | 手工选点 |
| 是否建议直接调用 | 建议 |

示例：

```js
mapActions.activateCustomMarker()
```

---

### 3.15 zoomIn() / zoomOut()

| 方法名 | 主要用途 | 是否建议直接调用 |
| --- | --- | --- |
| `zoomIn()` | 放大地图 | 建议 |
| `zoomOut()` | 缩小地图 | 建议 |

示例：

```js
mapActions.zoomIn()
mapActions.zoomOut()
```

---

### 3.16 searchCoordinate(keyword)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `searchCoordinate(keyword)` |
| 主要用途 | 按经纬度字符串定位 |
| 典型场景 | 后端返回坐标后快速定位 |
| 是否建议直接调用 | 建议 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `keyword` | `string` | 是 | 格式：`lng,lat` |

示例：

```js
mapActions.searchCoordinate('117.2272,31.8206')
```

---

### 3.17 renderGeoJSONLayer(params, geoJSON)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `renderGeoJSONLayer(params, geoJSON)` |
| 主要用途 | 渲染普通地图图层 |
| 典型场景 | 点、线、面、热力图 |
| 是否建议直接调用 | 强烈建议 |

#### params 参数表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `layerId` | `string` | 是 | 无 | 图层唯一标识 |
| `visible` | `boolean` | 否 | 新图层通常显示 | 初始显示状态 |
| `style` | `object` | 否 | `{}` | 图层样式 |
| `category` | `string` | 否 | 无 | 给裸 Geometry 补默认分类 |
| `properties` | `object` | 否 | `{}` | 给裸 Geometry 补默认属性 |
| `selection` | `object` | 否 | 无 | 渲染后聚焦指定要素 |

#### selection 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `type` | `string` | 是 | 一般传图层类型或 layer 标识 |
| `id` | `string \| number` | 是 | feature id |

#### geoJSON 参数表

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `geoJSON` | `FeatureCollection \| Feature \| Geometry \| Array` | 是 | 图层数据 |

#### 示例

```js
mapActions.renderGeoJSONLayer({
  layerId: 'mixed-layer',
  visible: true,
  style: {
    point: {
      renderer: 'pin',
      color: '#2563eb',
      size: 30
    },
    line: {
      strokeColor: '#16a34a',
      strokeWeight: 4
    },
    polygon: {
      fillColor: '#7c3aed',
      fillOpacity: 0.14,
      strokeColor: '#7c3aed',
      strokeWeight: 2
    }
  }
}, geoJSON)
```

---

### 3.18 setLayerVisible(layerId, visible)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `setLayerVisible(layerId, visible)` |
| 主要用途 | 控制整层显隐 |
| 是否建议直接调用 | 强烈建议 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `layerId` | `string` | 是 | 图层 id |
| `visible` | `boolean` | 是 | 是否显示 |

---

### 3.19 setLayerStyle(layerId, style)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `setLayerStyle(layerId, style)` |
| 主要用途 | 修改整个图层样式 |
| 是否建议直接调用 | 强烈建议 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `layerId` | `string` | 是 | 图层 id |
| `style` | `object` | 是 | 样式对象 |

注意：执行后会清空当前图层已有的 feature 级样式覆盖。

---

### 3.20 setLayerCategoryVisible(layerId, category, visible)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `setLayerCategoryVisible(layerId, category, visible)` |
| 主要用途 | 按 `properties.category` 控制分类显隐 |
| 是否建议直接调用 | 强烈建议 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `layerId` | `string` | 是 | 图层 id |
| `category` | `string \| string[]` | 是 | 分类名或分类数组 |
| `visible` | `boolean` | 是 | 是否显示 |

---

### 3.21 setFeaturesVisible(layerId, featureIds, visible)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `setFeaturesVisible(layerId, featureIds, visible)` |
| 主要用途 | 按 feature id 控制显隐 |
| 是否建议直接调用 | 强烈建议 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `layerId` | `string` | 是 | 图层 id |
| `featureIds` | `string \| number \| Array<string \| number>` | 是 | 要素 id 或 id 数组 |
| `visible` | `boolean` | 是 | 是否显示 |

---

### 3.22 clearLayer(layerId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `clearLayer(layerId)` |
| 主要用途 | 删除单个图层 |
| 是否建议直接调用 | 强烈建议 |

### 3.23 clearAllLayers()

| 项目 | 说明 |
| --- | --- |
| 方法名 | `clearAllLayers()` |
| 主要用途 | 删除全部普通图层 |
| 是否建议直接调用 | 强烈建议 |

### 3.24 clearLayerByPrefix(prefix)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `clearLayerByPrefix(prefix)` |
| 主要用途 | 按图层名前缀清除一批图层 |
| 典型场景 | 清空临时搜索结果、临时绘制层 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `prefix` | `string` | 是 | 图层名前缀 |

---

### 3.25 setFeatureStyle(layerId, featureId, style)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `setFeatureStyle(layerId, featureId, style)` |
| 主要用途 | 给单个 feature 设置样式覆盖 |
| 是否建议直接调用 | 强烈建议 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `layerId` | `string` | 是 | 图层 id |
| `featureId` | `string \| number` | 是 | 要素 id |
| `style` | `object` | 是 | 单要素样式 |

#### 点高亮示例

```js
mapActions.setFeatureStyle('bank-layer', 'bank-001', {
  point: {
    renderer: 'pin',
    color: '#f59e0b',
    size: 36,
    zIndex: 120
  }
})
```

#### 线高亮示例

```js
mapActions.setFeatureStyle('route-layer', 'route-001', {
  line: {
    strokeColor: '#f59e0b',
    strokeWeight: 6,
    zIndex: 120
  }
})
```

#### 面高亮示例

```js
mapActions.setFeatureStyle('region-layer', 'region-001', {
  polygon: {
    fillColor: '#f59e0b',
    fillOpacity: 0.28,
    strokeColor: '#f59e0b',
    strokeWeight: 4,
    zIndex: 120
  }
})
```

---

### 3.26 highlightFeature(layerId, featureId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `highlightFeature(layerId, featureId)` |
| 主要用途 | 使用默认高亮样式高亮单个 feature |
| 是否建议直接调用 | 强烈建议 |

---

### 3.27 clearFeatureStyle(layerId, featureId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `clearFeatureStyle(layerId, featureId)` |
| 主要用途 | 清除单个 feature 样式覆盖 |
| 是否建议直接调用 | 强烈建议 |

---

### 3.28 clearLayerFeatureStyles(layerId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `clearLayerFeatureStyles(layerId)` |
| 主要用途 | 清空图层内全部 feature 覆盖样式 |
| 是否建议直接调用 | 强烈建议 |

---

### 3.29 focusFeature(layerId, featureId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `focusFeature(layerId, featureId)` |
| 主要用途 | 聚焦到某个 feature |
| 是否建议直接调用 | 强烈建议 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `layerId` | `string` | 是 | 图层 id |
| `featureId` | `string \| number` | 是 | 要素 id |

说明：

- 点位会直接以该点为中心定位
- 线和面通常会尽量定位到对应覆盖物范围

---

### 3.30 fitLayerView(layerId, options)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `fitLayerView(layerId, options)` |
| 主要用途 | 定位到整个图层可视范围 |
| 是否建议直接调用 | 强烈建议 |

参数：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `layerId` | `string` | 是 | 无 | 图层 id |
| `options.padding` | `number[]` | 否 | `[80, 80, 80, 80]` | 地图边距 |
| `options.maxZoom` | `number` | 否 | 无 | 最大缩放等级 |

`padding` 支持：

- `[x, y]`
- `[top, right, bottom, left]`

示例：

```js
mapActions.fitLayerView('bank-layer', {
  padding: [80, 80],
  maxZoom: 14
})
```

---

### 3.31 setViewport(viewportPatch)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `setViewport(viewportPatch)` |
| 主要用途 | 手动更新 store 中记录的视野 |
| 是否建议直接调用 | 一般不需要 |

---

## 4. locaActions 接口手册

文件位置：`src/loca/loca-store.js`

### 4.1 总览

| 方法名 | 主要用途 | 是否建议业务直接调用 |
| --- | --- | --- |
| `dispatchLocaCommand` | 派发底层命令 | 一般不需要 |
| `clearHandledCommands` | 清理命令队列 | 不建议 |
| `setLayerInfo` | 写图层信息 | 不建议 |
| `removeLayerInfo` | 删除图层信息 | 不建议 |
| `clearLayerInfo` | 清空图层信息 | 不建议 |
| `getLayerList` | 获取图层列表 | 建议 |
| `getLayerInfo` | 获取图层信息 | 建议 |
| `getFeatureInfo` | 获取要素信息 | 建议 |
| `renderGeoJSONLayer` | 渲染 Loca 图层 | 强烈建议 |
| `setLayerVisible` | 图层显隐 | 强烈建议 |
| `setLayerCategoryVisible` | 分类显隐 | 强烈建议 |
| `setFeaturesVisible` | 要素显隐 | 强烈建议 |
| `setLayerStyle` | 修改图层样式 | 强烈建议 |
| `setFeatureStyle` | 单要素样式覆盖 | 强烈建议 |
| `highlightFeature` | 单要素高亮 | 强烈建议 |
| `clearFeatureStyle` | 清除单要素样式 | 强烈建议 |
| `clearLayerFeatureStyles` | 清除全部单要素样式 | 强烈建议 |
| `fitLayerView` | 图层视野定位 | 强烈建议 |
| `clearLayer` | 清除单个图层 | 强烈建议 |
| `clearAllLayers` | 清除全部图层 | 强烈建议 |

---

### 4.2 renderGeoJSONLayer(params, geoJSON)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `renderGeoJSONLayer(params, geoJSON)` |
| 主要用途 | 渲染 Loca 图层 |
| 是否建议直接调用 | 强烈建议 |

#### params 参数表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `layerId` | `string` | 是 | 无 | 图层唯一标识 |
| `type` | `string` | 否 | 自动推断或 `point` | 图层类型 |
| `visible` | `boolean` | 否 | `false/true` 取决于调用 | 初始显示状态 |
| `layerOptions` | `object` | 否 | `{}` | Loca 图层构造参数 |
| `style` | `object` | 否 | `{}` | 视觉样式 |
| `category` | `string` | 否 | 无 | 裸 Geometry 默认分类 |
| `properties` | `object` | 否 | `{}` | 裸 Geometry 默认属性 |

#### type 可选值

| type | 对应图层 |
| --- | --- |
| `point` | `Loca.PointLayer` |
| `points` | `Loca.PointLayer` |
| `scatter` | `Loca.ScatterLayer` |
| `icon` | `Loca.IconLayer` |
| `heatmap` / `heat` | `Loca.HeatMapLayer` |
| `grid` | `Loca.GridLayer` |
| `polygon` / `polygons` | `Loca.PolygonLayer` |
| `line` / `lines` | `Loca.LineLayer` |

#### layerOptions 常见字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `zIndex` | `number` | 图层层级 |
| `opacity` | `number` | 图层透明度 |
| `blend` | `string` | 混合模式 |
| `zooms` | `number[]` | 缩放范围 |
| `hasSide` | `boolean` | 网格 / 面类图层常用 |

---

### 4.3 setLayerVisible(layerId, visible)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `setLayerVisible(layerId, visible)` |
| 主要用途 | 控制整层显隐 |
| 是否建议直接调用 | 强烈建议 |

---

### 4.4 setLayerCategoryVisible(layerId, category, visible)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `setLayerCategoryVisible(layerId, category, visible)` |
| 主要用途 | 按分类显隐 |
| 是否建议直接调用 | 强烈建议 |

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `layerId` | `string` | 是 | 图层 id |
| `category` | `string \| string[]` | 是 | 分类名 |
| `visible` | `boolean` | 是 | 是否显示 |

---

### 4.5 setFeaturesVisible(layerId, featureIds, visible)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `setFeaturesVisible(layerId, featureIds, visible)` |
| 主要用途 | 按 id 显隐要素 |
| 是否建议直接调用 | 强烈建议 |

---

### 4.6 setLayerStyle(layerId, style)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `setLayerStyle(layerId, style)` |
| 主要用途 | 更新整层视觉样式 |
| 是否建议直接调用 | 强烈建议 |

注意：如果传入 `layerOptions` 有变化，底层可能重建图层。

---

### 4.7 setFeatureStyle(layerId, featureId, style)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `setFeatureStyle(layerId, featureId, style)` |
| 主要用途 | 给单个要素叠加样式覆盖 |
| 是否建议直接调用 | 强烈建议 |

示例：

```js
locaActions.setFeatureStyle('bank-mass', 'bank-001', {
  radius: 14,
  color: '#f59e0b',
  borderWidth: 1,
  blurWidth: 0.2
})
```

---

### 4.8 highlightFeature(layerId, featureId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `highlightFeature(layerId, featureId)` |
| 主要用途 | 给单个要素套用默认高亮 |
| 是否建议直接调用 | 强烈建议 |

---

### 4.9 clearFeatureStyle(layerId, featureId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `clearFeatureStyle(layerId, featureId)` |
| 主要用途 | 清除单要素样式 |
| 是否建议直接调用 | 强烈建议 |

---

### 4.10 clearLayerFeatureStyles(layerId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `clearLayerFeatureStyles(layerId)` |
| 主要用途 | 清空图层内全部单要素样式 |
| 是否建议直接调用 | 强烈建议 |

---

### 4.11 fitLayerView(layerId, options)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `fitLayerView(layerId, options)` |
| 主要用途 | 定位到整个 Loca 图层范围 |
| 是否建议直接调用 | 强烈建议 |

参数：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `layerId` | `string` | 是 | 无 | 图层 id |
| `options.padding` | `number[]` | 否 | `[80, 80, 80, 80]` | 边距 |

注意：当前 Loca `fitLayerView` 没有 `maxZoom` 参数。

---

### 4.12 clearLayer(layerId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `clearLayer(layerId)` |
| 主要用途 | 删除单个 Loca 图层 |
| 是否建议直接调用 | 强烈建议 |

### 4.13 clearAllLayers()

| 项目 | 说明 |
| --- | --- |
| 方法名 | `clearAllLayers()` |
| 主要用途 | 删除全部 Loca 图层 |
| 是否建议直接调用 | 强烈建议 |

---

### 4.14 getLayerList() / getLayerInfo() / getFeatureInfo()

#### getLayerList()

| 项目 | 说明 |
| --- | --- |
| 方法名 | `getLayerList()` |
| 返回 | `Array<LocaLayerInfo>` |
| 用途 | 获取全部 Loca 图层信息 |

#### getLayerInfo(layerId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `getLayerInfo(layerId)` |
| 返回 | `LocaLayerInfo \| null` |
| 用途 | 获取单个图层信息 |

#### getFeatureInfo(layerId, featureId)

| 项目 | 说明 |
| --- | --- |
| 方法名 | `getFeatureInfo(layerId, featureId)` |
| 返回 | `FeatureInfo \| null` |
| 用途 | 获取单个要素信息 |

---

## 5. 普通地图样式协议手册

文件位置：`src/map/style-resolver.js`、`src/map/layer-registry.js`

### 5.1 style 总结构

```js
style: {
  point: {},
  line: {},
  polygon: {},
  heatmap: {},
  categories: {},
  rules: []
}
```

### 5.2 样式优先级

| 优先级顺序 | 来源 | 说明 |
| --- | --- | --- |
| 1 | 默认样式 | 系统内置默认值 |
| 2 | `style.point / line / polygon` | 图层基础样式 |
| 3 | `style.categories[category]` | 分类样式 |
| 4 | `style.rules` | 条件规则样式 |
| 5 | `feature.properties.mapStyle` | 单 feature 自带样式 |
| 6 | `setFeatureStyle()` | 运行时单 feature 覆盖 |

### 5.3 point 样式字段总表

#### 通用点样式字段

| 字段 | 类型 | 适用 renderer | 说明 |
| --- | --- | --- | --- |
| `renderer` | `string` | 全部 | `pin` / `image` / `html` / `circle` |
| `visible` | `boolean` | 全部 | 是否显示 |
| `zIndex` | `number` | 全部 | 层级 |
| `zooms` | `number[]` | 全部 | 缩放范围 |
| `cursor` | `string` | 全部 | 鼠标样式 |
| `bubble` | `boolean` | 全部 | 是否冒泡 |
| `clickable` | `boolean` | marker 类 | 是否可点击 |
| `draggable` | `boolean` | marker / circle | 是否可拖拽 |
| `topWhenClick` | `boolean` | marker 类 | 点击置顶 |
| `offset` | `number[]` | marker 类 | 偏移 |
| `anchor` | `string` | marker 类 | 锚点 |
| `angle` | `number` | marker 类 | 旋转角度 |

#### pin 专属字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `color` | `string` | 图钉颜色 |
| `size` | `number \| number[]` | 图钉大小 |
| `textField` | `string` | 图钉文本来源字段 |
| `text` | `string` | 固定文本 |
| `textLength` | `number` | 文本截断长度 |
| `fontSize` | `number` | 文本字号 |
| `label.visible` | `boolean` | 是否显示 label |
| `label.field` | `string` | label 文本字段 |
| `label.content` | `string` | 固定 label 文本 |
| `label.direction` | `string` | label 方向 |
| `label.offset` | `number[]` | label 偏移 |

#### image 专属字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `image.src` / `image.url` | `string` | 图标地址 |
| `image.size` | `number[]` | 图标尺寸 |
| `image.imageSize` | `number[]` | 原图尺寸 |
| `image.offset` | `number[]` | 图标偏移 |

#### html 专属字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `html` | `string` | HTML 内容 |
| `content` | `string` | HTML 内容别名 |

#### circle 专属字段

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

### 5.4 line 样式字段总表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `strokeColor` | `string` | 线颜色 |
| `strokeOpacity` | `number` | 透明度 |
| `strokeWeight` | `number` | 线宽 |
| `strokeStyle` | `string` | `solid` / `dashed` |
| `strokeDasharray` | `number[]` | 虚线配置 |
| `isOutline` | `boolean` | 是否描边 |
| `outlineColor` | `string` | 外描边颜色 |
| `borderWeight` | `number` | 外描边宽度 |
| `lineCap` | `string` | 端点样式 |
| `lineJoin` | `string` | 拐点样式 |
| `geodesic` | `boolean` | 是否大地线 |
| `showDir` | `boolean` | 是否显示方向箭头 |
| `visible` | `boolean` | 是否显示 |
| `zIndex` | `number` | 层级 |
| `zooms` | `number[]` | 缩放范围 |
| `cursor` | `string` | 鼠标样式 |
| `bubble` | `boolean` | 是否冒泡 |

### 5.5 polygon 样式字段总表

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
| `cursor` | `string` | 鼠标样式 |
| `bubble` | `boolean` | 是否冒泡 |
| `draggable` | `boolean` | 是否可拖拽 |

### 5.6 heatmap 样式字段总表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `valueField` | `string` | 热力值字段名，默认 `value` |
| `radius` | `number` | 热力半径 |
| `opacity` | `number[]` | 透明度范围 |
| `gradient` | `object` | 热力颜色映射 |
| `max` | `number` | 最大值 |
| `visible` | `boolean` | 是否显示 |
| `zIndex` | `number` | 层级 |
| `zooms` | `number[]` | 缩放范围 |
| `3d` | `boolean` | 是否启用 3D |

### 5.7 categories 分类样式结构

```js
style: {
  categories: {
    branch: {
      point: {
        color: '#1677ff'
      }
    },
    atm: {
      point: {
        color: '#16a34a'
      }
    }
  }
}
```

### 5.8 rules 规则样式结构

#### 结构说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `category` | `string` | 否 | 分类匹配 |
| `when` | `object` | 否 | 多字段精确匹配 |
| `field` | `string` | 否 | 单字段匹配 |
| `value` | `any` | 否 | 字段等值匹配 |
| `in` | `Array<any>` | 否 | 枚举匹配 |
| `min` | `number` | 否 | 最小值匹配 |
| `max` | `number` | 否 | 最大值匹配 |
| `test` | `function` | 否 | 自定义函数匹配 |
| `style` | `object` | 是 | 命中后追加的样式 |

#### 示例

```js
style: {
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
      when: {
        level: 'high',
        city: 'hefei'
      },
      style: {
        polygon: {
          fillColor: '#ef4444'
        }
      }
    }
  ]
}
```

### 5.9 动态字段映射总表

| 字段 | 作用目标 |
| --- | --- |
| `colorBy` | 映射到 `color` |
| `sizeBy` | 映射到 `size` |
| `radiusBy` | 映射到 `radius` |
| `fillColorBy` | 映射到 `fillColor` |
| `fillOpacityBy` | 映射到 `fillOpacity` |
| `strokeColorBy` | 映射到 `strokeColor` |
| `strokeOpacityBy` | 映射到 `strokeOpacity` |
| `strokeWeightBy` | 映射到 `strokeWeight` |
| `opacityBy` | 映射到 `opacity` |
| `zIndexBy` | 映射到 `zIndex` |

#### 动态映射对象格式

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `field` | `string` | 是 | 来源字段 |
| `stops` | `Array<[number, any]>` | 否 | 阶梯 / 插值映射 |
| `map` | `object` | 否 | 枚举映射 |
| `default` | `any` | 否 | 默认值 |
| `interpolate` | `boolean` | 否 | 数值之间是否插值 |

#### 示例：数值映射

```js
radiusBy: {
  field: 'score',
  stops: [
    [0, 300],
    [50, 700],
    [100, 1200]
  ],
  default: 300
}
```

#### 示例：枚举映射

```js
fillColorBy: {
  field: 'riskLevel',
  map: {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444'
  },
  default: '#94a3b8'
}
```

---

## 6. Loca 样式协议手册

文件位置：`src/loca/loca-layer-registry.js`

### 6.1 point 默认视觉字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `radius` | `number \| function` | 点半径 |
| `color` | `string \| function` | 点颜色 |
| `borderWidth` | `number \| function` | 边框宽度 |
| `blurWidth` | `number \| function` | 模糊宽度 |

### 6.2 heatmap 默认视觉字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `radius` | `number` | 半径 |
| `unit` | `string` | `px` / `meter` |
| `height` | `number` | 高度 |
| `value` | `number \| function` | 热力值 |
| `gradient` | `object` | 渐变色 |

### 6.3 grid 默认视觉字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `unit` | `string` | `meter` / `px` |
| `radius` | `number` | 网格大小 |
| `gap` | `number` | 网格间距 |
| `height` | `number` | 高度 |
| `color` | `string \| function` | 网格颜色 |

### 6.4 polygon 默认视觉字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `color` | `string` | 快捷主色，会展开到各面颜色 |
| `topColor` | `string` | 顶部颜色 |
| `bottomColor` | `string` | 底部颜色 |
| `sideTopColor` | `string` | 侧面顶部颜色 |
| `sideBottomColor` | `string` | 侧面底部颜色 |
| `opacity` | `number` | 透明度 |
| `borderColor` | `string` | 边框颜色 |
| `borderWidth` | `number` | 边框宽度 |

### 6.5 line 默认视觉字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `color` | `string \| function` | 线颜色 |
| `lineWidth` | `number \| function` | 线宽 |
| `opacity` | `number \| function` | 透明度 |

### 6.6 Loca 中函数式样式的使用建议

Loca 推荐这样写：

```js
style: {
  color: (index, feature) => feature.properties.category === 'atm' ? '#16a34a' : '#1677ff',
  radius: (index, feature) => feature.properties.level === 'high' ? 8 : 5
}
```

适用原因：

- 海量数据性能更合适
- 用业务字段直接驱动视觉效果
- 不需要手动拆成多图层

---

## 7. 返回信息结构手册

### 7.1 普通地图 LayerInfo 典型结构

```js
{
  visible: true,
  featureCount: 12,
  overlayCount: 12,
  categories: ['branch', 'atm'],
  hiddenCategories: [],
  hiddenFeatureIds: [],
  styledFeatureIds: ['bank-001'],
  geometryKinds: ['point'],
  hasHeatmap: false,
  featureIndex: {
    'bank-001': {
      id: 'bank-001',
      name: '合肥分行',
      category: 'branch',
      geometryKind: 'point',
      properties: {}
    }
  }
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `visible` | `boolean` | 当前图层是否显示 |
| `featureCount` | `number` | 数据总要素数 |
| `overlayCount` | `number` | 当前覆盖物数量 |
| `categories` | `string[]` | 图层内分类列表 |
| `hiddenCategories` | `string[]` | 已隐藏分类 |
| `hiddenFeatureIds` | `string[]` | 已隐藏要素 |
| `styledFeatureIds` | `string[]` | 被单独改样式的要素 |
| `geometryKinds` | `string[]` | 图层内几何类型集合 |
| `hasHeatmap` | `boolean` | 是否为热力图 |
| `featureIndex` | `object` | 按 id 建立的要素索引 |

### 7.2 LocaLayerInfo 典型结构

```js
{
  visible: true,
  type: 'point',
  locaLayer: 'PointLayer',
  featureCount: 1200,
  visibleFeatureCount: 1180,
  categories: ['branch', 'atm', 'selfService'],
  hiddenCategories: [],
  hiddenFeatureIds: ['bank-009'],
  styledFeatureIds: ['bank-001'],
  geometryKinds: ['point'],
  style: {},
  layerOptions: {},
  featureIndex: {}
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `visible` | `boolean` | 是否显示 |
| `type` | `string` | 当前逻辑类型，例如 `point` |
| `locaLayer` | `string` | 实际 Loca 图层构造名 |
| `featureCount` | `number` | 总要素数 |
| `visibleFeatureCount` | `number` | 当前可见要素数 |
| `categories` | `string[]` | 分类列表 |
| `hiddenCategories` | `string[]` | 隐藏分类 |
| `hiddenFeatureIds` | `string[]` | 隐藏要素 |
| `styledFeatureIds` | `string[]` | 样式覆盖的要素 |
| `geometryKinds` | `string[]` | 几何类型集合 |
| `style` | `object` | 当前视觉样式 |
| `layerOptions` | `object` | 当前图层参数 |
| `featureIndex` | `object` | 要素索引 |

### 7.3 FeatureInfo 典型结构

```js
{
  id: 'bank-001',
  name: '合肥分行',
  category: 'branch',
  geometryKind: 'point',
  properties: {
    id: 'bank-001',
    name: '合肥分行',
    category: 'branch'
  }
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string \| number` | 要素 id |
| `name` | `string` | 名称 |
| `category` | `string` | 分类 |
| `geometryKind` | `string` | `point` / `line` / `polygon` |
| `properties` | `object` | 原始业务属性 |

---

## 8. 推荐调用模板

### 8.1 普通点图层模板

```js
mapActions.renderGeoJSONLayer({
  layerId: 'point-layer',
  visible: true,
  style: {
    point: {
      renderer: 'image',
      image: {
        src: '/map-icons/default.svg',
        size: [32, 32]
      },
      zIndex: 30
    }
  }
}, geoJSON)
```

### 8.2 普通线图层模板

```js
mapActions.renderGeoJSONLayer({
  layerId: 'line-layer',
  visible: true,
  style: {
    line: {
      strokeColor: '#1677ff',
      strokeWeight: 4,
      strokeOpacity: 0.9,
      showDir: true
    }
  }
}, geoJSON)
```

### 8.3 普通面图层模板

```js
mapActions.renderGeoJSONLayer({
  layerId: 'polygon-layer',
  visible: true,
  style: {
    polygon: {
      fillColor: '#1677ff',
      fillOpacity: 0.18,
      strokeColor: '#1677ff',
      strokeWeight: 2
    }
  }
}, geoJSON)
```

### 8.4 普通热力图模板

```js
mapActions.renderGeoJSONLayer({
  layerId: 'heatmap-layer',
  visible: true,
  style: {
    heatmap: {
      valueField: 'value',
      radius: 30,
      opacity: [0.2, 0.85],
      gradient: {
        0.2: '#22c55e',
        0.5: '#f59e0b',
        1: '#ef4444'
      }
    }
  }
}, geoJSON)
```

### 8.5 Loca 海量点模板

```js
locaActions.renderGeoJSONLayer({
  layerId: 'loca-point-layer',
  type: 'point',
  visible: true,
  layerOptions: {
    zIndex: 12,
    opacity: 0.92,
    blend: 'lighter'
  },
  style: {
    radius: 5,
    color: '#1677ff',
    borderWidth: 0,
    blurWidth: 0.65
  }
}, geoJSON)
```

### 8.6 Loca 热力图模板

```js
locaActions.renderGeoJSONLayer({
  layerId: 'loca-heat-layer',
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

### 8.7 Loca 网格图模板

```js
locaActions.renderGeoJSONLayer({
  layerId: 'loca-grid-layer',
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
    color: '#1677ff'
  }
}, geoJSON)
```

---

## 9. 推荐阅读顺序

如果你第一次接这个项目，建议按下面顺序阅读文档：

1. `docs/map-api-business-guide.md`
2. 本文档 `docs/map-api-reference-manual.md`
3. 如需实际示例，再参考：
   - `docs/map-api-usage-guide.md`
   - `src/examples/map-feature-examples.js`
   - `src/examples/loca-feature-examples.js`
