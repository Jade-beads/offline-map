import { describe, expect, test } from 'bun:test'
import { MessageBox } from 'element-ui'
import {
  BUSINESS_POI_CLUSTER_LAYER_ID,
  DISTRICT_COUNT_LAYER_ID,
  createBankPointGeoJSON,
  createBankRadiusGeoJSON,
  createDistrictCountGeoJSON,
  createDistrictCountGeoJSONFromPoiRecords,
  createPoiClusterDistrictZoomRenderer,
  createPoiPointGeoJSON,
  renderPoiClusterOrDistrictCount,
  renderDistrictCountPoints
} from '../src/map-business'
import { createClusterData, createClusterLayer, getClusterFeatures } from '../src/map/cluster-layer-registry'
import { createLayer } from '../src/map/layer-registry'
import { MapController } from '../src/map/map-controller'
import { mapActions, mapStore } from '../src/map/map-store'
import { resolveFeatureStyle } from '../src/map/style-resolver'
import { createVectorTileLayer } from '../src/map/vector-tile-layer-registry'
import { createWMSLayer } from '../src/map/wms-layer-registry'
import { createLocaLayer } from '../src/loca/loca-layer-registry'
import { locaActions, locaStore } from '../src/loca/loca-store'
import {
  MV_GRID_THINNING_LAYER_ID,
  MV_GRID_THINNING_URL,
  renderMvGridThinningVectorTileExample
} from '../src/examples/vector-tile-feature-examples'

const bankRecords = [
  {
    id: 9691,
    name: '中国银行上海分行',
    level3Classification: '中国银行',
    geom: {
      type: 'Point',
      coordinates: [121.541016, 31.239651]
    }
  },
  {
    id: 9692,
    name: '恒丰银行上海分行',
    level3Classification: '恒丰银行',
    geom: {
      type: 'Point',
      coordinates: [121.55, 31.24]
    }
  }
]

const districtCountRecords = [
  {
    districtName: '崇明区',
    geom: [121.397516, 31.626946],
    num: 53036
  },
  {
    districtName: '浦东新区',
    geom: {
      type: 'Point',
      coordinates: [121.544346, 31.221461]
    },
    num: 128806
  },
  {
    districtName: '无效坐标',
    geom: []
  }
]

const poiBusinessRecords = [
  {
    id: 863849,
    codeCoun: '310113',
    geom: {
      type: 'Point',
      coordinates: [121.494812, 31.37059]
    },
    name: '肆拾玖商店',
    nameCoun: '宝山区',
    pointX: 121.494812,
    pointY: 31.37059,
    showTag: '便利店'
  },
  {
    id: 863850,
    codeCoun: '310113',
    geom: {
      type: 'Point',
      coordinates: [121.497, 31.372]
    },
    name: '便利店二店',
    nameCoun: '宝山区',
    showTag: '便利店'
  },
  {
    id: 863851,
    codeCoun: '310151',
    geom: [],
    name: '崇明门店',
    nameCoun: '崇明区',
    pointX: 121.397516,
    pointY: 31.626946,
    showTag: '便利店'
  }
]

class FakePixel {
  constructor(x, y) {
    this.x = x
    this.y = y
  }
}

class FakeLngLat {
  constructor(lng, lat) {
    this.lng = lng
    this.lat = lat
  }

  toArray() {
    return [this.lng, this.lat]
  }

  getLng() {
    return this.lng
  }

  getLat() {
    return this.lat
  }
}

class FakeBounds {
  constructor(southWest, northEast) {
    this.southWest = southWest
    this.northEast = northEast
  }

  getSouthWest() {
    return this.southWest
  }

  getNorthEast() {
    return this.northEast
  }
}

class FakeMarker {
  constructor(options = {}) {
    this.handlers = {}
    this.options = options
    this.content = options.content || ''
    this.offset = options.offset || null
    this.extData = options.extData || null
    this.title = options.title || ''
    this.visible = options.visible !== false
    this.position = options.position
  }

  show() {
    this.visible = true
  }

  hide() {
    this.visible = false
  }

  setOptions(options) {
    this.options = {
      ...this.options,
      ...options
    }
  }

  setContent(content) {
    this.content = content
  }

  setIcon(icon) {
    this.icon = icon
  }

  setLabel(label) {
    this.label = label
  }

  setOffset(offset) {
    this.offset = offset
  }

  setExtData(extData) {
    this.extData = extData
  }

  setTitle(title) {
    this.title = title
  }

  setzIndex(zIndex) {
    this.zIndex = zIndex
  }

  getExtData() {
    return this.extData
  }

  getPosition() {
    return this.position
  }

  on(type, handler) {
    this.handlers[type] = handler
  }

  off(type, handler) {
    if (!handler || this.handlers[type] === handler) {
      delete this.handlers[type]
    }
  }
}

class FakeVectorOverlay {
  constructor(options = {}) {
    this.handlers = {}
    this.options = options
    this.extData = options.extData || null
    this.visible = options.visible !== false
    this.map = options.map === undefined ? 'map' : options.map
    this.path = options.path || []
    this.bounds = options.bounds || null
    this.center = options.center || null
    this.radius = options.radius
  }

  show() {
    this.visible = true
  }

  hide() {
    this.visible = false
  }

  setOptions(options) {
    this.options = {
      ...this.options,
      ...options
    }
  }

  setRadius(radius) {
    this.radius = radius
  }

  setExtData(extData) {
    this.extData = extData
  }

  setMap(map) {
    this.map = map
  }

  getExtData() {
    return this.extData
  }

  getPath() {
    return this.path
  }

  getBounds() {
    return this.bounds
  }

  getCenter() {
    return this.center
  }

  getRadius() {
    return this.radius
  }

  on(type, handler) {
    this.handlers[type] = handler
  }

  off(type, handler) {
    if (!handler || this.handlers[type] === handler) {
      delete this.handlers[type]
    }
  }
}

class FakeDrawEditor {
  constructor(map, overlay, options = {}) {
    this.map = map
    this.overlay = overlay
    this.options = options
    this.handlers = {}
    FakeDrawEditor.instances.push(this)
  }

  setTarget(overlay) {
    this.overlay = overlay
  }

  getTarget() {
    return this.overlay
  }

  open() {
    this.opened = true
  }

  close() {
    this.closed = true
    this.emit('end', {
      target: this.overlay
    })
  }

  destroy() {
    this.destroyed = true
  }

  on(type, handler) {
    this.handlers[type] = handler
  }

  off(type, handler) {
    if (!handler || this.handlers[type] === handler) {
      delete this.handlers[type]
    }
  }

  emit(type, event = {}) {
    if (typeof this.handlers[type] === 'function') {
      this.handlers[type](event)
    }
  }
}
FakeDrawEditor.instances = []

class FakeContextMenu {
  constructor() {
    this.items = []
    FakeContextMenu.instances.push(this)
  }

  addItem(label, handler, index) {
    this.items.push({ label, handler, index })
  }

  open(map, lnglat) {
    this.opened = {
      map,
      lnglat
    }
  }

  close() {
    this.closed = true
  }
}
FakeContextMenu.instances = []

class FakeMarkerCluster {
  constructor(map, data, options) {
    this.map = map
    this.data = data
    this.options = options
    this.handlers = {}
    FakeMarkerCluster.instances.push(this)
    this.render()
  }

  render() {
    this.markers = this.data.map((item) => {
      const marker = new FakeMarker()
      this.options.renderMarker({
        count: 1,
        marker,
        data: [item]
      })
      return marker
    })
    this.clusterMarker = new FakeMarker()
    this.options.renderClusterMarker({
      count: this.data.length,
      marker: this.clusterMarker,
      clusterData: this.data
    })
  }

  setData(data) {
    this.data = data
    this.render()
  }

  setMap(map) {
    this.map = map
  }

  getClustersCount() {
    return this.data.length > 1 ? 1 : this.data.length
  }

  on(type, handler) {
    this.handlers[type] = handler
  }
}
FakeMarkerCluster.instances = []

class FakeWMSLayer {
  constructor(options = {}) {
    this.options = options
    this.visible = options.visible !== false
    this.params = options.params || options.param || {}
    FakeWMSLayer.instances.push(this)
  }

  setUrl(url) {
    this.options.url = url
  }

  setParams(params) {
    this.params = params
    this.options.param = params
  }

  setOpacity(opacity) {
    this.opacity = opacity
    this.options.opacity = opacity
  }

  setzIndex(zIndex) {
    this.zIndex = zIndex
    this.options.zIndex = zIndex
  }

  setZooms(zooms) {
    this.zooms = zooms
    this.options.zooms = zooms
  }

  show() {
    this.visible = true
  }

  hide() {
    this.visible = false
  }

  destroy() {
    this.destroyed = true
  }
}
FakeWMSLayer.instances = []

class FakeTileLayer {
  constructor(options = {}) {
    this.options = options
    this.visible = options.visible !== false
    FakeTileLayer.instances.push(this)
  }

  getTileUrl(x, y, z) {
    return this.options.getTileUrl(x, y, z)
  }

  setOpacity(opacity) {
    this.opacity = opacity
    this.options.opacity = opacity
  }

  setzIndex(zIndex) {
    this.zIndex = zIndex
    this.options.zIndex = zIndex
  }

  setZooms(zooms) {
    this.zooms = zooms
    this.options.zooms = zooms
  }

  show() {
    this.visible = true
  }

  hide() {
    this.visible = false
  }

  destroy() {
    this.destroyed = true
  }
}
FakeTileLayer.instances = []
FakeTileLayer.WMS = FakeWMSLayer

class FakeMapboxVectorTileLayer {
  constructor(options = {}) {
    this.options = options
    this.visible = options.visible !== false
    this.styles = options.styles || {}
    this.handlers = {}
    FakeMapboxVectorTileLayer.instances.push(this)
  }

  setStyles(styles) {
    this.styles = styles
    this.options.styles = styles
  }

  setOpacity(opacity) {
    this.opacity = opacity
    this.options.opacity = opacity
  }

  setzIndex(zIndex) {
    this.zIndex = zIndex
    this.options.zIndex = zIndex
  }

  setZooms(zooms) {
    this.zooms = zooms
    this.options.zooms = zooms
  }

  show() {
    this.visible = true
  }

  hide() {
    this.visible = false
  }

  on(type, handler, option) {
    this.handlers[type] = { handler, option }
  }

  off(type) {
    delete this.handlers[type]
  }

  filterByRect(rect, type) {
    return [{ rect, type }]
  }

  reload() {
    this.reloaded = true
  }

  destroy() {
    this.destroyed = true
  }
}
FakeMapboxVectorTileLayer.instances = []

function createFakeAMap() {
  return {
    Pixel: FakePixel,
    LngLat: FakeLngLat,
    Bounds: FakeBounds,
    Marker: FakeMarker,
    Circle: FakeVectorOverlay,
    Polyline: FakeVectorOverlay,
    Polygon: FakeVectorOverlay,
    PolygonEditor: FakeDrawEditor,
    CircleEditor: FakeDrawEditor,
    RectangleEditor: FakeDrawEditor,
    ContextMenu: FakeContextMenu,
    MarkerCluster: FakeMarkerCluster,
    MapboxVectorTileLayer: FakeMapboxVectorTileLayer,
    TileLayer: FakeTileLayer
  }
}

function createFakeMap() {
  return {
    added: [],
    removed: [],
    boundsCalls: [],
    centerCalls: [],
    handlers: {},
    add(overlay) {
      this.added.push(overlay)
    },
    remove(overlays) {
      this.removed.push(...(Array.isArray(overlays) ? overlays : [overlays]))
    },
    setBounds(bounds, immediately, padding) {
      this.boundsCalls.push({ bounds, immediately, padding })
    },
    setZoomAndCenter(zoom, center, immediately) {
      this.centerCalls.push({ zoom, center, immediately })
    },
    on(type, handler) {
      this.handlers[type] = handler
    },
    off(type, handler) {
      if (!handler || this.handlers[type] === handler) {
        delete this.handlers[type]
      }
    }
  }
}

class FakeLocaSource {
  constructor(options = {}) {
    this.options = options
  }

  bf(data) {
    return data
  }

  nf() {
    this.notified = true
  }
}

class FakeLocaVisualLayer {
  constructor(options = {}) {
    this.options = options
    this.visible = options.visible !== false
    this.styles = []
  }

  setSource(source) {
    this.source = source
  }

  setStyle(style) {
    this.style = style
    this.styles.push(style)
  }

  show() {
    this.visible = true
  }

  hide() {
    this.visible = false
  }

  setOpacity(opacity) {
    this.opacity = opacity
  }

  setzIndex(zIndex) {
    this.zIndex = zIndex
  }

  setZooms(zooms) {
    this.zooms = zooms
  }

  destroy() {
    this.destroyed = true
  }
}

function createFakeLocaContainer() {
  return {
    layers: [],
    renderCount: 0,
    add(layer) {
      this.layers.push(layer)
    },
    remove(layer) {
      this.layers = this.layers.filter((item) => item !== layer)
    },
    requestRender() {
      this.renderCount += 1
    }
  }
}

function createFakeLoca() {
  return {
    GeoJSONSource: FakeLocaSource,
    PointLayer: FakeLocaVisualLayer,
    HeatMapLayer: FakeLocaVisualLayer,
    GridLayer: FakeLocaVisualLayer,
    PolygonLayer: FakeLocaVisualLayer,
    LineLayer: FakeLocaVisualLayer
  }
}

function waitForTimers(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('bank map business helpers', () => {
  test('converts business bank records to point GeoJSON with category', () => {
    const geoJSON = createBankPointGeoJSON(bankRecords)

    expect(geoJSON.features).toHaveLength(2)
    expect(geoJSON.features[0].id).toBe('9691')
    expect(geoJSON.features[0].properties.category).toBe('中国银行')
    expect(geoJSON.features[0].geometry.coordinates).toEqual([121.541016, 31.239651])
  })

  test('creates radius GeoJSON only for 中国银行 records', () => {
    const geoJSON = createBankRadiusGeoJSON(bankRecords, { radius: 1200 })

    expect(geoJSON.features).toHaveLength(1)
    expect(geoJSON.features[0].id).toBe('9691-radius')
    expect(geoJSON.features[0].properties.radius).toBe(1200)
    expect(geoJSON.features[0].properties.sourceFeatureId).toBe('9691')
  })
})

describe('district count map business helpers', () => {
  test('converts district count records to point GeoJSON', () => {
    const geoJSON = createDistrictCountGeoJSON(districtCountRecords)

    expect(geoJSON.features).toHaveLength(2)
    expect(geoJSON.features[0].id).toBe('崇明区')
    expect(geoJSON.features[0].properties.category).toBe('district-count')
    expect(geoJSON.features[0].properties.formattedNum).toBe('53,036')
    expect(geoJSON.features[0].geometry.coordinates).toEqual([121.397516, 31.626946])
    expect(geoJSON.features[1].geometry.coordinates).toEqual([121.544346, 31.221461])
  })

  test('dispatches district count render command with html marker and click event', () => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)
    const clicked = []

    const result = renderDistrictCountPoints(districtCountRecords, {
      fitView: true,
      onClick(payload) {
        clicked.push(payload)
      },
      style: {
        point: {
          zIndex: 100
        }
      }
    })

    expect(result.layerId).toBe(DISTRICT_COUNT_LAYER_ID)
    expect(result.geoJSON.features).toHaveLength(2)
    expect(mapStore.commandQueue[0].type).toBe('layer:clear')
    expect(mapStore.commandQueue[1].type).toBe('layer:render')
    expect(mapStore.commandQueue[1].payload.layerId).toBe(DISTRICT_COUNT_LAYER_ID)
    expect(mapStore.commandQueue[1].payload.style.point.renderer).toBe('html')
    expect(mapStore.commandQueue[1].payload.style.point.zIndex).toBe(100)
    expect(typeof mapStore.commandQueue[1].payload.events.click).toBe('function')
    expect(mapStore.commandQueue[2].type).toBe('layer:fit-view')

    mapStore.commandQueue[1].payload.events.click(result.geoJSON.features[0], {
      featureId: '崇明区',
      properties: result.geoJSON.features[0].properties,
      lnglat: [121.397516, 31.626946]
    })
    expect(clicked[0].districtName).toBe('崇明区')
    expect(clicked[0].num).toBe(53036)
  })

  test('converts POI records to cluster points and district count points', () => {
    const poiGeoJSON = createPoiPointGeoJSON(poiBusinessRecords)
    const districtGeoJSON = createDistrictCountGeoJSONFromPoiRecords(poiBusinessRecords)

    expect(poiGeoJSON.features).toHaveLength(3)
    expect(poiGeoJSON.features[0].id).toBe('863849')
    expect(poiGeoJSON.features[0].properties.category).toBe('便利店')
    expect(poiGeoJSON.features[2].geometry.coordinates).toEqual([121.397516, 31.626946])

    expect(districtGeoJSON.features).toHaveLength(2)
    expect(districtGeoJSON.features[0].properties.districtName).toBe('宝山区')
    expect(districtGeoJSON.features[0].properties.num).toBe(2)
    expect(districtGeoJSON.features[0].geometry.coordinates[0]).toBeCloseTo(121.495906, 6)
    expect(districtGeoJSON.features[0].geometry.coordinates[1]).toBeCloseTo(31.371295, 6)
    expect(districtGeoJSON.features[1].properties.districtName).toBe('崇明区')
    expect(districtGeoJSON.features[1].properties.num).toBe(1)
  })

  test('switches between POI cluster and district count layers by zoom', () => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)

    const lowZoomResult = renderPoiClusterOrDistrictCount(poiBusinessRecords, {
      zoom: 10,
      switchZoom: 11
    })

    expect(lowZoomResult.mode).toBe('district-count')
    expect(mapStore.commandQueue[0].type).toBe('layer:clear')
    expect(mapStore.commandQueue[0].payload.layerId).toBe(BUSINESS_POI_CLUSTER_LAYER_ID)
    expect(mapStore.commandQueue[1].type).toBe('layer:render')
    expect(mapStore.commandQueue[1].payload.layerId).toBe(DISTRICT_COUNT_LAYER_ID)

    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)
    const highZoomResult = renderPoiClusterOrDistrictCount(poiBusinessRecords, {
      zoom: 13,
      switchZoom: 11
    })

    expect(highZoomResult.mode).toBe('cluster')
    expect(mapStore.commandQueue[0].type).toBe('layer:clear')
    expect(mapStore.commandQueue[0].payload.layerId).toBe(DISTRICT_COUNT_LAYER_ID)
    expect(mapStore.commandQueue[1].type).toBe('layer:clear')
    expect(mapStore.commandQueue[1].payload.layerId).toBe(BUSINESS_POI_CLUSTER_LAYER_ID)
    expect(mapStore.commandQueue[2].type).toBe('cluster:render')
    expect(mapStore.commandQueue[2].payload.layerId).toBe(BUSINESS_POI_CLUSTER_LAYER_ID)
  })

  test('zoom renderer only redraws when display mode changes', () => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)

    const renderer = createPoiClusterDistrictZoomRenderer(poiBusinessRecords, {
      switchZoom: 11
    })

    expect(renderer.renderByZoom(13).mode).toBe('cluster')
    expect(mapStore.commandQueue).toHaveLength(3)

    expect(renderer.renderByZoom(14)).toEqual({
      mode: 'cluster',
      skipped: true
    })
    expect(mapStore.commandQueue).toHaveLength(3)

    expect(renderer.renderByZoom(10).mode).toBe('district-count')
    expect(mapStore.commandQueue[3].payload.layerId).toBe(BUSINESS_POI_CLUSTER_LAYER_ID)
    expect(mapStore.commandQueue[4].payload.layerId).toBe(DISTRICT_COUNT_LAYER_ID)
  })
})

describe('style callback support', () => {
  test('passes GeoJSON properties and feature into html callbacks', () => {
    const feature = createBankPointGeoJSON(bankRecords).features[0]
    const style = resolveFeatureStyle({
      point: {
        renderer: 'html',
        size: [32, 32],
        html: ({ properties, feature: currentFeature }) => {
          return `<i data-id="${currentFeature.id}">${properties.level3Classification}</i>`
        }
      }
    }, feature, 'point')

    expect(style.html).toContain('data-id="9691"')
    expect(style.html).toContain('中国银行')
  })

  test('keeps ordinary overlays bubbling so map tools work above polygons', () => {
    const pointFeature = createBankPointGeoJSON(bankRecords).features[0]
    const polygonFeature = {
      type: 'Feature',
      id: 'region-001',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [121.5, 31.2],
            [121.6, 31.2],
            [121.6, 31.3],
            [121.5, 31.3],
            [121.5, 31.2]
          ]
        ]
      }
    }

    expect(resolveFeatureStyle({}, pointFeature, 'point').bubble).toBe(true)
    expect(resolveFeatureStyle({}, polygonFeature, 'polygon').bubble).toBe(true)
    expect(resolveFeatureStyle({ polygon: { bubble: false } }, polygonFeature, 'polygon').bubble).toBe(false)
  })
})

describe('cluster layer helpers', () => {
  test('normalizes only point features and expands MultiPoint data', () => {
    const geoJSON = {
      type: 'FeatureCollection',
      features: [
        ...createBankPointGeoJSON(bankRecords).features,
        {
          type: 'Feature',
          id: 'multi',
          properties: {
            id: 'multi',
            category: 'multi'
          },
          geometry: {
            type: 'MultiPoint',
            coordinates: [
              [121.56, 31.24],
              [121.57, 31.25]
            ]
          }
        },
        {
          type: 'Feature',
          id: 'line',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [121, 31],
              [122, 32]
            ]
          }
        }
      ]
    }

    const features = getClusterFeatures(geoJSON)
    const data = createClusterData(features)

    expect(features).toHaveLength(3)
    expect(data).toHaveLength(4)
    expect(data.map((item) => item.featureId)).toContain('multi')
  })

  test('creates cluster layer, filters categories, fits and focuses', () => {
    FakeMarkerCluster.instances = []
    const AMap = createFakeAMap()
    const map = createFakeMap()
    const clicked = []
    const layer = createClusterLayer('bank-cluster', { AMap, map })
    const geoJSON = createBankPointGeoJSON(bankRecords)

    layer.setData(geoJSON, {
      gridSize: 70,
      point: {
        renderer: 'pin',
        textField: 'level3Classification'
      },
      cluster: {
        color: '#f59e0b'
      }
    }, {
      events: {
        click(feature, event) {
          clicked.push({
            id: feature.id,
            eventId: event.featureId
          })
        }
      }
    })
    layer.show()

    expect(layer.getInfo().type).toBe('cluster')
    expect(layer.getInfo().featureCount).toBe(2)
    expect(layer.getInfo().overlayCount).toBe(2)
    expect(layer.getInfo().clusterCount).toBe(1)

    FakeMarkerCluster.instances[0].markers[0].handlers.click({})
    expect(clicked).toEqual([
      {
        id: '9691',
        eventId: '9691'
      }
    ])

    layer.setCategoryVisible('恒丰银行', false)
    expect(layer.getInfo().hiddenCategories).toEqual(['恒丰银行'])
    expect(layer.getInfo().overlayCount).toBe(2)
    expect(FakeMarkerCluster.instances[0].data).toHaveLength(1)

    layer.fitView({ padding: [20, 30] })
    expect(map.boundsCalls).toHaveLength(1)
    expect(map.boundsCalls[0].padding).toEqual([20, 30, 20, 30])

    FakeMarkerCluster.instances[0].data[0].lnglat = new FakeLngLat(121.541016, 31.239651)
    layer.fitView({ padding: [24, 32] })
    expect(map.boundsCalls).toHaveLength(2)
    expect(map.boundsCalls[1].padding).toEqual([24, 32, 24, 32])

    layer.focus(9691)
    expect(map.centerCalls[0].center).toEqual([121.541016, 31.239651])

    layer.patchStyle({
      point: {
        color: '#22c55e'
      },
      cluster: {
        textColor: '#111827'
      }
    })
    expect(layer.getInfo().styleSnapshot.point.textField).toBe('level3Classification')
    expect(layer.getInfo().styleSnapshot.point.color).toBe('#22c55e')
    expect(layer.getInfo().styleSnapshot.cluster.color).toBe('#f59e0b')
    expect(layer.getInfo().styleSnapshot.cluster.textColor).toBe('#111827')

    layer.show()
    expect(FakeMarkerCluster.instances[FakeMarkerCluster.instances.length - 1].map).toBe(map)
  })

  test('supports custom svg/html cluster marker content', () => {
    FakeMarkerCluster.instances = []
    const AMap = createFakeAMap()
    const map = createFakeMap()
    const layer = createClusterLayer('bank-cluster-svg', { AMap, map })

    layer.setData(createBankPointGeoJSON(bankRecords), {
      cluster: {
        renderer: 'html',
        size: [52, 52],
        html: ({ count }) => `
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="23" fill="#1677ff" />
            <text x="26" y="31">${count}</text>
          </svg>
        `
      }
    })

    const clusterMarker = FakeMarkerCluster.instances[0].clusterMarker
    expect(clusterMarker.content).toContain('geojson-cluster-custom-marker')
    expect(clusterMarker.content).toContain('<svg')
    expect(clusterMarker.content).toContain('<text x="26" y="31">2</text>')
    expect(clusterMarker.offset.x).toBe(-26)
    expect(clusterMarker.offset.y).toBe(-26)

    layer.patchStyle({
      cluster: {
        renderer: 'image',
        image: {
          src: '/cluster.svg'
        },
        text: ({ count }) => `${count}+`
      }
    })

    const imageClusterMarker = FakeMarkerCluster.instances[FakeMarkerCluster.instances.length - 1].clusterMarker
    expect(imageClusterMarker.content).toContain('img src="http://localhost/cluster.svg"')
    expect(imageClusterMarker.content).toContain('<span>2+</span>')
  })
})

describe('map action command entry', () => {
  test('dispatches cluster render command without changing normal render entry', () => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)

    mapActions.renderGeoJSONClusterLayer({
      layerId: 'bank-cluster',
      visible: true,
      style: {
        gridSize: 80
      }
    }, createBankPointGeoJSON(bankRecords))

    expect(mapStore.commandQueue).toHaveLength(1)
    expect(mapStore.commandQueue[0].type).toBe('cluster:render')
    expect(mapStore.commandQueue[0].payload.layerId).toBe('bank-cluster')
  })

  test('dispatches WMS render command as a separate layer entry', () => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)

    mapActions.renderWMSLayer({
      layerId: 'geo-server-grid',
      url: 'http://localhost/geoserver/demo/wms',
      visible: true,
      param: {
        LAYERS: 'demo:grid'
      }
    })

    expect(mapStore.commandQueue).toHaveLength(1)
    expect(mapStore.commandQueue[0].type).toBe('wms:render')
    expect(mapStore.commandQueue[0].payload.layerId).toBe('geo-server-grid')
    expect(mapStore.commandQueue[0].payload.param.LAYERS).toBe('demo:grid')
  })

  test('dispatches vector tile render command as a separate layer entry', () => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)

    mapActions.renderVectorTileLayer({
      layerId: 'avg-price-mvt',
      url: 'http://localhost/tiles/[z]/[x]/[y].pbf',
      visible: true,
      styles: {
        polygon: {
          sourceLayer: 'avg_price_grid',
          color: '#f97316'
        }
      }
    })

    expect(mapStore.commandQueue).toHaveLength(1)
    expect(mapStore.commandQueue[0].type).toBe('vector-tile:render')
    expect(mapStore.commandQueue[0].payload.layerId).toBe('avg-price-mvt')
    expect(mapStore.commandQueue[0].payload.styles.polygon.sourceLayer).toBe('avg_price_grid')
  })

  test('dispatches mv_grid_thinning vector tile example with provided service url', () => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)

    const layerId = renderMvGridThinningVectorTileExample()

    expect(layerId).toBe(MV_GRID_THINNING_LAYER_ID)
    expect(mapStore.commandQueue).toHaveLength(1)
    expect(mapStore.commandQueue[0].type).toBe('vector-tile:render')
    expect(mapStore.commandQueue[0].payload.layerId).toBe(MV_GRID_THINNING_LAYER_ID)
    expect(mapStore.commandQueue[0].payload.url).toBe(MV_GRID_THINNING_URL)
    expect(mapStore.commandQueue[0].payload.styles.polygon.sourceLayer).toBe('mv_grid_thinning')
    expect(typeof mapStore.commandQueue[0].payload.styles.polygon.color).toBe('string')
    expect(mapStore.commandQueue[0].payload.styles.polygon.color).toBe('rgba(249, 115, 22, 0.68)')
    expect(mapStore.commandQueue[0].payload.styles.polygon.color).not.toContain('getGridValue')
    expect(mapStore.commandQueue[0].payload.eventOptions.click.featType).toBe('polygon')
  })

  test('dispatches patch style command for map and Loca layers', () => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)
    locaActions.clearHandledCommands(Number.POSITIVE_INFINITY)

    mapActions.patchLayerStyle('bank', {
      point: {
        color: '#f59e0b'
      }
    })
    locaActions.patchLayerStyle('loca-bank', {
      radius: 18
    })

    expect(mapStore.commandQueue[0].type).toBe('layer:style:patch')
    expect(mapStore.commandQueue[0].payload.stylePatch.point.color).toBe('#f59e0b')
    expect(locaStore.commandQueue[0].type).toBe('loca:layer:style:patch')
    expect(locaStore.commandQueue[0].payload.stylePatch.radius).toBe(18)
  })

  test('clears previous custom marker result when entering marker mode', () => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)
    mapActions.setCustomMarkerResult({
      id: 'old-marker',
      position: [121, 31],
      lng: 121,
      lat: 31
    })

    mapActions.activateCustomMarker()

    expect(mapStore.customMarkerResult).toBe(null)
    expect(mapStore.commandQueue[0].type).toBe('marker:start')
  })

  test('activates coordinate picker and stores picked coordinate result', () => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)
    mapActions.setCoordinatePickResult({
      coordinate: '121,31'
    })

    mapActions.activateCoordinatePicker()

    expect(mapStore.activeTool).toBe('coordinate-picker')
    expect(mapStore.coordinatePickResult).toBe(null)
    expect(mapStore.commandQueue[0].type).toBe('coordinate-picker:start')

    mapActions.setCoordinatePickResult({
      position: [121.541016, 31.239651],
      lng: 121.541016,
      lat: 31.239651,
      coordinate: '121.541016,31.239651',
      timestamp: 100
    })
    expect(mapStore.coordinatePickResult.coordinate).toBe('121.541016,31.239651')

    mapActions.clearCoordinatePickResult()
    expect(mapStore.coordinatePickResult).toBe(null)
  })

  test('dispatches custom marker rename, save and delete commands', () => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)

    mapActions.updateCustomMarkerName('custom-001', '上海锚点')
    mapActions.saveCustomMarker('custom-001')
    mapActions.deleteCustomMarker('custom-001')

    expect(mapStore.commandQueue.map((command) => command.type)).toEqual([
      'marker:update-name',
      'marker:save',
      'marker:delete'
    ])
    expect(mapStore.commandQueue[0].payload).toEqual({
      id: 'custom-001',
      name: '上海锚点'
    })
    expect(mapStore.commandQueue[1].payload.id).toBe('custom-001')
    expect(mapStore.commandQueue[2].payload.id).toBe('custom-001')
  })

  test('dispatches custom marker render command', () => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)

    mapActions.renderCustomMarkers([
      {
        id: 'custom-001',
        name: '上海锚点',
        position: [121.541016, 31.239651]
      }
    ])

    expect(mapStore.commandQueue[0].type).toBe('marker:render')
    expect(mapStore.commandQueue[0].payload.markers[0].id).toBe('custom-001')
  })

  test('dispatches clear layers except command', () => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)

    mapActions.clearLayersExcept(['keep-layer', 'other-keep-layer'])

    expect(mapStore.commandQueue[0]).toEqual({
      seq: mapStore.commandQueue[0].seq,
      type: 'layers:clear-except',
      payload: {
        layerIds: ['keep-layer', 'other-keep-layer']
      }
    })
  })

  test('controller routes patch style command and syncs layer info', () => {
    const synced = []
    const controller = new MapController({
      AMap: createFakeAMap(),
      map: createFakeMap(),
      actions: {
        setLayerInfo(layerId, info) {
          synced.push({ layerId, info })
        }
      }
    })
    const patched = []

    controller.layers.set('fake-layer', {
      patchStyle(stylePatch) {
        patched.push(stylePatch)
      },
      getInfo() {
        return {
          featureCount: 1
        }
      }
    })

    controller.handleCommand({
      type: 'layer:style:patch',
      payload: {
        layerId: 'fake-layer',
        stylePatch: {
          polygon: {
            fillOpacity: 0.45
          }
        }
      }
    })

    expect(patched).toHaveLength(1)
    expect(patched[0].polygon.fillOpacity).toBe(0.45)
    expect(synced[0]).toEqual({
      layerId: 'fake-layer',
      info: {
        featureCount: 1
      }
    })
  })

  test('controller clears every layer except target layer ids', () => {
    const removed = []
    const destroyed = []
    const controller = new MapController({
      AMap: createFakeAMap(),
      map: createFakeMap(),
      actions: {
        removeLayerInfo(layerId) {
          removed.push(layerId)
        }
      }
    })

    controller.layers.set('keep-layer', {
      destroy() {
        destroyed.push('keep-layer')
      }
    })
    controller.layers.set('remove-layer', {
      destroy() {
        destroyed.push('remove-layer')
      }
    })
    controller.layers.set('other-keep-layer', {
      destroy() {
        destroyed.push('other-keep-layer')
      }
    })

    controller.handleCommand({
      type: 'layers:clear-except',
      payload: {
        layerIds: ['keep-layer', 'other-keep-layer']
      }
    })

    expect(Array.from(controller.layers.keys())).toEqual(['keep-layer', 'other-keep-layer'])
    expect(destroyed).toEqual(['remove-layer'])
    expect(removed).toEqual(['remove-layer'])
  })

  test('controller prepares map tools before coordinate picking', () => {
    const map = createFakeMap()
    const controller = new MapController({
      AMap: createFakeAMap(),
      map,
      actions: {
        setActiveTool() {}
      }
    })
    const closedMouseTool = []
    const clearedRuler = []
    const customMarkerHandler = () => {}

    controller.mouseTool = {
      close(ifClear) {
        closedMouseTool.push(ifClear)
      }
    }
    controller.rangingTool = {
      turnOff(ifClear) {
        clearedRuler.push(ifClear)
      }
    }
    controller.customMarkerHandler = customMarkerHandler
    map.on('click', customMarkerHandler)

    controller.handleCommand({
      type: 'coordinate-picker:start'
    })

    expect(closedMouseTool).toEqual([false])
    expect(clearedRuler).toEqual([true])
    expect(map.handlers.click).toBeUndefined()
    expect(controller.customMarkerHandler).toBe(null)
  })
})

describe('WMS layer registry', () => {
  test('creates WMS layer, patches params and reuses common visibility lifecycle', () => {
    FakeWMSLayer.instances = []
    const map = createFakeMap()
    const layer = createWMSLayer('geo-server-grid', {
      AMap: createFakeAMap(),
      map
    })

    layer.setData({
      url: 'http://localhost/geoserver/demo/wms',
      visible: true,
      opacity: 0.8,
      zIndex: 70,
      param: {
        LAYERS: 'demo:grid',
        viewparams: 'age:0|1|2;gender:0|1'
      }
    })

    expect(FakeWMSLayer.instances).toHaveLength(1)
    expect(map.added[0]).toBe(FakeWMSLayer.instances[0])
    expect(layer.getInfo().type).toBe('wms')
    expect(layer.getInfo().visible).toBe(true)
    expect(layer.getInfo().param.LAYERS).toBe('demo:grid')
    expect(layer.getInfo().param.FORMAT).toBe('image/png')
    expect(FakeWMSLayer.instances[0].options.params.LAYERS).toBe('demo:grid')
    expect(FakeWMSLayer.instances[0].options.params.viewparams).toBe('age:0|1|2;gender:0|1')
    expect(FakeWMSLayer.instances[0].params.viewparams).toBe('age:0|1|2;gender:0|1')

    layer.hide()
    expect(FakeWMSLayer.instances[0].visible).toBe(false)
    expect(layer.getInfo().visible).toBe(false)

    layer.show()
    expect(FakeWMSLayer.instances[0].visible).toBe(true)

    layer.patchStyle({
      opacity: 0.45,
      zIndex: 90,
      param: {
        STYLES: 'heat_style'
      }
    })

    expect(FakeWMSLayer.instances[0].opacity).toBe(0.45)
    expect(FakeWMSLayer.instances[0].zIndex).toBe(90)
    expect(FakeWMSLayer.instances[0].params.LAYERS).toBe('demo:grid')
    expect(FakeWMSLayer.instances[0].params.STYLES).toBe('heat_style')

    layer.destroy()
    expect(map.removed).toContain(FakeWMSLayer.instances[0])
    expect(FakeWMSLayer.instances[0].destroyed).toBe(true)
  })

  test('accepts params alias before first WMS tile request', () => {
    FakeWMSLayer.instances = []
    const layer = createWMSLayer('geo-server-grid', {
      AMap: createFakeAMap(),
      map: createFakeMap()
    })

    layer.setData({
      url: 'http://localhost/geoserver/demo/wms',
      params: {
        LAYERS: 'demo:avg_price_grid',
        viewparams: 'age:0|1|2;gender:0|1'
      }
    })

    expect(FakeWMSLayer.instances).toHaveLength(1)
    expect(FakeWMSLayer.instances[0].options.params.LAYERS).toBe('demo:avg_price_grid')
    expect(FakeWMSLayer.instances[0].options.params.viewparams).toBe('age:0|1|2;gender:0|1')
    expect(FakeWMSLayer.instances[0].params.viewparams).toBe('age:0|1|2;gender:0|1')
  })

  test('ignores empty WMS option updates without reading visible from undefined', () => {
    FakeWMSLayer.instances = []
    const layer = createWMSLayer('geo-server-grid', {
      AMap: createFakeAMap(),
      map: createFakeMap()
    })

    expect(() => layer.setData()).not.toThrow()
    expect(() => layer.setStyle(null)).not.toThrow()
    expect(() => layer.patchStyle(undefined)).not.toThrow()
    expect(FakeWMSLayer.instances).toHaveLength(0)

    layer.setData({
      url: 'http://localhost/geoserver/demo/wms',
      visible: false,
      param: {
        LAYERS: 'demo:grid'
      }
    })
    expect(FakeWMSLayer.instances).toHaveLength(1)
    expect(layer.getInfo().visible).toBe(false)

    expect(() => layer.patchStyle(null)).not.toThrow()
    expect(layer.getInfo().visible).toBe(false)
    expect(layer.getInfo().param.LAYERS).toBe('demo:grid')
  })

  test('controller renders WMS layer and syncs layer info', () => {
    FakeWMSLayer.instances = []
    const synced = []
    const removed = []
    const controller = new MapController({
      AMap: createFakeAMap(),
      map: createFakeMap(),
      actions: {
        setLayerInfo(layerId, info) {
          synced.push({ layerId, info })
        },
        removeLayerInfo(layerId) {
          removed.push(layerId)
        }
      }
    })

    controller.handleCommand({
      type: 'wms:render',
      payload: {
        layerId: 'geo-server-grid',
        url: 'http://localhost/geoserver/demo/wms',
        visible: true,
        param: {
          LAYERS: 'demo:grid'
        }
      }
    })

    expect(synced[0].layerId).toBe('geo-server-grid')
    expect(synced[0].info.type).toBe('wms')
    expect(synced[0].info.param.LAYERS).toBe('demo:grid')

    controller.handleCommand({
      type: 'layer:style:patch',
      payload: {
        layerId: 'geo-server-grid',
        stylePatch: {
          opacity: 0.5
        }
      }
    })
    expect(synced[synced.length - 1].info.opacity).toBe(0.5)

    controller.handleCommand({
      type: 'layer:clear',
      payload: {
        layerId: 'geo-server-grid'
      }
    })
    expect(removed).toEqual(['geo-server-grid'])
  })
})

describe('vector tile layer registry', () => {
  test('creates MVT layer, binds events, patches style and visibility', () => {
    FakeMapboxVectorTileLayer.instances = []
    const map = createFakeMap()
    const clickEvents = []
    const layer = createVectorTileLayer('avg-price-mvt', {
      AMap: createFakeAMap(),
      map
    })

    layer.setData({
      url: 'http://localhost/tiles/{z}/{x}/{y}.pbf',
      visible: true,
      opacity: 0.86,
      zIndex: 62,
      zooms: [8, 18],
      dataZooms: [8, 14],
      styles: {
        polygon: {
          sourceLayer: 'avg_price_grid',
          color: '#f97316',
          borderWidth: 0.5
        }
      },
      events: {
        click(features, event) {
          clickEvents.push({ features, event })
        }
      },
      eventOptions: {
        click: {
          featType: 'polygon',
          buffer: 4
        }
      }
    })

    expect(FakeMapboxVectorTileLayer.instances).toHaveLength(1)
    expect(map.added[0]).toBe(FakeMapboxVectorTileLayer.instances[0])
    expect(layer.getInfo().type).toBe('vector-tile')
    expect(layer.getInfo().visible).toBe(true)
    expect(FakeMapboxVectorTileLayer.instances[0].options.url).toBe('http://localhost/tiles/[z]/[x]/[y].pbf')
    expect(layer.getInfo().sourceLayers).toEqual(['avg_price_grid'])
    expect(layer.getInfo().eventTypes).toEqual(['click'])
    expect(FakeMapboxVectorTileLayer.instances[0].handlers.click.option).toEqual({
      featType: 'polygon',
      buffer: 4
    })

    FakeMapboxVectorTileLayer.instances[0].handlers.click.handler([{ id: 1 }], { type: 'click' })
    expect(clickEvents[0].features).toEqual([{ id: 1 }])

    layer.patchStyle({
      opacity: 0.6,
      polygon: {
        borderColor: '#111827',
        borderWidth: 1
      }
    })

    expect(FakeMapboxVectorTileLayer.instances[0].opacity).toBe(0.6)
    expect(FakeMapboxVectorTileLayer.instances[0].styles.polygon.color).toBe('#f97316')
    expect(FakeMapboxVectorTileLayer.instances[0].styles.polygon.borderColor).toBe('#111827')
    expect(FakeMapboxVectorTileLayer.instances[0].styles.polygon.borderWidth).toBe(1)

    layer.hide()
    expect(FakeMapboxVectorTileLayer.instances[0].visible).toBe(false)
    expect(layer.getInfo().visible).toBe(false)

    layer.show()
    expect(FakeMapboxVectorTileLayer.instances[0].visible).toBe(true)

    expect(layer.filterByRect([[0, 0], [1, 1]], 'polygon')).toEqual([
      {
        rect: [[0, 0], [1, 1]],
        type: 'polygon'
      }
    ])

    layer.destroy()
    expect(map.removed).toContain(FakeMapboxVectorTileLayer.instances[0])
    expect(FakeMapboxVectorTileLayer.instances[0].destroyed).toBe(true)
  })

  test('controller renders vector tile layer and keeps common layer commands working', () => {
    FakeMapboxVectorTileLayer.instances = []
    const synced = []
    const removed = []
    const controller = new MapController({
      AMap: createFakeAMap(),
      map: createFakeMap(),
      actions: {
        setLayerInfo(layerId, info) {
          synced.push({ layerId, info })
        },
        removeLayerInfo(layerId) {
          removed.push(layerId)
        }
      }
    })

    controller.handleCommand({
      type: 'vector-tile:render',
      payload: {
        layerId: 'avg-price-mvt',
        url: 'http://localhost/tiles/[z]/[x]/[y].pbf',
        styles: {
          polygon: {
            sourceLayer: 'avg_price_grid',
            color: '#84cc16'
          }
        }
      }
    })

    expect(synced[0].layerId).toBe('avg-price-mvt')
    expect(synced[0].info.type).toBe('vector-tile')
    expect(synced[0].info.url).toBe('http://localhost/tiles/[z]/[x]/[y].pbf')

    controller.handleCommand({
      type: 'layer:style:patch',
      payload: {
        layerId: 'avg-price-mvt',
        stylePatch: {
          polygon: {
            borderWidth: 2
          }
        }
      }
    })
    expect(synced[synced.length - 1].info.styleSnapshot.polygon.borderWidth).toBe(2)

    controller.handleCommand({
      type: 'layer:visible',
      payload: {
        layerId: 'avg-price-mvt',
        visible: false
      }
    })
    expect(synced[synced.length - 1].info.visible).toBe(false)

    controller.handleCommand({
      type: 'layer:clear',
      payload: {
        layerId: 'avg-price-mvt'
      }
    })
    expect(removed).toEqual(['avg-price-mvt'])
  })

  test('controller renders WMTS layer and keeps common layer commands working', () => {
    FakeTileLayer.instances = []
    const synced = []
    const removed = []
    const map = createFakeMap()
    const controller = new MapController({
      AMap: createFakeAMap(),
      map,
      actions: {
        setLayerInfo(layerId, info) {
          synced.push({ layerId, info })
        },
        removeLayerInfo(layerId) {
          removed.push(layerId)
        }
      }
    })

    controller.handleCommand({
      type: 'wmts:render',
      payload: {
        layerId: 'wmts-grid',
        url: 'http://localhost/wmts/{z}/{x}/{y}.png',
        visible: true,
        opacity: 0.8
      }
    })

    expect(FakeTileLayer.instances).toHaveLength(1)
    expect(map.added[0]).toBe(FakeTileLayer.instances[0])
    expect(FakeTileLayer.instances[0].getTileUrl(1, 2, 3)).toBe('http://localhost/wmts/3/1/2.png')
    expect(synced[0].layerId).toBe('wmts-grid')
    expect(synced[0].info.type).toBe('wmts')
    expect(synced[0].info.template).toBe(true)

    controller.handleCommand({
      type: 'layer:style:patch',
      payload: {
        layerId: 'wmts-grid',
        stylePatch: {
          opacity: 0.42
        }
      }
    })
    expect(FakeTileLayer.instances[0].opacity).toBe(0.42)
    expect(synced[synced.length - 1].info.opacity).toBe(0.42)

    controller.handleCommand({
      type: 'layer:visible',
      payload: {
        layerId: 'wmts-grid',
        visible: false
      }
    })
    expect(FakeTileLayer.instances[0].visible).toBe(false)
    expect(synced[synced.length - 1].info.visible).toBe(false)

    controller.handleCommand({
      type: 'layer:clear',
      payload: {
        layerId: 'wmts-grid'
      }
    })
    expect(removed).toEqual(['wmts-grid'])
  })
})

describe('custom marker result', () => {
  test('stores clicked custom marker coordinates for business components', () => {
    const map = createFakeMap()
    const results = []
    const markerActions = []
    const activeTools = []
    const controller = new MapController({
      AMap: createFakeAMap(),
      map,
      actions: {
        setCustomMarkerResult(result) {
          results.push(result)
        },
        setCustomMarkerAction(action) {
          markerActions.push(action)
        },
        setActiveTool(tool) {
          activeTools.push(tool)
        },
        setLayerInfo() {},
        removeLayerInfo() {}
      }
    })

    controller.startCustomMarker()
    expect(typeof map.handlers.click).toBe('function')

    map.handlers.click({
      lnglat: {
        toArray() {
          return [121.541016, 31.239651]
        }
      }
    })

    expect(map.added).toHaveLength(1)
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('custom-marker')
    expect(results[0].id.startsWith('custom-')).toBe(true)
    expect(results[0].position).toEqual([121.541016, 31.239651])
    expect(results[0].lng).toBe(121.541016)
    expect(results[0].lat).toBe(31.239651)
    expect(typeof results[0].createdAt).toBe('number')
    expect(map.added[0].extData.position).toEqual([121.541016, 31.239651])
    expect(map.handlers.click).toBeUndefined()
    expect(activeTools).toEqual([''])
    expect(markerActions[0].type).toBe('create')
    expect(markerActions[0].result.position).toEqual([121.541016, 31.239651])
  })

  test('custom marker context menu renames, requests save and deletes marker', async () => {
    FakeContextMenu.instances = []
    const previousPrompt = MessageBox.prompt
    MessageBox.prompt = () => Promise.resolve({ value: '上海锚点' })
    const map = createFakeMap()
    const results = []
    const saveRequests = []
    const markerActions = []
    let clearResultCount = 0
    const controller = new MapController({
      AMap: createFakeAMap(),
      map,
      actions: {
        setCustomMarkerResult(result) {
          results.push(result)
        },
        clearCustomMarkerResult() {
          clearResultCount += 1
        },
        setCustomMarkerSaveRequest(request) {
          saveRequests.push(request)
        },
        setCustomMarkerAction(action) {
          markerActions.push(action)
        },
        setActiveTool() {},
        setLayerInfo() {},
        removeLayerInfo() {}
      }
    })
    const originEvent = {
      preventDefaultCalled: false,
      stopPropagationCalled: false,
      preventDefault() {
        this.preventDefaultCalled = true
      },
      stopPropagation() {
        this.stopPropagationCalled = true
      }
    }

    try {
      controller.startCustomMarker()
      map.handlers.click({
        lnglat: new FakeLngLat(121.541016, 31.239651)
      })

      const marker = map.added[0]
      expect(marker.title).toBe('自定义锚点')
      expect(marker.label.content).toBe('自定义锚点')
      expect(typeof marker.handlers.rightclick).toBe('function')

      marker.handlers.rightclick({
        lnglat: new FakeLngLat(121.541016, 31.239651),
        originEvent
      })

      expect(FakeContextMenu.instances).toHaveLength(1)
      expect(FakeContextMenu.instances[0].opened.lnglat.toArray()).toEqual([121.541016, 31.239651])
      expect(originEvent.preventDefaultCalled).toBe(true)
      expect(originEvent.stopPropagationCalled).toBe(true)

      const renameMenu = FakeContextMenu.instances[0]
      renameMenu.items.find((item) => item.index === 0).handler()
      await Promise.resolve()
      expect(marker.title).toBe('上海锚点')
      expect(marker.label.content).toBe('上海锚点')
      expect(marker.getExtData().name).toBe('上海锚点')
      expect(results[results.length - 1].name).toBe('上海锚点')
      expect(markerActions[markerActions.length - 1].type).toBe('update')
      expect(renameMenu.closed).toBe(true)

      marker.handlers.rightclick({
        lnglat: new FakeLngLat(121.541016, 31.239651),
        originEvent
      })
      expect(FakeContextMenu.instances).toHaveLength(2)
      const saveMenu = FakeContextMenu.instances[1]
      saveMenu.items.find((item) => item.index === 1).handler()
      expect(saveRequests).toHaveLength(1)
      expect(saveRequests[0].name).toBe('上海锚点')
      expect(saveRequests[0].position).toEqual([121.541016, 31.239651])
      expect(typeof saveRequests[0].requestedAt).toBe('number')
      expect(markerActions[markerActions.length - 1].type).toBe('save')
      expect(saveMenu.closed).toBe(true)

      marker.handlers.rightclick({
        lnglat: new FakeLngLat(121.541016, 31.239651),
        originEvent
      })
      expect(FakeContextMenu.instances).toHaveLength(3)
      const deleteMenu = FakeContextMenu.instances[2]
      deleteMenu.items.find((item) => item.index === 2).handler()
      expect(map.removed).toContain(marker)
      expect(clearResultCount).toBe(1)
      expect(markerActions[markerActions.length - 1].type).toBe('delete')
      expect(deleteMenu.closed).toBe(true)
    } finally {
      MessageBox.prompt = previousPrompt
    }
  })

  test('renders saved custom markers with context menu and emits delete action', () => {
    FakeContextMenu.instances = []
    const map = createFakeMap()
    const results = []
    const markerActions = []
    let clearResultCount = 0
    const controller = new MapController({
      AMap: createFakeAMap(),
      map,
      actions: {
        setCustomMarkerResult(result) {
          results.push(result)
        },
        clearCustomMarkerResult() {
          clearResultCount += 1
        },
        setCustomMarkerAction(action) {
          markerActions.push(action)
        },
        setActiveTool() {},
        setLayerInfo() {},
        removeLayerInfo() {}
      }
    })

    controller.renderCustomMarkers({
      markers: [
        {
          id: 'saved-marker-001',
          name: '上海锚点',
          lng: 121.541016,
          lat: 31.239651
        }
      ]
    })

    expect(markerActions[0].type).toBe('render')
    expect(markerActions[0].ids).toEqual(['saved-marker-001'])
    expect(map.added).toHaveLength(1)
    const marker = map.added[0]
    expect(marker.title).toBe('上海锚点')
    expect(marker.getExtData().id).toBe('saved-marker-001')
    expect(typeof marker.handlers.rightclick).toBe('function')

    marker.handlers.rightclick({
      lnglat: new FakeLngLat(121.541016, 31.239651),
      originEvent: {
        preventDefault() {},
        stopPropagation() {}
      }
    })

    expect(results[0].id).toBe('saved-marker-001')
    const menu = FakeContextMenu.instances[0]
    menu.items.find((item) => item.index === 2).handler()

    expect(map.removed).toContain(marker)
    expect(clearResultCount).toBe(1)
    expect(markerActions.map((action) => action.type)).toEqual(['render', 'delete'])
    expect(markerActions[1].id).toBe('saved-marker-001')
    expect(markerActions[1].result.position).toEqual([121.541016, 31.239651])
    expect(markerActions[1].markerCount).toBe(0)
  })
})

describe('draw overlay management', () => {
  test('stores drawn overlay, exposes result and deletes it through actions', async () => {
    const map = createFakeMap()
    const results = []
    const overlayInfos = []
    const overlayActions = []
    const activeTools = []
    let clearResultCount = 0
    const controller = new MapController({
      AMap: createFakeAMap(),
      map,
      actions: {
        setDrawResult(result) {
          results.push(result)
        },
        clearDrawResult() {
          clearResultCount += 1
        },
        setDrawOverlayInfo(info) {
          overlayInfos.push(info)
        },
        setDrawOverlayAction(action) {
          overlayActions.push(action)
        },
        setActiveTool(tool) {
          activeTools.push(tool)
        },
        setLayerInfo() {},
        removeLayerInfo() {}
      }
    })
    const overlay = new FakeVectorOverlay({
      path: [
        new FakeLngLat(121.1, 31.1),
        new FakeLngLat(121.2, 31.1),
        new FakeLngLat(121.2, 31.2)
      ],
      bounds: new FakeBounds(new FakeLngLat(121.1, 31.1), new FakeLngLat(121.2, 31.2))
    })
    const cachedBusinessOverlay = new FakeVectorOverlay()
    controller.mouseTool = {
      overlays: {
        polygon: [overlay, overlay, cachedBusinessOverlay],
        circle: []
      },
      close() {}
    }

    controller.currentDrawShape = 'polygon'
    controller.handleDrawComplete({
      obj: overlay
    })
    await waitForTimers()

    expect(results).toHaveLength(1)
    expect(results[0].shape).toBe('polygon')
    expect(results[0].geoJSON.geometry.type).toBe('Polygon')
    expect(results[0].geoJSON.geometry.coordinates[0][0]).toEqual([121.1, 31.1])
    expect(results[0].bounds.southWest).toEqual([121.1, 31.1])
    expect(overlayInfos[0].overlayCount).toBe(1)
    expect(overlayActions[0].type).toBe('create')
    expect(overlayActions[0].id).toBe(results[0].id)
    expect(overlayActions[0].result.geoJSON.geometry.type).toBe('Polygon')
    expect(overlay.getExtData().type).toBe('draw-overlay')
    expect(typeof overlay.handlers.rightclick).toBe('function')
    expect(activeTools).toContain('')
    expect(controller.mouseTool.overlays.polygon).toEqual([cachedBusinessOverlay])

    controller.deleteDrawOverlay({
      id: results[0].id
    })

    expect(overlay.map).toBe(null)
    expect(cachedBusinessOverlay.map).toBe('map')
    expect(clearResultCount).toBe(1)
    expect(overlayInfos[overlayInfos.length - 1]).toBe(null)
    expect(overlayActions[1].type).toBe('delete')
    expect(overlayActions[1].id).toBe(results[0].id)
    expect(overlayActions[1].overlayCount).toBe(0)
  })

  test('starts and stops draw overlay editor and refreshes GeoJSON after edits', async () => {
    FakeDrawEditor.instances = []
    const map = createFakeMap()
    const results = []
    const overlayInfos = []
    const overlayActions = []
    const controller = new MapController({
      AMap: createFakeAMap(),
      map,
      actions: {
        setDrawResult(result) {
          results.push(result)
        },
        clearDrawResult() {},
        setDrawOverlayInfo(info) {
          overlayInfos.push(info)
        },
        setDrawOverlayAction(action) {
          overlayActions.push(action)
        },
        setActiveTool() {},
        setLayerInfo() {},
        removeLayerInfo() {}
      }
    })
    const overlay = new FakeVectorOverlay({
      path: [
        new FakeLngLat(121.1, 31.1),
        new FakeLngLat(121.2, 31.1),
        new FakeLngLat(121.2, 31.2)
      ],
      bounds: new FakeBounds(new FakeLngLat(121.1, 31.1), new FakeLngLat(121.2, 31.2))
    })

    controller.currentDrawShape = 'polygon'
    controller.handleDrawComplete({
      obj: overlay
    })
    await waitForTimers()

    const drawId = results[0].id
    controller.startEditDrawOverlay({
      id: drawId
    })

    expect(FakeDrawEditor.instances).toHaveLength(1)
    expect(FakeDrawEditor.instances[0].opened).toBe(true)
    expect(overlayInfos[overlayInfos.length - 1].editing).toBe(true)
    expect(overlayActions.map((action) => action.type)).toContain('edit-start')

    FakeContextMenu.instances = []
    overlay.handlers.rightclick({
      lnglat: new FakeLngLat(121.2, 31.2),
      originEvent: {
        preventDefault() {},
        stopPropagation() {}
      }
    })
    expect(FakeContextMenu.instances).toHaveLength(1)
    expect(FakeContextMenu.instances[0].items.map((item) => item.label)).toContain('完成编辑')
    expect(FakeContextMenu.instances[0].items.map((item) => item.label)).not.toContain('编辑图形')

    overlay.path = [
      new FakeLngLat(121.3, 31.3),
      new FakeLngLat(121.4, 31.3),
      new FakeLngLat(121.4, 31.4)
    ]
    FakeDrawEditor.instances[0].emit('adjust')

    expect(results[results.length - 1].geoJSON.geometry.coordinates[0][0]).toEqual([121.3, 31.3])
    expect(overlayActions.map((action) => action.type)).toContain('update')

    controller.stopEditDrawOverlay()
    await waitForTimers()

    expect(FakeDrawEditor.instances[0].closed).toBe(true)
    expect(FakeDrawEditor.instances[0].destroyed).toBe(true)
    expect(overlayInfos[overlayInfos.length - 1].editing).toBe(false)
    expect(overlayActions[overlayActions.length - 1].type).toBe('edit-stop')
    expect(overlayActions[overlayActions.length - 1].id).toBe(drawId)
  })

  test('emits clear action with all temporary draw overlay ids', async () => {
    const map = createFakeMap()
    const overlayActions = []
    let clearResultCount = 0
    const controller = new MapController({
      AMap: createFakeAMap(),
      map,
      actions: {
        setDrawResult() {},
        clearDrawResult() {
          clearResultCount += 1
        },
        setDrawOverlayInfo() {},
        setDrawOverlayAction(action) {
          overlayActions.push(action)
        },
        setActiveTool() {},
        setLayerInfo() {},
        removeLayerInfo() {}
      }
    })
    const polygon = new FakeVectorOverlay({
      path: [
        new FakeLngLat(121.1, 31.1),
        new FakeLngLat(121.2, 31.1),
        new FakeLngLat(121.2, 31.2)
      ],
      bounds: new FakeBounds(new FakeLngLat(121.1, 31.1), new FakeLngLat(121.2, 31.2))
    })
    const circle = new FakeVectorOverlay({
      center: new FakeLngLat(121.5, 31.5),
      radius: 800,
      bounds: new FakeBounds(new FakeLngLat(121.49, 31.49), new FakeLngLat(121.51, 31.51))
    })

    controller.currentDrawShape = 'polygon'
    controller.handleDrawComplete({
      obj: polygon
    })
    controller.currentDrawShape = 'circle'
    controller.handleDrawComplete({
      obj: circle
    })
    await waitForTimers()

    controller.clearDrawOverlays()

    expect(polygon.map).toBe(null)
    expect(circle.map).toBe(null)
    const clearAction = overlayActions[overlayActions.length - 1]
    expect(clearAction.type).toBe('clear')
    expect(clearAction.ids).toHaveLength(2)
    expect(clearAction.records.map((record) => record.shape)).toEqual(['polygon', 'circle'])
    expect(clearAction.overlayCount).toBe(0)
    expect(clearResultCount).toBe(1)
  })

  test('opens draw overlay context menu and routes menu delete action', async () => {
    FakeContextMenu.instances = []
    const map = createFakeMap()
    const results = []
    let clearResultCount = 0
    const controller = new MapController({
      AMap: createFakeAMap(),
      map,
      actions: {
        setDrawResult(result) {
          results.push(result)
        },
        clearDrawResult() {
          clearResultCount += 1
        },
        setDrawOverlayInfo() {},
        setActiveTool() {},
        setLayerInfo() {},
        removeLayerInfo() {}
      }
    })
    const overlay = new FakeVectorOverlay({
      center: new FakeLngLat(121.5, 31.5),
      radius: 800,
      bounds: new FakeBounds(new FakeLngLat(121.49, 31.49), new FakeLngLat(121.51, 31.51))
    })
    const originEvent = {
      preventDefaultCalled: false,
      stopPropagationCalled: false,
      preventDefault() {
        this.preventDefaultCalled = true
      },
      stopPropagation() {
        this.stopPropagationCalled = true
      }
    }

    controller.currentDrawShape = 'circle'
    controller.handleDrawComplete({
      obj: overlay
    })
    await waitForTimers()

    overlay.handlers.rightclick({
      lnglat: new FakeLngLat(121.5, 31.5),
      originEvent
    })

    expect(FakeContextMenu.instances).toHaveLength(1)
    const menu = FakeContextMenu.instances[0]
    expect(menu.opened.lnglat.toArray()).toEqual([121.5, 31.5])
    expect(originEvent.preventDefaultCalled).toBe(true)
    expect(originEvent.stopPropagationCalled).toBe(true)
    expect(menu.items.map((item) => item.label)).toContain('编辑图形')
    expect(menu.items.map((item) => item.label)).not.toContain('完成编辑')
    expect(menu.items.map((item) => item.label)).not.toContain('清空绘图')

    const deleteItem = menu.items.find((item) => item.label === '删除图形')
    deleteItem.handler()

    expect(overlay.map).toBe(null)
    expect(clearResultCount).toBe(1)
    expect(menu.closed).toBe(true)
  })
})

describe('generic layer style patching', () => {
  test('patches normal GeoJSON layer style without clearing feature highlights', () => {
    const AMap = createFakeAMap()
    const map = createFakeMap()
    const layer = createLayer('mixed-layer', { AMap, map })
    const geoJSON = {
      type: 'FeatureCollection',
      features: [
        createBankPointGeoJSON(bankRecords).features[0],
        {
          type: 'Feature',
          id: 'line-001',
          properties: {
            id: 'line-001'
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [121.52, 31.23],
              [121.56, 31.25]
            ]
          }
        },
        {
          type: 'Feature',
          id: 'polygon-001',
          properties: {
            id: 'polygon-001'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [121.52, 31.23],
                [121.56, 31.23],
                [121.56, 31.26],
                [121.52, 31.26],
                [121.52, 31.23]
              ]
            ]
          }
        }
      ]
    }

    layer.setData(geoJSON, {
      point: {
        renderer: 'pin',
        size: [32, 32],
        color: '#1677ff'
      },
      line: {
        strokeColor: '#1677ff',
        strokeWeight: 3
      },
      polygon: {
        fillColor: '#1677ff',
        fillOpacity: 0.18
      }
    })
    layer.show()
    layer.setFeatureStyle('9691', {
      point: {
        zIndex: 140
      }
    })
    layer.patchStyle({
      point: {
        color: '#f59e0b'
      },
      polygon: {
        fillOpacity: 0.45
      }
    })

    const info = layer.getInfo()
    expect(info.overlayCount).toBe(3)
    expect(info.styleSnapshot.point.size).toEqual([32, 32])
    expect(info.styleSnapshot.point.color).toBe('#f59e0b')
    expect(info.styleSnapshot.line.strokeWeight).toBe(3)
    expect(info.styleSnapshot.polygon.fillColor).toBe('#1677ff')
    expect(info.styleSnapshot.polygon.fillOpacity).toBe(0.45)
    expect(info.styledFeatureIds).toEqual(['9691'])
  })

  test('patches Loca visual style and layer options without clearing highlights', () => {
    const container = createFakeLocaContainer()
    const layer = createLocaLayer('loca-point', {
      Loca: createFakeLoca(),
      AMap: createFakeAMap(),
      map: createFakeMap(),
      container,
      type: 'point'
    })

    layer.setData(createBankPointGeoJSON(bankRecords), {
      radius: 8,
      color: '#1677ff',
      layerOptions: {
        zIndex: 20
      }
    })
    layer.show()
    layer.setFeatureStyle('9691', {
      color: '#f59e0b'
    })
    const baseLayer = container.layers[0]
    layer.patchStyle({
      radius: 16,
      layerOptions: {
        opacity: 0.62
      }
    })

    const info = layer.getInfo()
    expect(info.styleSnapshot.radius).toBe(16)
    expect(info.styleSnapshot.color).toBe('#1677ff')
    expect(info.layerOptions.zIndex).toBe(20)
    expect(info.layerOptions.opacity).toBe(0.62)
    expect(info.styledFeatureIds).toEqual(['9691'])
    expect(baseLayer.destroyed).not.toBe(true)
    expect(baseLayer.opacity).toBe(0.62)
    expect(container.renderCount).toBeGreaterThan(0)
  })
})
