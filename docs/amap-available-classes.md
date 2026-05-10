# 离线 AMap JSAPI 可用类清单

**适用范围**：本仓库 [`public/amap/AMap3.js`](../public/amap/AMap3.js) 中实际暴露在 `window.AMap` 上的类与命名空间。

**来源**：直接读取 `Object.keys(AMap)` 得出，是这个离线包的**真实运行时能力**，不是高德官方 v2 的全集。

**使用规则**：

- 出现在本清单中的类视为**必然存在**——业务代码与 SDK 内部都不需要写 `if (typeof AMap.X === 'function')` 之类的能力兜底；如果要用，直接 `new AMap.X(...)`。
- 不在清单中的类（例如 `AMap.Driving`、`AMap.PlaceSearch`、`AMap.Geocoder` 等搜索/路径规划/服务类）**离线包未打包**，调用会报错。
- 离线包升级时，重新跑 `Object.keys(AMap).sort()` 更新本清单。

---

## 1. 核心 / 全局

| 名称 | 说明 |
|---|---|
| `AMap.Map` | 地图主体 |
| `AMap.Event` | 事件总线 |
| `AMap.version` | JSAPI 版本号 |
| `AMap.plugin` | 异步插件加载（离线包里通常用不到） |
| `AMap.getConfig` | 读取全局配置 |
| `AMap.extend` | 类继承辅助 |
| `AMap.createDefaultLayer` | 创建默认底图图层 |

## 2. 几何与基础数据

| 名称 | 说明 |
|---|---|
| `AMap.LngLat` | 经纬度对象 |
| `AMap.Pixel` | 像素坐标 |
| `AMap.Size` | 尺寸（宽高） |
| `AMap.Bounds` | 经纬度边界框 |
| `AMap.Icon` | 图标对象（marker 用） |
| `AMap.extent` | 范围/视野相关辅助 |

## 3. 覆盖物（Overlay）

| 名称 | 说明 |
|---|---|
| `AMap.Marker` | 标记点 |
| `AMap.Text` | 文本覆盖物 |
| `AMap.LabelMarker` | 文字标注 marker |
| `AMap.InfoWindow` | 信息窗体 |
| `AMap.ContextMenu` | 右键菜单 |
| `AMap.Polygon` | 多边形 |
| `AMap.Rectangle` | 矩形 |
| `AMap.Ellipse` | 椭圆 |
| `AMap.Circle` | 圆形 |
| `AMap.CircleMarker` | 圆形 marker（轻量，无半径单位） |
| `AMap.Polyline` | 折线 |
| `AMap.BezierCurve` | 贝塞尔曲线 |
| `AMap.OverlayGroup` | 覆盖物分组管理 |

## 4. 图层（Layer）

| 名称 | 说明 |
|---|---|
| `AMap.ImageLayer` | 图片图层 |
| `AMap.TileLayer` | 通用瓦片图层 |
| `AMap.NebulaLayer` | 星云特效图层 |
| `AMap.Buildings` / `AMap.BuildingLayer` | 建筑物图层（3D） |
| `AMap.Indoor` / `AMap.IndoorMap` | 室内地图 |
| `AMap.SkyLayer` | 天空图层（3D 透视用） |
| `AMap.DistrictLayer` | 行政区划图层 |
| `AMap.CanvasLayer` | Canvas 自定义图层 |
| `AMap.CustomLayer` / `AMap.GLCustomLayer` | 通用 / WebGL 自定义图层 |
| `AMap.LabelsLayer` | 文字标注图层 |
| `AMap.MassMarks` | 海量点（百万级） |
| `AMap.VectorLayer` | 矢量图层 |
| `AMap.LayerGroup` | 图层分组 |
| `AMap.Heatmap` / `AMap.HeatMap` | 热力图（同一插件的两种命名都暴露，本项目两个都试） |
| `AMap.MapboxVectorTileLayer` | 矢量瓦片（Mapbox 协议） |
| `AMap.Mapbox` | Mapbox 命名空间（矢量样式相关） |

## 5. 控件（Control）

| 名称 | 说明 |
|---|---|
| `AMap.Control` | 控件基类 |
| `AMap.ToolBar` | 缩放/平移工具条 |
| `AMap.Scale` | 比例尺 |
| `AMap.ControlBar` | 3D 视角控制 |
| `AMap.HawkEye` | 鹰眼缩略图 |
| `AMap.MapType` | 底图切换 |

## 6. 交互工具

| 名称 | 说明 |
|---|---|
| `AMap.MouseTool` | 绘制工具（圆/矩形/多边形/折线等） |
| `AMap.RangingTool` | 测距 |

## 7. 编辑器

| 名称 | 说明 |
|---|---|
| `AMap.CircleEditor` | |
| `AMap.PolygonEditor` | |
| `AMap.PolylineEditor` | |
| `AMap.RectangleEditor` | |
| `AMap.EllipseEditor` | |
| `AMap.BezierCurveEditor` | |

## 8. 聚合

| 名称 | 说明 |
|---|---|
| `AMap.MarkerClusterer` / `AMap.MarkerCluster` | 点聚合（两种命名都暴露） |
| `AMap.IndexCluster` | 按层级（行政区等）的索引聚合 |

## 9. 工具命名空间

| 名称 | 说明 |
|---|---|
| `AMap.DomUtil` | DOM 操作 |
| `AMap.Util` | 通用工具 |
| `AMap.GeometryUtil` | 几何计算（球面距离、点是否在多边形内等） |
| `AMap.PlaneGeometryUtil` | 平面几何工具 |
| `AMap.Browser` / `AMap.UA` | 浏览器 / UA 检测 |
| `AMap.Http` | HTTP 请求封装 |
| `AMap.addCss` | 注入 CSS |
| `AMap.convertFrom` | 坐标系转换 |
| `AMap.WebService` | Web 服务调用基类（离线包通常用不到） |
| `AMap.lcs` | 内部坐标转换工具 |

## 10. 埋点 / 统计（离线包已禁用）

`AMap.BuryPoint`、`AMap.Mark`、`AMap.Tracker` —— 离线包已切断网络请求；不要用，避免触发埋点逻辑。

---

## 不在清单中的常见类（**调用会出错**）

以下是高德 v2 的常见在线插件，**本离线包未打包**：

- 搜索：`PlaceSearch` / `AutoComplete` / `Geocoder` / `DistrictSearch` / `LineSearch` / `StationSearch`
- 路径规划：`Driving` / `Walking` / `Riding` / `Transfer` / `TruckDriving` / `DragRoute` / `ArrivalRange`
- 其他服务：`CitySearch` / `Geolocation` / `Weather` / `RoadInfoSearch` / `CloudDataSearch` / `CloudDataLayer`
- 动画/3D：`MoveAnimation` / `GltfLoader` / `Object3DLayer`

需要这些能力时，要么换在线 JSAPI，要么自行实现替代逻辑。
