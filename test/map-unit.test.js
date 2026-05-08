import { createClusterData, getClusterFeatures } from '../src/map/cluster-layer-registry'
import { createLayer } from '../src/map/layer-registry'
import { mapActions, mapStore } from '../src/map/map-store'
import {
  getFeatureCategory,
  getFeatureId,
  getFeatureName,
  getFeatureProperties,
  getGeometryKind,
  getPropertyValue,
  isHeatmapStyle,
  mergeStyle,
  resolveFeatureStyle,
  resolveHeatmapStyle,
  resolveScaleValue
} from '../src/map/style-resolver'
import { createVectorTileLayer } from '../src/map/vector-tile-layer-registry'
import { createWMSLayer } from '../src/map/wms-layer-registry'

const pointFeature = {
  type: 'Feature',
  id: 'point-001',
  properties: {
    id: 'props-id',
    name: '测试点',
    category: 'device',
    metrics: {
      value: 50
    },
    status: 'online',
    mapStyle: {
      point: {
        color: '#111111'
      }
    }
  },
  geometry: {
    type: 'Point',
    coordinates: [121.5, 31.2]
  }
}

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
}

class FakeBounds {
  constructor(southWest, northEast) {
    this.southWest = southWest
    this.northEast = northEast
  }
}

class FakeMarker {
  constructor(options = {}) {
    this.options = options
    this.visible = options.visible !== false
    this.extData = options.extData
    this.content = options.content
    this.handlers = {}
  }

  show() {
    this.visible = true
  }

  hide() {
    this.visible = false
  }

  setOptions(options) {
    this.options = { ...this.options, ...options }
  }

  setContent(content) {
    this.content = content
  }

  setExtData(extData) {
    this.extData = extData
  }

  getExtData() {
    return this.extData
  }

  getPosition() {
    return this.options.position
  }

  on(type, handler) {
    this.handlers[type] = handler
  }
}

class FakeVectorOverlay {
  constructor(options = {}) {
    this.options = options
    this.visible = options.visible !== false
    this.extData = options.extData
    this.path = options.path
    this.handlers = {}
  }

  show() {
    this.visible = true
  }

  hide() {
    this.visible = false
  }

  setOptions(options) {
    this.options = { ...this.options, ...options }
  }

  setRadius(radius) {
    this.radius = radius
  }

  getExtData() {
    return this.extData
  }

  on(type, handler) {
    this.handlers[type] = handler
  }
}

class FakeHeatMap {
  constructor(map, options) {
    this.map = map
    this.options = options
    this.visible = options.visible !== false
    FakeHeatMap.instances.push(this)
  }

  setDataSet(dataset) {
    this.dataset = dataset
  }

  show() {
    this.visible = true
  }

  hide() {
    this.visible = false
  }

  setMap(map) {
    this.map = map
  }
}
FakeHeatMap.instances = []

class FakeWMSLayer {
  constructor(options = {}) {
    this.options = options
    this.params = options.params
    this.visible = options.visible !== false
    FakeWMSLayer.instances.push(this)
  }

  setUrl(url) {
    this.options.url = url
  }

  setParams(params) {
    this.params = params
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

class FakeVectorTileLayer {
  constructor(options = {}) {
    this.options = options
    this.visible = options.visible !== false
    this.handlers = {}
    FakeVectorTileLayer.instances.push(this)
  }

  setStyles(styles) {
    this.styles = styles
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
FakeVectorTileLayer.instances = []

function createFakeMap() {
  return {
    added: [],
    removed: [],
    boundsCalls: [],
    fitViewCalls: [],
    add(layer) {
      this.added.push(layer)
    },
    remove(layer) {
      if (Array.isArray(layer)) {
        this.removed.push(...layer)
      } else {
        this.removed.push(layer)
      }
    },
    setBounds(bounds, immediately, padding) {
      this.boundsCalls.push({ bounds, immediately, padding })
    },
    setFitView(overlays, immediately, padding, maxZoom) {
      this.fitViewCalls.push({ overlays, immediately, padding, maxZoom })
    }
  }
}

function createFakeAMap() {
  return {
    Pixel: FakePixel,
    LngLat: FakeLngLat,
    Bounds: FakeBounds,
    Marker: FakeMarker,
    Circle: FakeVectorOverlay,
    Polyline: FakeVectorOverlay,
    Polygon: FakeVectorOverlay,
    HeatMap: FakeHeatMap,
    TileLayer: {
      WMS: FakeWMSLayer
    },
    MapboxVectorTileLayer: FakeVectorTileLayer
  }
}

describe('style-resolver helpers', () => {
  test('merges style objects deeply and ignores undefined values', () => {
    const base = {
      point: {
        color: '#1677ff',
        label: {
          visible: false,
          field: 'name'
        }
      }
    }
    const merged = mergeStyle(base, {
      point: {
        color: undefined,
        size: 32,
        label: {
          visible: true
        }
      }
    })

    expect(merged).toEqual({
      point: {
        color: '#1677ff',
        size: 32,
        label: {
          visible: true,
          field: 'name'
        }
      }
    })
    expect(merged.point.label).not.toBe(base.point.label)
  })

  test('reads feature metadata with safe fallbacks', () => {
    expect(getFeatureProperties(pointFeature)).toBe(pointFeature.properties)
    expect(getFeatureId(pointFeature)).toBe('point-001')
    expect(getFeatureName(pointFeature)).toBe('测试点')
    expect(getFeatureCategory(pointFeature)).toBe('device')
    expect(getFeatureProperties(null)).toEqual({})
    expect(getFeatureId({ properties: { id: 42 } })).toBe(42)
    expect(getFeatureName({ properties: { id: 'fallback-id' } })).toBe('fallback-id')
  })

  test('detects geometry kind for supported GeoJSON geometry types', () => {
    expect(getGeometryKind({ geometry: { type: 'MultiPoint' } })).toBe('point')
    expect(getGeometryKind({ geometry: { type: 'LineString' } })).toBe('line')
    expect(getGeometryKind({ geometry: { type: 'MultiPolygon' } })).toBe('polygon')
    expect(getGeometryKind({ geometry: { type: 'GeometryCollection' } })).toBe('')
  })

  test('resolves nested property paths', () => {
    expect(getPropertyValue(pointFeature.properties, 'metrics.value')).toBe(50)
    expect(getPropertyValue(pointFeature.properties, 'metrics.missing')).toBeUndefined()
    expect(getPropertyValue(pointFeature.properties, '')).toBeUndefined()
  })

  test('resolves mapped and interpolated scale values', () => {
    const context = {
      properties: pointFeature.properties
    }

    expect(resolveScaleValue({
      field: 'status',
      map: {
        online: '#22c55e'
      },
      default: '#ef4444'
    }, context)).toBe('#22c55e')

    expect(resolveScaleValue({
      field: 'metrics.value',
      stops: [[0, 10], [100, 30]]
    }, context)).toBe(20)

    expect(resolveScaleValue({
      field: 'metrics.value',
      stops: [[0, 'low'], [100, 'high']],
      interpolate: false
    }, context)).toBe('low')
  })

  test('resolves feature style precedence and dynamic fields', () => {
    const style = resolveFeatureStyle({
      point: {
        color: '#1677ff',
        sizeBy: {
          field: 'metrics.value',
          stops: [[0, 10], [100, 30]]
        }
      },
      categories: {
        device: {
          point: {
            zIndex: 80
          }
        }
      },
      rules: [
        {
          when: {
            status: 'online'
          },
          style: {
            point: {
              color: '#22c55e',
              label: {
                visible: true,
                field: 'name'
              }
            }
          }
        }
      ]
    }, pointFeature, 'point')

    expect(style.color).toBe('#111111')
    expect(style.size).toBe(20)
    expect(style.zIndex).toBe(80)
    expect(style.label).toEqual({
      visible: true,
      field: 'name'
    })
    expect(style.sizeBy).toBeUndefined()
  })

  test('resolves heatmap style and heatmap detection', () => {
    const style = resolveHeatmapStyle({
      heatmap: {
        radius: 42,
        gradient: {
          1: '#000000'
        }
      }
    })

    expect(style.radius).toBe(42)
    expect(style.valueField).toBe('value')
    expect(style.gradient[1]).toBe('#000000')
    expect(isHeatmapStyle({ renderer: 'heatmap' })).toBe(true)
    expect(isHeatmapStyle({ type: 'heatmap' })).toBe(true)
    expect(isHeatmapStyle({ point: {} })).toBe(false)
  })
})

describe('cluster-layer-registry helpers', () => {
  test('normalizes point features and filters unsupported geometry', () => {
    const features = getClusterFeatures({
      type: 'FeatureCollection',
      features: [
        pointFeature,
        {
          type: 'Feature',
          properties: {
            id: 'line-001'
          },
          geometry: {
            type: 'LineString',
            coordinates: [[121, 31], [122, 32]]
          }
        },
        {
          type: 'MultiPoint',
          properties: {
            category: 'multi'
          },
          coordinates: [[121.6, 31.3], [121.7, 31.4]]
        }
      ]
    }, {
      source: 'default-source'
    })

    expect(features).toHaveLength(2)
    expect(features[0].properties.source).toBe('default-source')
    expect(features[1].id).toBe('cluster-geometry-2')
    expect(features[1].properties.category).toBe('multi')
  })

  test('creates cluster data for Point and MultiPoint features', () => {
    const features = getClusterFeatures([
      pointFeature,
      {
        type: 'Feature',
        id: 'multi-001',
        properties: {
          category: 'multi',
          weight: '8'
        },
        geometry: {
          type: 'MultiPoint',
          coordinates: [[121.6, 31.3], ['bad', 31.4], [121.7, 31.4]]
        }
      }
    ])
    const data = createClusterData(features)

    expect(data).toHaveLength(3)
    expect(data[0].featureId).toBe('point-001')
    expect(data[0].category).toBe('device')
    expect(data[0].lnglat).toEqual([121.5, 31.2])
    expect(data[1].featureId).toBe('multi-001')
    expect(data[1].weight).toBe(8)
    expect(data[2].pointIndex).toBe(1)
  })
})

describe('map-store actions', () => {
  beforeEach(() => {
    mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)
    mapActions.clearLayerInfo()
    mapActions.clearDrawResult()
    mapActions.clearCoordinatePickResult()
    mapActions.clearCustomMarkerResult()
    mapActions.setActiveTool('')
  })

  test('dispatches GeoJSON render command with default properties and selection focus', () => {
    mapActions.renderGeoJSONLayer({
      layerId: 'devices',
      visible: true,
      category: 'device',
      properties: {
        source: 'mock'
      },
      selection: {
        type: 'devices',
        id: 'point-001'
      }
    }, {
      type: 'FeatureCollection',
      features: [pointFeature]
    })

    expect(mapStore.commandQueue).toHaveLength(2)
    expect(mapStore.commandQueue[0].type).toBe('layer:render')
    expect(mapStore.commandQueue[0].payload.defaultProperties).toEqual({
      source: 'mock',
      category: 'device'
    })
    expect(mapStore.commandQueue[1]).toEqual({
      seq: mapStore.commandQueue[1].seq,
      type: 'layer:focus',
      payload: {
        type: 'devices',
        id: 'point-001'
      }
    })
  })

  test('stores and queries layer registry information', () => {
    mapActions.setLayerInfo('devices', {
      type: 'geojson',
      featureIndex: {
        'point-001': {
          name: '测试点'
        }
      }
    })

    expect(mapActions.getLayerInfo('devices').layerId).toBe('devices')
    expect(mapActions.getLayerList()).toHaveLength(1)
    expect(mapActions.getFeatureInfo('devices', 'point-001')).toEqual({
      name: '测试点'
    })

    mapActions.removeLayerInfo('devices')
    expect(mapActions.getLayerInfo('devices')).toBe(null)
  })

  test('does not dispatch layer commands when required ids are missing', () => {
    mapActions.setLayerStyle('', { point: { color: '#000000' } })
    mapActions.renderGeoJSONLayer({}, { type: 'FeatureCollection', features: [] })
    mapActions.setFeaturesVisible('', ['a'], false)
    mapActions.focusFeature('devices', null)

    expect(mapStore.commandQueue).toHaveLength(0)
  })

  test('updates active tool and dispatches tool commands', () => {
    mapActions.activateDraw('polygon')
    expect(mapStore.activeTool).toBe('draw:polygon')
    expect(mapStore.commandQueue[0].type).toBe('draw:start')
    expect(mapStore.commandQueue[0].payload.shape).toBe('polygon')

    mapActions.activateCoordinatePicker()
    expect(mapStore.activeTool).toBe('coordinate-picker')
    expect(mapStore.coordinatePickResult).toBe(null)
    expect(mapStore.commandQueue[1].type).toBe('coordinate-picker:start')

    mapActions.activateCustomMarker()
    expect(mapStore.activeTool).toBe('custom-marker')
    expect(mapStore.customMarkerResult).toBe(null)
    expect(mapStore.commandQueue[2].type).toBe('marker:start')
  })
})

describe('layer-registry createLayer', () => {
  beforeEach(() => {
    FakeHeatMap.instances = []
  })

  test('renders mixed GeoJSON overlays and patches style without clearing data', () => {
    const map = createFakeMap()
    const layer = createLayer('mixed', {
      AMap: createFakeAMap(),
      map
    })

    layer.setData({
      type: 'FeatureCollection',
      features: [
        pointFeature,
        {
          type: 'Feature',
          id: 'line-001',
          properties: { category: 'route' },
          geometry: {
            type: 'LineString',
            coordinates: [[121.5, 31.2], [121.6, 31.3]]
          }
        },
        {
          type: 'Feature',
          id: 'polygon-001',
          properties: { category: 'area' },
          geometry: {
            type: 'Polygon',
            coordinates: [[[121.5, 31.2], [121.6, 31.2], [121.6, 31.3], [121.5, 31.2]]]
          }
        }
      ]
    }, {
      point: { color: '#1677ff' },
      line: { strokeWeight: 3 },
      polygon: { fillOpacity: 0.2 }
    })

    layer.show()
    expect(map.added).toHaveLength(3)
    expect(layer.getInfo().featureCount).toBe(3)
    expect(layer.getInfo().geometryKinds).toEqual(['point', 'line', 'polygon'])

    layer.setCategoryVisible('route', false)
    expect(layer.getInfo().hiddenCategories).toEqual(['route'])
    expect(map.added[1].visible).toBe(false)

    expect(layer.setFeatureStyle('point-001', { point: { color: '#ef4444' } })).toBe(true)
    expect(layer.getInfo().styledFeatureIds).toEqual(['point-001'])

    layer.patchStyle({ point: { size: 36 } })
    expect(layer.getInfo().styleSnapshot.point.size).toBe(36)
  })

  test('renders heatmap data and refreshes visibility filters', () => {
    const layer = createLayer('heatmap', {
      AMap: createFakeAMap(),
      map: createFakeMap()
    })

    layer.setData({
      type: 'FeatureCollection',
      features: [
        pointFeature,
        {
          ...pointFeature,
          id: 'point-002',
          properties: {
            ...pointFeature.properties,
            category: 'hidden',
            value: 10
          },
          geometry: {
            type: 'Point',
            coordinates: [121.6, 31.3]
          }
        }
      ]
    }, {
      renderer: 'heatmap',
      heatmap: {
        valueField: 'value'
      }
    })
    layer.show()

    expect(FakeHeatMap.instances).toHaveLength(1)
    expect(FakeHeatMap.instances[0].dataset.data).toHaveLength(2)
    expect(layer.getInfo().hasHeatmap).toBe(true)

    layer.setCategoryVisible('hidden', false)
    expect(FakeHeatMap.instances[0].dataset.data).toHaveLength(1)

    layer.hide()
    expect(FakeHeatMap.instances[0].visible).toBe(false)
  })
})

describe('WMS and vector tile registries', () => {
  beforeEach(() => {
    FakeWMSLayer.instances = []
    FakeVectorTileLayer.instances = []
  })

  test('creates WMS layer, patches params and manages visibility', () => {
    const map = createFakeMap()
    const layer = createWMSLayer('wms-grid', {
      AMap: createFakeAMap(),
      map
    })

    layer.setData({
      url: 'http://localhost/geoserver/wms',
      visible: false,
      params: {
        LAYERS: 'demo:grid'
      }
    })

    expect(FakeWMSLayer.instances).toHaveLength(1)
    expect(map.added[0]).toBe(FakeWMSLayer.instances[0])
    expect(layer.getInfo().visible).toBe(false)
    expect(layer.getInfo().param.LAYERS).toBe('demo:grid')

    layer.patchStyle({
      visible: true,
      opacity: 0.5,
      param: {
        STYLES: 'heat'
      }
    })

    expect(FakeWMSLayer.instances[0].visible).toBe(true)
    expect(FakeWMSLayer.instances[0].opacity).toBe(0.5)
    expect(FakeWMSLayer.instances[0].params.STYLES).toBe('heat')

    layer.destroy()
    expect(map.removed).toContain(FakeWMSLayer.instances[0])
    expect(FakeWMSLayer.instances[0].destroyed).toBe(true)
  })

  test('creates vector tile layer, binds events and patches style', () => {
    const map = createFakeMap()
    const clicked = jest.fn()
    const layer = createVectorTileLayer('mvt-grid', {
      AMap: createFakeAMap(),
      map
    })

    layer.setData({
      url: 'http://localhost/tiles/{z}/{x}/{y}.pbf',
      opacity: 0.8,
      styles: {
        polygon: {
          sourceLayer: 'grid',
          color: '#f97316'
        }
      },
      events: {
        click: clicked
      },
      eventOptions: {
        click: {
          featType: 'polygon'
        }
      }
    })
    layer.show()

    expect(FakeVectorTileLayer.instances).toHaveLength(1)
    expect(FakeVectorTileLayer.instances[0].options.url).toBe('http://localhost/tiles/[z]/[x]/[y].pbf')
    expect(FakeVectorTileLayer.instances[0].handlers.click.option).toEqual({
      featType: 'polygon'
    })
    expect(layer.getInfo().sourceLayers).toEqual(['grid'])

    FakeVectorTileLayer.instances[0].handlers.click.handler([{ id: 1 }])
    expect(clicked).toHaveBeenCalledWith([{ id: 1 }])

    layer.patchStyle({
      opacity: 0.4,
      polygon: {
        borderWidth: 2
      }
    })
    expect(FakeVectorTileLayer.instances[0].opacity).toBe(0.4)
    expect(FakeVectorTileLayer.instances[0].styles.polygon.color).toBe('#f97316')
    expect(FakeVectorTileLayer.instances[0].styles.polygon.borderWidth).toBe(2)
    expect(layer.filterByRect([[0, 0], [1, 1]], 'polygon')).toEqual([
      {
        rect: [[0, 0], [1, 1]],
        type: 'polygon'
      }
    ])

    layer.reload()
    expect(FakeVectorTileLayer.instances[0].reloaded).toBe(true)
  })
})
