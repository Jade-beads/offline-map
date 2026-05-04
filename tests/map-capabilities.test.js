import { describe, expect, test } from 'bun:test'
import { createBankPointGeoJSON, createBankRadiusGeoJSON } from '../src/map-business'
import { createClusterData, createClusterLayer, getClusterFeatures } from '../src/map/cluster-layer-registry'
import { mapActions, mapStore } from '../src/map/map-store'
import { resolveFeatureStyle } from '../src/map/style-resolver'

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
  constructor() {
    this.handlers = {}
    this.content = ''
    this.offset = null
    this.extData = null
    this.title = ''
  }

  setContent(content) {
    this.content = content
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

  on(type, handler) {
    this.handlers[type] = handler
  }
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
    MarkerCluster: FakeMarkerCluster
  }
}

function createFakeMap() {
  return {
    boundsCalls: [],
    centerCalls: [],
    setBounds(bounds, immediately, padding) {
      this.boundsCalls.push({ bounds, immediately, padding })
    },
    setZoomAndCenter(zoom, center, immediately) {
      this.centerCalls.push({ zoom, center, immediately })
    }
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

    layer.show()
    expect(FakeMarkerCluster.instances[0].map).toBe(map)
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
})
