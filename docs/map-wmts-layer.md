# WMTS 图层使用说明

WMTS 图层用于接入后端发布的瓦片服务，和 GeoJSON、WMS、MVT、Loca 是并列链路。业务侧通过 `mapActions.renderWMTSLayer()` 创建图层，后续显隐、样式 patch、清除复用通用图层命令。

## 模板 URL 模式

适合后端已经把 WMTS 或瓦片服务封装成 `{z}/{x}/{y}` 地址。

```js
mapActions.renderWMTSLayer({
  layerId: 'wmts-grid',
  url: 'http://内网服务/wmts/{z}/{x}/{y}.png',
  visible: true,
  opacity: 0.86,
  zIndex: 58,
  zooms: [3, 18],
  tileSize: 256
})
```

`url` 同时支持 `{z}/{x}/{y}` 和 `[z]/[x]/[y]` 占位符。

## 标准 WMTS KVP 模式

适合标准 `GetTile` 查询参数形式的 WMTS 服务。

```js
mapActions.renderWMTSLayer({
  layerId: 'wmts-standard',
  url: 'http://内网服务/geoserver/gwc/service/wmts',
  layer: 'demo:grid',
  tileMatrixSet: 'EPSG:3857',
  style: 'default',
  format: 'image/png',
  visible: true,
  opacity: 0.86,
  zIndex: 58,
  zooms: [3, 18]
})
```

生成的瓦片请求会包含：

```text
SERVICE=WMTS
REQUEST=GetTile
VERSION=1.0.0
LAYER=...
STYLE=...
TILEMATRIXSET=...
TILEMATRIX=...
TILEROW=...
TILECOL=...
FORMAT=...
```

如果服务的 `TILEMATRIX` 需要前缀，可以传：

```js
mapActions.renderWMTSLayer({
  layerId: 'wmts-standard',
  url: 'http://内网服务/geoserver/gwc/service/wmts',
  layer: 'demo:grid',
  tileMatrixSet: 'EPSG:3857',
  tileMatrixPrefix: 'EPSG:3857:'
})
```

如果每个缩放级别有固定 matrix 名称，可以传数组或对象：

```js
mapActions.renderWMTSLayer({
  layerId: 'wmts-standard',
  url: 'http://内网服务/geoserver/gwc/service/wmts',
  layer: 'demo:grid',
  tileMatrixSet: 'custom-set',
  tileMatrixLabels: {
    3: 'custom-set:3',
    4: 'custom-set:4'
  }
})
```

## 附加参数

`params`、`query`、`dimensions` 会合并到标准 WMTS 请求里，适合 token、time、维度过滤等服务参数。

```js
mapActions.renderWMTSLayer({
  layerId: 'wmts-time',
  url: 'http://内网服务/geoserver/gwc/service/wmts',
  layer: 'demo:grid',
  tileMatrixSet: 'EPSG:3857',
  params: {
    token: 'abc'
  },
  dimensions: {
    TIME: '2026-05-11'
  }
})
```

## 控制图层

```js
mapActions.setLayerVisible('wmts-grid', false)
mapActions.patchLayerStyle('wmts-grid', {
  opacity: 0.5
})
mapActions.clearLayer('wmts-grid')
```

## 参数规则

| 参数 | 说明 |
| --- | --- |
| `layerId` | 必填，图层唯一 id。 |
| `url` | 必填，模板 URL 或标准 WMTS 服务地址。 |
| `layer` | 标准 WMTS KVP 模式必填。 |
| `tileMatrixSet` | 标准 WMTS KVP 模式必填。 |
| `style` | WMTS `STYLE`，默认 `default`。 |
| `format` | WMTS `FORMAT`，默认 `image/png`。 |
| `tileMatrixPrefix` | 可选，用于拼接 `TILEMATRIX` 前缀。 |
| `tileMatrixLabels` | 可选，用数组或对象指定每个 zoom 对应的 matrix 名称。 |
| `params` / `query` / `dimensions` | 可选，会合并到标准 WMTS query 参数。 |
| `opacity` | 图层透明度。 |
| `zIndex` | 图层层级。 |
| `zooms` | 可见缩放范围。 |
| `tileSize` | 瓦片尺寸，默认 `256`。 |
