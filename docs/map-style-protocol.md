# 地图样式协议

地图渲染入口保持不变：

```js
mapActions.renderGeoJSONLayer(params, geoJSON)
```

业务层可以在 `params.style` 中传入图层样式，也可以把样式跟随接口数据放在 `geoJSON.style` 或 `geoJSON.properties.style` 中。地图层只解析样式协议，不再根据 `bank`、`rent`、`enterprise` 等业务含义写死样式。

## 样式入口

推荐方式：样式由业务层随调用传入。

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

也支持接口数据自带样式：

```js
const geoJSON = {
  type: 'FeatureCollection',
  style: {
    polygon: {
      fillColor: '#1677ff'
    }
  },
  features: []
}
```

单个 Feature 可以通过 `properties.mapStyle` 覆盖自身样式。

## 样式优先级

同一个要素最终样式按下面顺序合并，后面的会覆盖前面的：

```text
默认样式
-> style.point / style.line / style.polygon
-> style.categories[properties.category]
-> style.rules 命中的规则
-> feature.properties.mapStyle
```

## 支持的几何类型

```text
Point / MultiPoint              -> AMap.Marker 或 AMap.Circle
LineString / MultiLineString    -> AMap.Polyline
Polygon / MultiPolygon          -> AMap.Polygon
heatmap 样式 + Point 数据       -> AMap.HeatMap
```

## 示例：SVG/PNG 点位

适合银行网点、设备点、机构点等业务点位。

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank',
  visible: true,
  style: {
    point: {
      renderer: 'image',
      image: {
        src: '/map-icons/bank.svg',
        size: [34, 34]
      },
      anchor: 'bottom-center',
      zIndex: 30
    }
  }
}, geoJSON)
```

字段说明：

| 字段 | 用途 |
| --- | --- |
| `renderer: 'image'` | 使用图片 Marker。 |
| `image.src` | 图片地址，支持 `svg`、`png`、`jpg`。 |
| `image.size` | 图标显示尺寸，对应高德 `AMap.Size`。 |
| `anchor` | Marker 锚点，常用 `bottom-center`。 |
| `zIndex` | 图标层级，数字越大越靠上。 |

内网部署时建议把图标放到 `public/map-icons/`，业务侧使用 `/map-icons/bank.svg`。

## 示例：同一图层分类图标

同一图层中不同 `category` 使用不同图片。

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank',
  visible: true,
  style: {
    point: {
      renderer: 'image',
      image: {
        src: '/map-icons/bank-default.svg',
        size: [32, 32]
      },
      anchor: 'bottom-center'
    },
    categories: {
      owned: {
        point: {
          image: { src: '/map-icons/bank-owned.svg' }
        }
      },
      partner: {
        point: {
          image: { src: '/map-icons/bank-partner.png' }
        }
      },
      atm: {
        point: {
          image: {
            src: '/map-icons/atm.svg',
            size: [28, 28]
          }
        }
      }
    }
  }
}, geoJSON)
```

`categories` 的 key 来自 `feature.properties.category`。分类显隐入口：

```js
mapActions.setLayerCategoryVisible('bank', 'owned', false)
mapActions.setLayerCategoryVisible('bank', 'owned', true)
```

## 示例：图钉点

适合没有独立图标资源、但需要快速区分分类的点位。

```js
mapActions.renderGeoJSONLayer({
  layerId: 'branch',
  visible: true,
  style: {
    point: {
      renderer: 'pin',
      color: '#1677ff',
      size: 30,
      textField: 'shortName',
      textLength: 1,
      label: {
        visible: true,
        field: 'name',
        direction: 'right',
        offset: [8, -22]
      }
    }
  }
}, geoJSON)
```

字段说明：

| 字段 | 用途 |
| --- | --- |
| `textField` | 图钉内部文字来源字段。 |
| `textLength` | 截取文字长度。 |
| `label.visible` | 是否显示高德 Marker label。 |
| `label.field` | label 文本来源字段。 |
| `label.direction` | label 方位，常用 `top/right/bottom/left/center`。 |
| `label.offset` | label 偏移，会转成 `AMap.Pixel`。 |

## 示例：圆形点

适合影响范围、服务半径、风险范围等场景。圆形点使用 `AMap.Circle`，半径单位是米。

```js
mapActions.renderGeoJSONLayer({
  layerId: 'service-radius',
  visible: true,
  style: {
    point: {
      renderer: 'circle',
      radius: 800,
      fillColor: '#ef4444',
      fillOpacity: 0.22,
      strokeColor: '#ef4444',
      strokeOpacity: 0.65,
      strokeWeight: 2,
      zIndex: 15
    }
  }
}, geoJSON)
```

注意：`properties.radius` 不会自动生效。需要根据接口字段动态设置时，用 `radiusBy` 或函数。

```js
style: {
  point: {
    renderer: 'circle',
    radiusBy: {
      field: 'serviceRadius',
      stops: [
        [0, 300],
        [1000, 1000],
        [3000, 3000]
      ],
      default: 500
    }
  }
}
```

## 示例：HTML 点

适合少量自定义 DOM 标记。

```js
mapActions.renderGeoJSONLayer({
  layerId: 'custom-poi',
  visible: true,
  style: {
    point: {
      renderer: 'html',
      html: '<div class="custom-marker">A</div>',
      offset: [-12, -24],
      zIndex: 60
    }
  }
}, geoJSON)
```

`html` 会直接进入 Marker DOM。当前项目主要面向内网可信业务数据；如果未来接入外部数据，建议改成 DOM API 或先做 HTML 转义。

## 示例：线样式

```js
mapActions.renderGeoJSONLayer({
  layerId: 'route',
  visible: true,
  style: {
    line: {
      strokeColor: '#1677ff',
      strokeOpacity: 0.9,
      strokeWeight: 4,
      strokeStyle: 'solid',
      lineJoin: 'round',
      lineCap: 'round',
      showDir: true,
      zIndex: 30
    }
  }
}, geoJSON)
```

常用字段：

```text
strokeColor
strokeOpacity
strokeWeight
strokeStyle
strokeDasharray
isOutline
outlineColor
borderWeight
lineJoin
lineCap
geodesic
showDir
zIndex
zooms
cursor
bubble
```

## 示例：边界面填充

适合地图边界、业务区域、商圈、行政区等。

```js
mapActions.renderGeoJSONLayer({
  layerId: 'region-boundary',
  visible: true,
  style: {
    polygon: {
      fillColor: '#3b82f6',
      fillOpacity: 0.28,
      strokeColor: '#2563eb',
      strokeOpacity: 0.95,
      strokeWeight: 2,
      zIndex: 18
    }
  }
}, geoJSON)
```

修改填充色时重新渲染同一个 `layerId` 即可：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'region-boundary',
  visible: true,
  style: {
    polygon: {
      fillColor: nextColor,
      fillOpacity: 0.28,
      strokeColor: '#2563eb',
      strokeWeight: 2
    }
  }
}, geoJSON)
```

隐藏或显示：

```js
mapActions.setLayerVisible('region-boundary', false)
mapActions.setLayerVisible('region-boundary', true)
```

## 示例：网格热力图

当前离线包没有可用的官方 `AMap.HeatMap` 时，可以用 Polygon 网格表达热力分布。每个网格是一个 Polygon，热力值放在 `properties.heatValue`。

```js
mapActions.renderGeoJSONLayer({
  layerId: 'grid-heat',
  visible: true,
  style: {
    polygon: {
      fillColorBy: {
        field: 'heatValue',
        stops: [
          [0, '#d9f99d'],
          [35, '#86efac'],
          [55, '#fde047'],
          [75, '#fb923c'],
          [100, '#dc2626']
        ]
      },
      fillOpacityBy: {
        field: 'heatValue',
        stops: [
          [0, 0.2],
          [50, 0.45],
          [100, 0.78]
        ]
      },
      strokeColor: '#ffffff',
      strokeOpacity: 0.72,
      strokeWeight: 1,
      zIndex: 25
    }
  }
}, geoJSON)
```

网格大小由业务层生成 GeoJSON 时决定。例如 150 米乘 150 米的网格，应由接口或业务适配层计算每个 Polygon 的坐标范围，地图层只负责渲染。

## 示例：动态样式

动态样式适合根据接口字段控制颜色、半径、线宽、层级等。

```js
mapActions.renderGeoJSONLayer({
  layerId: 'risk-point',
  visible: true,
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
        ],
        default: '#22c55e'
      },
      fillOpacity: 0.32,
      strokeOpacity: 0.72
    }
  }
}, geoJSON)
```

数字会按区间线性插值；颜色会按区间取低档位颜色。支持的动态字段：

```text
colorBy
sizeBy
radiusBy
fillColorBy
fillOpacityBy
strokeColorBy
strokeOpacityBy
strokeWeightBy
opacityBy
zIndexBy
```

也支持离散映射：

```js
zIndexBy: {
  field: 'level',
  map: {
    normal: 20,
    important: 60
  },
  default: 20
}
```

前端调用时还可以传函数：

```js
point: {
  renderer: 'circle',
  fillColor: ({ properties }) => getHeatColor(properties.heatValue),
  radius: ({ properties }) => 300 + properties.heatValue * 12
}
```

函数不能放在后端 JSON 中，只适合前端业务层调用时传入。

## 示例：rules 条件规则

`rules` 适合比 `category` 更复杂的规则。

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank',
  visible: true,
  style: {
    point: {
      renderer: 'pin',
      color: '#1677ff',
      size: 28
    },
    rules: [
      {
        field: 'level',
        value: 'important',
        style: {
          point: {
            color: '#ef4444',
            size: 36,
            zIndex: 70
          }
        }
      },
      {
        when: {
          status: 'closed',
          category: 'owned'
        },
        style: {
          point: {
            color: '#64748b'
          }
        }
      }
    ]
  }
}, geoJSON)
```

规则匹配方式：

| 字段 | 用途 |
| --- | --- |
| `category` | 等价匹配 `properties.category`。 |
| `when` | 多字段同时等价匹配。 |
| `field + value` | 单字段等值匹配。 |
| `field + in` | 单字段枚举匹配。 |
| `field + min/max` | 单字段数值范围匹配。 |
| `test` | 前端函数匹配，只能在前端代码里传入。 |

## 示例：单要素样式

某个点、线、面需要独立样式时，在 Feature 上放 `properties.mapStyle`。

```js
{
  type: 'Feature',
  id: 'bank-001',
  geometry: {
    type: 'Point',
    coordinates: [117.2, 31.8]
  },
  properties: {
    id: 'bank-001',
    name: '重点网点',
    category: 'owned',
    mapStyle: {
      point: {
        image: {
          src: '/map-icons/bank-vip.svg',
          size: [42, 42]
        },
        zIndex: 80
      }
    }
  }
}
```

如果 `mapStyle` 中不写 `point / line / polygon`，也可以直接写当前几何类型的样式：

```js
mapStyle: {
  color: '#ff4d4f',
  size: 36
}
```

## 示例：官方 HeatMap 入口

热力图样式：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'customer-heat',
  visible: true,
  style: {
    renderer: 'heatmap',
    heatmap: {
      valueField: 'heatValue',
      max: 100,
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

普通覆盖物链路的热力图由代码在运行时检测 `AMap.HeatMap` 能力：

```text
typeof AMap.HeatMap === 'function'
HeatMap 实例支持 setDataSet
```

代码已经做了兼容：

```text
如果后续离线包补齐 AMap.HeatMap，并且实例支持 setDataSet，则自动使用官方 HeatMap。
如果没有可用 HeatMap，则不创建热力图层，并在控制台输出明确 warning。
```

当前不再提供 Circle 热力兜底；普通热力图只接入真正的 `AMap.HeatMap` 能力。Loca 海量热力图走独立的 `Loca.HeatMapLayer` 链路，详见 [loca-mass-data-layer.md](./loca-mass-data-layer.md)。

## 离线 HeatMap 包验收

如果需要普通覆盖物链路中的官方 `AMap.HeatMap`，需要确认授权离线 JSAPI 包里包含该插件实现。

拿到包后至少确认下面几点：

```text
AMap3.js、plugin.js 或其他离线插件文件中包含 AMap.HeatMap 实现
运行时 typeof AMap.HeatMap === 'function'
new AMap.HeatMap(map, options) 或 new AMap.HeatMap({ map, ...options }) 能返回实例
实例上存在 setDataSet/getDataSet/addDataPoint
浏览器 Network 中不再请求 webapi.amap.com 或其他公网插件地址
```

当前代码已经兼容两种常见构造方式：

```js
new AMap.HeatMap(map, options)
new AMap.HeatMap({ map, ...options })
```
