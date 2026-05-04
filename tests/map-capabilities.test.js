import { describe, expect, test } from 'bun:test'
import { createBankPointGeoJSON, createBankRadiusGeoJSON } from '../src/map-business'
import { createClusterData, createClusterLayer, getClusterFeatures } from '../src/map/cluster-layer-registry'
import { createLayer } from '../src/map/layer-registry'
import { MapController } from '../src/map/map-controller'
import { mapActions, mapStore } from '../src/map/map-store'
import { resolveFeatureStyle } from '../src/map/style-resolver'
import { createLocaLayer } from '../src/loca/loca-layer-registry'
import { locaActions, locaStore } from '../src/loca/loca-store'

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
}

class FakeBounds {
  constructor(southWest, northEast) {
    this.southWest = southWest
    this.northEast = northEast
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
}

class FakeVectorOverlay {
  constructor(options = {}) {
    this.options = options
    this.extData = options.extData || null
    this.visible = options.visible !== false
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

  getExtData() {
    return this.extData
  }

  on() {}
}

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

function createFakeAMap() {
  return {
    Pixel: FakePixel,
    LngLat: FakeLngLat,
    Bounds: FakeBounds,
    Marker: FakeMarker,
    Circle: FakeVectorOverlay,
    Polyline: FakeVectorOverlay,
    Polygon: FakeVectorOverlay,
    MarkerCluster: FakeMarkerCluster
  }
}

function createFakeMap() {
  return {
    added: [],
    removed: [],
    boundsCalls: [],
    centerCalls: [],
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
