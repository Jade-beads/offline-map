# 文档索引

这个目录记录地图工作台的架构、地图能力和业务接入协议。当前项目采用离线高德 JSAPI 方案：`public/index.html` 本地加载 `public/amap/` 下的 AMap、插件、渲染和 Loca 静态资源。

## 推荐阅读顺序

1. [项目架构](./project-architecture.md)：先了解整体链路、离线加载方式和部署检查。
2. [MapController API](./map-controller-api.md)：查询 `mapActions` 与地图控制命令。
3. [GeoJSON 图层协议](./map-geojson-layer-protocol.md)：了解业务数据如何进入普通地图覆盖物链路。
4. [地图样式协议](./map-style-protocol.md)：查询点、线、面、热力图和动态样式写法。
5. [Loca 海量数据图层](./loca-mass-data-layer.md)：接入海量点、热力图、网格图等 Loca 图层。
6. [矢量瓦片图层](./map-vector-tile-layer.md)：接入 MVT / pbf 瓦片服务。
7. [WMTS 图层](./map-wmts-layer.md)：接入 WMTS 瓦片服务。

## 维护约定

- 主文档以 `docs` 根目录为准。
- 不再保留生成型“大而全”文档，避免同一能力出现多个相互重叠的说明入口。
- 文档里的能力边界应和源码一致，不为“不确定是否可用”编写兜底承诺。
- 离线资源目录 `public/amap/` 不在文档整理中删除。
