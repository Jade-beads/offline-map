# 地图业务调用指南

> 适用对象：业务前端开发、联调开发、接口接入开发。
>
> 目标：不需要阅读 `src/map`、`src/loca` 内部实现，只看本文档就能完成地图数据渲染、样式控制、图层显隐、单要素高亮、热力图、海量点等常见需求。

---

## 1. 先建立正确的使用方式

当前项目的地图能力分成两套调用入口：

- `mapActions`：适合普通点、线、面、热力图、测距、绘图、自定义标点
- `locaActions`：适合海量点、热力、网格聚合、大批量可视化图层

### 1.1 你只需要记住一个原则

**所有业务代码都只调用 actions，不直接操作 `AMap.Map`、`AMap.Marker`、`AMap.Polygon`、Loca layer 实例。**

也就是说，实际开发时你只需要做三件事：

1. 把后端返回的数据整理成 GeoJSON
2. 选择 `mapActions` 还是 `locaActions`
3. 传入图层参数和样式参数

---

## 2. 如何选择用哪一套 API

### 2.1 用 `mapActions` 的场景

优先选择 `mapActions`：

- 点位数量不大，通常几十、几百、少量上千
- 需要展示图片图标点位
- 需要展示 HTML 自定义点位
- 需要点、线、面混合图层
- 需要对单个点、单条线、单个面做高亮
- 需要做边界图层、业务区域图层
- 需要测距、绘图、坐标定位
- 需要图层内分类显隐
- 需要点击列表后精确定位某一个 feature

### 2.2 用 `locaActions` 的场景

优先选择 `locaActions`：

- 点位特别多，追求渲染性能
- 要做海量散点图
- 要做热力图
- 要做网格聚合图
- 要做密度分布、强度分布、数据可视化图层
- 对“单个覆盖物的强交互”要求没那么高，更看重整体视觉表达

### 2.3 最简单的判断方法

| 需求 | 推荐 |
| --- | --- |
| 展示网点图标 | `mapActions` |
| 展示商圈边界 / 行政区边界 | `mapActions` |
| 展示路线 / 轨迹 | `mapActions` |
| 高亮单个点、单条线、单个面 | `mapActions` |
| 几千个点、上万个点 | `locaActions` |
| 热力图 | 优先 `locaActions`，普通热力也可用 `mapActions` |
| 网格热力图 | `locaActions` |
| 地图框选 / 绘图工具 | `mapActions` |
| 测距工具 | `mapActions` |

---

## 3. 接入前必须知道的数据格式

无论你用 `mapActions` 还是 `locaActions`，都建议统一使用 **GeoJSON**。

### 3.1 推荐统一使用 FeatureCollection

标准格式：

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
        shortName: '中',
        value: 86
      },
      geometry: {
        type: 'Point',
        coordinates: [117.2272, 31.8206]
      }
    }
  ]
}
```

### 3.2 推荐每个 feature 都带这几个字段

| 字段 | 是否推荐 | 用途 |
| --- | --- | --- |
| `feature.id` | 强烈推荐 | 单要素控制、显隐、高亮、聚焦 |
| `properties.id` | 强烈推荐 | 作为 `feature.id` 的补充 |
| `properties.name` | 推荐 | 显示名称、title、label |
| `properties.category` | 强烈推荐 | 分类样式、分类显隐 |
| `properties.value` | 推荐 | 热力图、Loca 点图、网格图的值字段 |
| `properties.shortName` | 推荐 | pin 点内文字 |
| `properties.mapStyle` | 按需 | 单要素自带样式覆盖 |

### 3.3 支持哪些 geometry 类型

项目目前支持：

```text
Point
MultiPoint
LineString
MultiLineString
Polygon
MultiPolygon
```

### 3.4 常见几何类型示例

#### Point

```js
{
  type: 'Feature',
  id: 'branch-001',
  properties: {
    id: 'branch-001',
    name: '合肥分行',
    category: 'branch'
  },
  geometry: {
    type: 'Point',
    coordinates: [117.2272, 31.8206]
  }
}
```

#### LineString

```js
{
  type: 'Feature',
  id: 'route-001',
  properties: {
    id: 'route-001',
    name: '巡检路线',
    category: 'main-route'
  },
  geometry: {
    type: 'LineString',
    coordinates: [
      [117.19, 31.805],
      [117.225, 31.826],
      [117.27, 31.852]
    ]
  }
}
```

#### Polygon

```js
{
  type: 'Feature',
  id: 'area-001',
  properties: {
    id: 'area-001',
    name: '核心区域',
    category: 'core-area'
  },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [117.235, 31.807],
      [117.265, 31.807],
      [117.265, 31.833],
      [117.235, 31.833],
      [117.235, 31.807]
    ]]
  }
}
```

### 3.5 裸 Geometry 什么时候可以直接传

如果你只有一个单独的 `Polygon` 或 `Point`，也可以直接传。

例如直接传一个 Polygon：

```js
const polygon = {
  type: 'Polygon',
  coordinates: [[
    [117.17, 31.78],
    [117.29, 31.78],
    [117.29, 31.88],
    [117.17, 31.88],
    [117.17, 31.78]
  ]]
}

mapActions.renderGeoJSONLayer({
  layerId: 'region-boundary',
  visible: true,
  category: 'city-boundary',
  properties: {
    id: 'region-001',
    name: '示例行政区'
  },
  style: {
    polygon: {
      fillColor: '#1677ff',
      fillOpacity: 0.14,
      strokeColor: '#1677ff',
      strokeWeight: 2
    }
  }
}, polygon)
```

适用场景：

- 行政区边界单独渲染
- 只画一个临时范围
- 绘图结果回显

---

## 4. 最常见的 8 类业务需求如何调用

下面按你最常见的业务需求来写，不按源码函数组织。

---

## 5. 需求一：渲染普通点位图层

### 5.1 适用场景

- 银行网点
- 设备点位
- 人员位置点
- 门店点位
- 事件告警点

### 5.2 最常用写法：pin 点位

```js
import { mapActions } from '@/map/map-store'

mapActions.renderGeoJSONLayer({
  layerId: 'bank-points',
  visible: true,
  style: {
    point: {
      renderer: 'pin',
      color: '#2563eb',
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

### 5.3 什么时候用 pin

适合：

- 没有现成图片图标资源
- 需要快速区分点位类别
- 需要在点位内部显示一个字
- 需要统一风格、快速搭建

### 5.4 什么时候用 image

如果你已经有设计好的图标资源，更推荐 `renderer: 'image'`：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank-points',
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

### 5.5 同一图层不同点位显示不同图标

```js
mapActions.renderGeoJSONLayer({
  layerId: 'bank-points',
  visible: true,
  style: {
    point: {
      renderer: 'image',
      image: {
        src: '/map-icons/default.svg',
        size: [32, 32]
      }
    },
    categories: {
      branch: {
        point: {
          image: { src: '/map-icons/branch.svg', size: [34, 34] }
        }
      },
      atm: {
        point: {
          image: { src: '/map-icons/atm.svg', size: [28, 28] }
        }
      },
      selfService: {
        point: {
          image: { src: '/map-icons/self-service.svg', size: [30, 30] }
        }
      }
    }
  }
}, geoJSON)
```

这时要求每个点位都带：

```js
properties: {
  category: 'branch' // 或 atm / selfService
}
```

---

## 6. 需求二：渲染范围点 / 服务半径 / 风险圈层

### 6.1 适用场景

- 服务半径
- 风险辐射范围
- 门店覆盖圈
- 影响圈层
- 缓冲区表达

### 6.2 使用 `renderer: 'circle'`

```js
mapActions.renderGeoJSONLayer({
  layerId: 'service-radius',
  visible: true,
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
      zIndex: 20
    }
  }
}, geoJSON)
```

### 6.3 最重要的一点

`radius` 的单位是 **米**。

例如：

- `300` = 300 米
- `1000` = 1 公里
- `3000` = 3 公里

### 6.4 如果每个点半径不同怎么办

用动态字段：

```js
mapActions.renderGeoJSONLayer({
  layerId: 'service-radius',
  visible: true,
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
      },
      fillColor: '#3b82f6',
      fillOpacity: 0.18,
      strokeColor: '#2563eb',
      strokeWeight: 2
    }
  }
}, geoJSON)
```

后端数据示例：

```js
properties: {
  id: 'branch-001',
  name: '合肥分行',
  category: 'branch',
  serviceRadius: 1200
}
```

---

## 7. 需求三：渲染路线、轨迹、边界线

### 7.1 适用场景

- 车辆轨迹
- 巡检路线
- 配送路径
- 迁徙线
- 边界线

### 7.2 标准写法

```js
mapActions.renderGeoJSONLayer({
  layerId: 'route-layer',
  visible: true,
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
}, geoJSON)
```

### 7.3 如果主线路和支线路颜色不同

```js
mapActions.renderGeoJSONLayer({
  layerId: 'route-layer',
  visible: true,
  style: {
    line: {
      strokeColor: '#1677ff',
      strokeWeight: 4
    },
    categories: {
      main: {
        line: {
          strokeColor: '#2563eb',
          strokeWeight: 5
        }
      },
      branch: {
        line: {
          strokeColor: '#16a34a',
          strokeWeight: 3
        }
      },
      warning: {
        line: {
          strokeColor: '#ef4444',
          strokeWeight: 5,
          strokeStyle: 'dashed'
        }
      }
    }
  }
}, geoJSON)
```

### 7.4 如果按分数字段动态改线宽

```js
mapActions.renderGeoJSONLayer({
  layerId: 'route-layer',
  visible: true,
  style: {
    line: {
      strokeColor: '#1677ff',
      strokeWeightBy: {
        field: 'score',
        stops: [
          [0, 2],
          [50, 4],
          [100, 8]
        ],
        default: 3
      }
    }
  }
}, geoJSON)
```

---

## 8. 需求四：渲染区域面、边界面、商圈面

### 8.1 适用场景

- 行政区边界
- 商圈范围
- 风险区域
- 服务区域
- 网格块面

### 8.2 标准写法

```js
mapActions.renderGeoJSONLayer({
  layerId: 'region-boundary',
  visible: true,
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
}, geoJSON)
```

### 8.3 如果不同区域按等级显示不同颜色

```js
mapActions.renderGeoJSONLayer({
  layerId: 'region-boundary',
  visible: true,
  style: {
    polygon: {
      fillColor: '#60a5fa',
      fillOpacity: 0.18,
      strokeColor: '#2563eb',
      strokeWeight: 2
    },
    rules: [
      {
        field: 'level',
        value: 'high',
        style: {
          polygon: {
            fillColor: '#ef4444',
            strokeColor: '#dc2626'
          }
        }
      },
      {
        field: 'level',
        value: 'medium',
        style: {
          polygon: {
            fillColor: '#f59e0b',
            strokeColor: '#d97706'
          }
        }
      },
      {
        field: 'level',
        value: 'low',
        style: {
          polygon: {
            fillColor: '#22c55e',
            strokeColor: '#16a34a'
          }
        }
      }
    ]
  }
}, geoJSON)
```

### 8.4 如果按数值动态变颜色

```js
mapActions.renderGeoJSONLayer({
  layerId: 'region-boundary',
  visible: true,
  style: {
    polygon: {
      fillColorBy: {
        field: 'riskScore',
        stops: [
          [0, '#dcfce7'],
          [40, '#86efac'],
          [70, '#facc15'],
          [100, '#ef4444']
        ]
      },
      fillOpacityBy: {
        field: 'riskScore',
        stops: [
          [0, 0.12],
          [50, 0.25],
          [100, 0.42]
        ]
      },
      strokeColor: '#ffffff',
      strokeWeight: 1
    }
  }
}, geoJSON)
```

---

## 9. 需求五：渲染普通热力图

### 9.1 适用场景

- 客流热度
- 风险热度
- 告警热度
- 分布热区

### 9.2 调用方式

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

### 9.3 数据要求

热力图本质上还是点数据，因此要求 feature 是 `Point` / `MultiPoint`。

热度值来自：

```js
properties.value
```

如果你的字段名不是 `value`，就改 `valueField`：

```js
style: {
  heatmap: {
    valueField: 'heatValue'
  }
}
```

### 9.4 什么时候不建议用普通 heatmap

如果你点位特别多、追求性能和更好的视觉表现，优先使用 `locaActions` 的热力图。

---

## 10. 需求六：渲染海量点

### 10.1 适用场景

- 几千个网点
- 几千个设备点
- 大量监控点
- 大量告警点
- 大量坐标可视化

### 10.2 推荐用 `locaActions`

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
    radius: (index, feature) => feature.properties.category === 'branch' ? 5.8 : 4.2,
    color: (index, feature) => {
      const colorMap = {
        branch: '#1677ff',
        atm: '#16a34a',
        selfService: '#f97316'
      }
      return colorMap[feature.properties.category] || '#1677ff'
    },
    borderWidth: 0,
    blurWidth: 0.65
  }
}, geoJSON)
```

### 10.3 为什么这里使用函数式样式

Loca 特别适合这样写：

```js
radius: (index, feature) => ...
color: (index, feature) => ...
```

原因是：

- 性能更适合海量数据
- 颜色和半径可以直接由业务字段决定
- 不需要拆很多图层

### 10.4 如果只想隐藏某个分类

```js
locaActions.setLayerCategoryVisible('bank-mass', 'atm', false)
```

### 10.5 如果只想隐藏某个点

```js
locaActions.setFeaturesVisible('bank-mass', 'bank-001', false)
```

---

## 11. 需求七：渲染热力图和网格图

### 11.1 Loca 热力图

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

适合：

- 热度分布
- 强度分布
- 人流 / 车流 / 告警热区

### 11.2 Loca 网格图

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

适合：

- 栅格分析
- 网格热力
- 密度区块表达

---

## 12. 需求八：列表点击后高亮并定位

这是业务里最常见的交互之一。

### 12.1 普通点线面图层的做法

```js
function handleSelectFeature(featureId) {
  mapActions.clearLayerFeatureStyles('bank-layer')
  mapActions.highlightFeature('bank-layer', featureId)
  mapActions.focusFeature('bank-layer', featureId)
}
```

### 12.2 如果想用自己的高亮色

#### 高亮点

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

#### 高亮线

```js
mapActions.setFeatureStyle('route-layer', 'route-001', {
  line: {
    strokeColor: '#f59e0b',
    strokeOpacity: 1,
    strokeWeight: 6,
    zIndex: 120
  }
})
```

#### 高亮面

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

### 12.3 Loca 图层的做法

```js
function handleSelectMassPoint(featureId) {
  locaActions.clearLayerFeatureStyles('bank-mass')
  locaActions.setFeatureStyle('bank-mass', featureId, {
    radius: 14,
    color: '#f59e0b',
    borderWidth: 1,
    blurWidth: 0.2
  })
}
```

注意：Loca 更适合做“视觉高亮”，不像普通覆盖物那样强调单对象交互。

---

## 13. 图层控制的常见流程

---

### 13.1 渲染后自动缩放到图层范围

```js
mapActions.renderGeoJSONLayer({
  layerId: 'region-layer',
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

mapActions.fitLayerView('region-layer', {
  padding: [80, 80],
  maxZoom: 14
})
```

### 13.2 隐藏 / 显示整个图层

```js
mapActions.setLayerVisible('region-layer', false)
mapActions.setLayerVisible('region-layer', true)
```

### 13.3 按分类隐藏

```js
mapActions.setLayerCategoryVisible('bank-layer', 'atm', false)
```

### 13.4 删除图层

```js
mapActions.clearLayer('region-layer')
```

### 13.5 清空全部普通图层

```js
mapActions.clearAllLayers()
```

### 13.6 清空全部 Loca 图层

```js
locaActions.clearAllLayers()
```

---

## 14. 点、线、面、热力图的样式应该怎么理解

你可以把样式理解成 4 层：

1. **基础样式**：这个图层默认长什么样
2. **分类样式**：不同 `category` 长得不一样
3. **规则样式**：符合某些字段条件时换样式
4. **单要素样式**：只改某一个 feature 的样式

### 14.1 基础样式

```js
style: {
  point: {
    renderer: 'pin',
    color: '#2563eb',
    size: 30
  }
}
```

### 14.2 分类样式

```js
style: {
  point: {
    renderer: 'image',
    image: { src: '/map-icons/default.svg', size: [32, 32] }
  },
  categories: {
    branch: {
      point: { image: { src: '/map-icons/branch.svg' } }
    },
    atm: {
      point: { image: { src: '/map-icons/atm.svg' } }
    }
  }
}
```

### 14.3 规则样式

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

### 14.4 单要素覆盖样式

```js
mapActions.setFeatureStyle('bank-layer', 'bank-001', {
  point: {
    renderer: 'pin',
    color: '#ef4444',
    size: 38
  }
})
```

---

## 15. 后端接口数据如何改造成 GeoJSON

业务开发时，最实际的问题通常不是“怎么调地图 API”，而是“后端数据怎么转”。

### 15.1 点位列表接口

后端返回：

```js
[
  {
    id: 'branch-001',
    name: '合肥分行',
    lng: 117.2272,
    lat: 31.8206,
    category: 'branch',
    shortName: '合',
    value: 86
  }
]
```

前端转换：

```js
const geoJSON = {
  type: 'FeatureCollection',
  features: list.map((item) => ({
    type: 'Feature',
    id: item.id,
    properties: {
      id: item.id,
      name: item.name,
      category: item.category,
      shortName: item.shortName,
      value: item.value
    },
    geometry: {
      type: 'Point',
      coordinates: [item.lng, item.lat]
    }
  }))
}
```

### 15.2 线路接口

后端返回：

```js
[
  {
    id: 'route-001',
    name: '巡检路线',
    category: 'main',
    path: [
      [117.19, 31.805],
      [117.225, 31.826],
      [117.27, 31.852]
    ]
  }
]
```

前端转换：

```js
const geoJSON = {
  type: 'FeatureCollection',
  features: list.map((item) => ({
    type: 'Feature',
    id: item.id,
    properties: {
      id: item.id,
      name: item.name,
      category: item.category
    },
    geometry: {
      type: 'LineString',
      coordinates: item.path
    }
  }))
}
```

### 15.3 面数据接口

后端返回：

```js
[
  {
    id: 'region-001',
    name: '核心区域',
    category: 'core',
    polygon: [
      [117.235, 31.807],
      [117.265, 31.807],
      [117.265, 31.833],
      [117.235, 31.833],
      [117.235, 31.807]
    ]
  }
]
```

前端转换：

```js
const geoJSON = {
  type: 'FeatureCollection',
  features: list.map((item) => ({
    type: 'Feature',
    id: item.id,
    properties: {
      id: item.id,
      name: item.name,
      category: item.category
    },
    geometry: {
      type: 'Polygon',
      coordinates: [item.polygon]
    }
  }))
}
```

---

## 16. 最推荐的业务封装方式

建议你的业务层不要每次都手写 GeoJSON 转换和地图调用，而是在业务模块里再包一层。

### 16.1 例如封装网点渲染方法

```js
import { mapActions } from '@/map/map-store'

export function renderBranchPoints(list) {
  const geoJSON = {
    type: 'FeatureCollection',
    features: list.map((item) => ({
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
    layerId: 'branch-layer',
    visible: true,
    style: {
      point: {
        renderer: 'image',
        image: {
          src: '/map-icons/branch.svg',
          size: [34, 34]
        }
      }
    }
  }, geoJSON)
}
```

好处：

- 页面里调用更简单
- 样式集中管理
- 数据适配集中管理
- 后续替换图层逻辑更方便

---

## 17. 常见错误和避免方式

### 17.1 没有 `layerId`

问题：后续无法控制显隐、高亮、删除。

建议：每个图层都明确命名，例如：

- `branch-layer`
- `route-layer`
- `region-layer`
- `risk-heat`
- `bank-mass`

### 17.2 feature 没有稳定 id

问题：

- `setFeatureStyle` 失效
- `focusFeature` 不好用
- `setFeaturesVisible` 失效

建议：始终带 `feature.id` 和 `properties.id`。

### 17.3 没有 `category`

问题：无法使用 `categories` 分类样式，也无法使用 `setLayerCategoryVisible()`。

建议：只要图层里存在多种业务类型，就带上 `properties.category`。

### 17.4 Point 圆形半径单位理解错

`renderer: 'circle'` 的 `radius` 是 **米**，不是像素。

### 17.5 Loca 图层拿来做复杂单点交互

不建议。Loca 适合整体可视化，不是为复杂单覆盖物交互设计的。需要精细交互时优先 `mapActions`。

### 17.6 HTML 点位直接拼外部数据

不建议。外部不可信字符串不要直接拼到 `html` 里。

---

## 18. 一套你可以直接照抄的开发流程

如果你要从零接一个新地图功能，建议按下面顺序做：

### 步骤 1：确认业务对象是点、线、面还是海量数据

- 普通点线面：`mapActions`
- 海量点 / 热力 / 网格：`locaActions`

### 步骤 2：把后端数据先统一转成 GeoJSON

### 步骤 3：先做最基础渲染

```js
mapActions.renderGeoJSONLayer({
  layerId: 'demo-layer',
  visible: true,
  style: {
    point: {
      renderer: 'pin',
      color: '#2563eb',
      size: 30
    }
  }
}, geoJSON)
```

### 步骤 4：确认是否需要分类样式

如果需要，就补 `properties.category` 和 `style.categories`。

### 步骤 5：确认是否需要字段驱动样式

如果需要，就补 `rules` 或 `xxxBy` 动态字段。

### 步骤 6：确认是否需要交互控制

- 图层显隐：`setLayerVisible`
- 分类显隐：`setLayerCategoryVisible`
- 单点显隐：`setFeaturesVisible`
- 高亮：`setFeatureStyle` / `highlightFeature`
- 定位：`focusFeature` / `fitLayerView`

### 步骤 7：如果后续会反复用，抽成业务封装函数

---

## 19. 本文档对应源码入口

如果后续你需要对照项目实际能力，建议看这些文件，但正常业务调用不需要阅读内部实现：

- 业务调用总入口：`src/map/map-store.js`
- 普通地图控制执行：`src/map/map-controller.js`
- 普通图层渲染：`src/map/layer-registry.js`
- 样式协议：`src/map/style-resolver.js`
- Loca 调用入口：`src/loca/loca-store.js`
- Loca 图层渲染：`src/loca/loca-layer-registry.js`

---

## 20. 你应该优先查看的相关文档

如果你需要更像“字典式查询”的接口明细，请继续看：

- `docs/map-api-reference-manual.md`

该文档按 API 字段、参数表、样式字段表详细列出所有可用配置，适合开发时边写边查。
