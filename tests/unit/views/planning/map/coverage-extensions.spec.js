import HeatmapToolbar from '../../../../../src/components/HeatmapToolbar.vue'
import CustomerHeatmapToolbar from '../../../../../src/components/CustomerHeatmapToolbar.vue'
import { LocaController } from '../../../../../src/loca/loca-controller'
import { createLocaLayer } from '../../../../../src/loca/loca-layer-registry'
import { locaActions, locaStore } from '../../../../../src/loca/loca-store'
import { createLayer } from '../../../../../src/map/layer-registry'
import { MapController } from '../../../../../src/map/map-controller'
import { mapActions, mapStore } from '../../../../../src/map/map-store'
import {
  BANK_POINT_LAYER_ID,
  BANK_RADIUS_LAYER_ID,
  BUSINESS_POI_CLUSTER_LAYER_ID,
  DISTRICT_COUNT_LAYER_ID,
  createBankPointGeoJSON,
  createBankRadiusGeoJSON,
  createPoiClusterDistrictZoomRenderer,
  createDistrictCountGeoJSONFromPoiRecords,
  renderDistrictCountPoints,
  renderBankPointsWithChinaBankRadius,
  renderPoiClusterLayer,
  renderPoiClusterOrDistrictCount
} from '../../../../../src/map-business'

const pointFeature = {
  type: 'Feature',
  id: 'point-1',
  properties: {
    id: 'point-1',
    name: '测试点',
    category: 'branch',
    value: 12
  },
  geometry: {
    type: 'Point',
    coordinates: [121.5, 31.2]
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

class FakePixel {
  constructor(x, y) {
    this.x = x
    this.y = y
  }

  getX() {
    return this.x
  }

  getY() {
    return this.y
  }
}

class FakeSize {
  constructor(width, height) {
    this.width = width
    this.height = height
  }
}

class FakeIcon {
  constructor(options = {}) {
    this.options = options
  }
}

class FakeBounds {
  constructor(southWest, northEast) {
    this.southWest = southWest
    this.northEast = northEast
  }
}

class FakeGeoJSONSource {
  constructor(options = {}) {
    this.options = options
    this.dataset = options.data
    FakeGeoJSONSource.instances.push(this)
  }

  bf(data) {
    this.bfData = data
    return { data }
  }

  nf() {
    this.notified = true
  }
}
FakeGeoJSONSource.instances = []

class FakeLocaLayer {
  constructor(options = {}) {
    this.options = options
    this.visible = options.visible !== false
    FakeLocaLayer.instances.push(this)
  }

  setSource(source) {
    this.source = source
  }

  setStyle(style) {
    this.style = style
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
FakeLocaLayer.instances = []

class FakeMapOverlay {
  constructor(options = {}) {
    this.options = options
    this.extData = options.extData
    this.visible = options.visible !== false
    this.handlers = {}
    this.position = options.position || options.center
    this.path = options.path
    this.content = options.content || ''
    this.icon = options.icon
    this.label = options.label
    this.radius = options.radius
    FakeMapOverlay.instances.push(this)
  }

  show() {
    this.visible = true
  }

  hide() {
    this.visible = false
  }

  setOptions(options = {}) {
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

  setExtData(extData) {
    this.extData = extData
  }

  setMap(map) {
    this.map = map
  }

  setOffset(offset) {
    this.offset = offset
  }

  setTitle(title) {
    this.title = title
  }

  setRadius(radius) {
    this.radius = radius
  }

  getExtData() {
    return this.extData
  }

  getPosition() {
    return this.position
  }

  getPath() {
    return this.path || [
      new FakeLngLat(121.5, 31.2),
      new FakeLngLat(121.7, 31.2),
      new FakeLngLat(121.7, 31.4)
    ]
  }

  getBounds() {
    return new FakeBounds(new FakeLngLat(121.5, 31.2), new FakeLngLat(121.7, 31.4))
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
FakeMapOverlay.instances = []

class FakeDrawEditor {
  constructor(map, overlay, options = {}) {
    this.map = map
    this.overlay = overlay
    this.options = options
    this.handlers = {}
    FakeDrawEditor.instances.push(this)
  }

  setTarget(overlay) {
    this.target = overlay
  }

  on(type, handler) {
    this.handlers[type] = handler
  }

  off(type, handler) {
    if (!handler || this.handlers[type] === handler) {
      delete this.handlers[type]
    }
  }

  open() {
    this.opened = true
  }

  close() {
    this.closed = true
  }

  destroy() {
    this.destroyed = true
  }
}
FakeDrawEditor.instances = []

class FakeControllerLayer {
  constructor(info = {}) {
    this.info = {
      type: 'geojson',
      ...info
    }
  }

  show() {
    this.visible = true
  }

  hide() {
    this.visible = false
  }

  setStyle(style) {
    this.style = style
  }

  patchStyle(stylePatch) {
    this.stylePatch = stylePatch
  }

  setCategoryVisible(category, visible) {
    this.categoryVisibility = { category, visible }
  }

  setFeaturesVisible(featureIds, visible) {
    this.featuresVisibility = { featureIds, visible }
  }

  setFeatureStyle(featureId, style) {
    this.featureStyle = { featureId, style }
  }

  clearFeatureStyle(featureId) {
    this.clearedFeatureId = featureId
  }

  clearFeatureStyles() {
    this.clearedFeatureStyles = true
  }

  fitView(options) {
    this.fitOptions = options
  }

  focus(featureId) {
    this.focusedFeatureId = featureId
  }

  destroy() {
    this.destroyed = true
  }

  getInfo() {
    return {
      ...this.info,
      visible: this.visible
    }
  }
}

function createFakeLoca() {
  return {
    Container: class {
      constructor(options = {}) {
        this.options = options
        this.added = []
        this.removed = []
        this.renderCount = 0
      }

      add(layer) {
        this.added.push(layer)
      }

      remove(layer) {
        this.removed.push(layer)
      }

      requestRender() {
        this.renderCount += 1
      }

      destroy() {
        this.destroyed = true
      }
    },
    GeoJSONSource: FakeGeoJSONSource,
    PointLayer: FakeLocaLayer,
    HeatMapLayer: FakeLocaLayer,
    GridLayer: FakeLocaLayer,
    PolygonLayer: FakeLocaLayer,
    LineLayer: FakeLocaLayer
  }
}

function createFakeAMap() {
  return {
    Pixel: FakePixel,
    Size: FakeSize,
    Icon: FakeIcon,
    LngLat: FakeLngLat,
    Bounds: FakeBounds,
    Marker: FakeMapOverlay,
    Circle: FakeMapOverlay,
    Polyline: FakeMapOverlay,
    Polygon: FakeMapOverlay,
    PolygonEditor: FakeDrawEditor,
    RectangleEditor: FakeDrawEditor,
    CircleEditor: FakeDrawEditor
  }
}

function createFakeMap() {
  return {
    added: [],
    removed: [],
    boundsCalls: [],
    fitViewCalls: [],
    zoomCalls: [],
    add(overlay) {
      this.added.push(overlay)
    },
    remove(overlays) {
      this.removed.push(...(Array.isArray(overlays) ? overlays : [overlays]))
    },
    setBounds(bounds, immediately, padding) {
      this.boundsCalls.push({ bounds, immediately, padding })
    },
    setFitView(overlays, immediately, padding, maxZoom) {
      this.fitViewCalls.push({ overlays, immediately, padding, maxZoom })
    },
    setZoomAndCenter(zoom, position, immediately) {
      this.zoomCalls.push({ zoom, position, immediately })
    }
  }
}

function resetMapStore() {
  mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)
  mapActions.clearLayerInfo()
  mapActions.clearDrawResult()
  mapActions.clearCoordinatePickResult()
  mapActions.clearCustomMarkerResult()
  mapActions.clearCustomMarkerAction()
  mapActions.setActiveTool('')
}

function resetLocaStore() {
  locaActions.clearHandledCommands(Number.POSITIVE_INFINITY)
  locaActions.clearLayerInfo()
}

function createToolbarContext(component, props) {
  const context = {
    ...props,
    $emit: jest.fn()
  }
  Object.assign(context, component.data.call(context))
  Object.keys(component.computed || {}).forEach((key) => {
    Object.defineProperty(context, key, {
      get() {
        return component.computed[key].call(context)
      }
    })
  })
  Object.keys(component.methods || {}).forEach((key) => {
    context[key] = component.methods[key].bind(context)
  })
  return context
}

beforeEach(() => {
  resetMapStore()
  resetLocaStore()
  FakeGeoJSONSource.instances = []
  FakeLocaLayer.instances = []
  FakeMapOverlay.instances = []
  FakeDrawEditor.instances = []
})

describe('组件工具条脚本逻辑', () => {
  test('HeatmapToolbar 按 map 模式派发显隐和透明度 patch', () => {
    const toolbar = createToolbarContext(HeatmapToolbar, {
      layerId: 'map-heat',
      mode: 'map',
      visible: true,
      opacity: 95,
      minOpacity: 10,
      maxOpacity: 100,
      step: 20,
      stops: [
        { value: 0, color: '#00f', label: '低' },
        { value: 1, color: '#f00', label: '高' }
      ]
    })

    expect(HeatmapToolbar.computed.gradientCss.call(toolbar)).toContain('#00f 0%')

    HeatmapToolbar.methods.decreaseOpacity.call(toolbar)
    HeatmapToolbar.methods.handleVisibleChange.call(toolbar, false)

    expect(toolbar.localOpacity).toBe(75)
    expect(toolbar.$emit).toHaveBeenCalledWith('opacity-change', 75)
    expect(toolbar.$emit).toHaveBeenCalledWith('visible-change', false)
    expect(mapStore.commandQueue.map((command) => command.type)).toEqual([
      'layer:style:patch',
      'layer:visible'
    ])
    expect(mapStore.commandQueue[0].payload.stylePatch.heatmap.opacity).toEqual([0.15, 0.75])
  })

  test('CustomerHeatmapToolbar 按 loca 模式裁剪透明度并派发图层选项', () => {
    const toolbar = createToolbarContext(CustomerHeatmapToolbar, {
      layerId: 'customer-heat',
      mode: 'loca',
      visible: true,
      opacity: 150,
      minOpacity: 10,
      maxOpacity: 100,
      step: 10,
      stops: [{ color: '#0f0' }, null, { color: '#f00' }]
    })

    expect(CustomerHeatmapToolbar.computed.normalizedStops.call(toolbar)).toHaveLength(2)

    CustomerHeatmapToolbar.methods.handleOpacityChange.call(toolbar, 5)
    CustomerHeatmapToolbar.methods.handleVisibleChange.call(toolbar, false)

    expect(toolbar.localOpacity).toBe(10)
    expect(toolbar.$emit).toHaveBeenCalledWith('opacity-change', 10)
    expect(locaStore.commandQueue.map((command) => command.type)).toEqual([
      'loca:layer:style:patch',
      'loca:layer:visible'
    ])
    expect(locaStore.commandQueue[0].payload.stylePatch.layerOptions.opacity).toBe(0.1)
  })
})

describe('Loca 图层链路', () => {
  test('locaActions 派发渲染、样式、查询和清理命令', () => {
    locaActions.renderGeoJSONLayer({
      layerId: 'loca-branches',
      type: 'point',
      visible: true,
      category: 'branch',
      properties: { source: 'unit' }
    }, {
      type: 'FeatureCollection',
      features: [pointFeature]
    })
    locaActions.patchLayerStyle('loca-branches', { layerOptions: { opacity: 0.4 } })
    locaActions.highlightFeature('loca-branches', 'point-1')
    locaActions.fitLayerView('loca-branches', { padding: [10, 20] })

    expect(locaStore.commandQueue.map((command) => command.type)).toEqual([
      'loca:layer:render',
      'loca:layer:style:patch',
      'loca:layer:feature-style',
      'loca:layer:fit-view'
    ])
    expect(locaStore.commandQueue[0].payload.defaultProperties).toEqual({
      source: 'unit',
      category: 'branch'
    })

    locaActions.setLayerInfo('loca-branches', {
      featureIndex: {
        'point-1': { name: '测试点' }
      }
    })
    expect(locaActions.getFeatureInfo('loca-branches', 'point-1').name).toBe('测试点')
    locaActions.clearLayerInfo()
    expect(locaActions.getLayerList()).toEqual([])
  })

  test('createLocaLayer 渲染、过滤、patch、高亮和 fitView', () => {
    const Loca = createFakeLoca()
    const container = new Loca.Container({ map: createFakeMap() })
    const map = createFakeMap()
    const layer = createLocaLayer('loca-layer', {
      Loca,
      AMap: createFakeAMap(),
      map,
      container,
      type: 'point'
    })

    layer.setData({
      type: 'FeatureCollection',
      features: [
        pointFeature,
        {
          ...pointFeature,
          id: 'point-2',
          properties: {
            ...pointFeature.properties,
            id: 'point-2',
            category: 'hidden'
          },
          geometry: {
            type: 'Point',
            coordinates: [121.8, 31.4]
          }
        }
      ]
    }, {
      radius: 8,
      color: '#1677ff',
      layerOptions: {
        opacity: 0.8,
        zIndex: 10
      }
    })

    layer.show()
    layer.patchStyle({
      color: '#22c55e',
      layerOptions: {
        opacity: 0.5
      }
    })
    layer.setCategoryVisible('hidden', false)
    layer.setFeatureStyle('point-1', { color: '#f59e0b' })
    layer.fitView({ padding: [12, 24] })

    expect(FakeLocaLayer.instances[0].visible).toBe(true)
    expect(FakeLocaLayer.instances[0].opacity).toBe(0.5)
    expect(FakeGeoJSONSource.instances[0].bfData.features).toHaveLength(1)
    expect(layer.getInfo().visibleFeatureCount).toBe(1)
    expect(layer.getInfo().styledFeatureIds).toEqual(['point-1'])
    expect(map.boundsCalls[0].padding).toEqual([12, 24, 12, 24])

    expect(layer.clearFeatureStyle('point-1')).toBe(true)
    layer.destroy()
    expect(layer.getInfo().featureCount).toBe(0)
  })

  test('LocaController 处理命令并同步图层信息', () => {
    const actions = {
      setLayerInfo: jest.fn(),
      removeLayerInfo: jest.fn(),
      clearLayerInfo: jest.fn()
    }
    const controller = new LocaController({
      Loca: createFakeLoca(),
      AMap: createFakeAMap(),
      map: createFakeMap(),
      actions
    })

    controller.handleCommand({
      type: 'loca:layer:render',
      payload: {
        layerId: 'controller-layer',
        type: 'heatmap',
        visible: true,
        geoJSON: {
          type: 'FeatureCollection',
          features: [pointFeature]
        },
        style: {
          radius: 20,
          layerOptions: {
            opacity: 0.6
          }
        }
      }
    })
    controller.handleCommand({
      type: 'loca:layer:style:patch',
      payload: {
        layerId: 'controller-layer',
        stylePatch: {
          layerOptions: {
            opacity: 0.3
          }
        }
      }
    })
    controller.handleCommand({
      type: 'loca:layer:clear',
      payload: {
        layerId: 'controller-layer'
      }
    })

    expect(actions.setLayerInfo).toHaveBeenCalled()
    expect(actions.removeLayerInfo).toHaveBeenCalledWith('controller-layer')

    controller.destroy()
    expect(actions.clearLayerInfo).toHaveBeenCalled()
  })

  test('LocaController 已有图层命令覆盖显隐、过滤、样式和清理', () => {
    const actions = {
      setLayerInfo: jest.fn(),
      removeLayerInfo: jest.fn(),
      clearLayerInfo: jest.fn()
    }
    const controller = new LocaController({
      Loca: createFakeLoca(),
      AMap: createFakeAMap(),
      map: createFakeMap(),
      actions
    })
    const layer = new FakeControllerLayer({ type: 'point' })

    layer.getType = () => 'point'
    controller.layers.set('loca-existing', layer)

    controller.handleCommand({
      type: 'loca:layer:visible',
      payload: {
        layerId: 'loca-existing',
        visible: false
      }
    })
    controller.handleCommand({
      type: 'loca:layer:category-visible',
      payload: {
        layerId: 'loca-existing',
        category: 'branch',
        visible: false
      }
    })
    controller.handleCommand({
      type: 'loca:layer:features-visible',
      payload: {
        layerId: 'loca-existing',
        featureIds: ['point-1'],
        visible: false
      }
    })
    controller.handleCommand({
      type: 'loca:layer:style',
      payload: {
        layerId: 'loca-existing',
        style: {
          color: '#1677ff'
        }
      }
    })
    controller.handleCommand({
      type: 'loca:layer:feature-style',
      payload: {
        layerId: 'loca-existing',
        featureId: 'point-1',
        style: {
          color: '#f59e0b'
        }
      }
    })
    controller.handleCommand({
      type: 'loca:layer:feature-style:clear',
      payload: {
        layerId: 'loca-existing',
        featureId: 'point-1'
      }
    })
    controller.handleCommand({
      type: 'loca:layer:feature-styles:clear',
      payload: {
        layerId: 'loca-existing'
      }
    })
    controller.handleCommand({
      type: 'loca:layer:fit-view',
      payload: {
        layerId: 'loca-existing',
        options: {
          padding: [16, 24]
        }
      }
    })
    controller.handleCommand({
      type: 'loca:layers:clear'
    })

    expect(layer.visible).toBe(false)
    expect(layer.categoryVisibility).toEqual({
      category: 'branch',
      visible: false
    })
    expect(layer.featuresVisibility.featureIds).toEqual(['point-1'])
    expect(layer.style.color).toBe('#1677ff')
    expect(layer.featureStyle.featureId).toBe('point-1')
    expect(layer.clearedFeatureId).toBe('point-1')
    expect(layer.clearedFeatureStyles).toBe(true)
    expect(layer.fitOptions.padding).toEqual([16, 24])
    expect(layer.destroyed).toBe(true)
    expect(actions.removeLayerInfo).toHaveBeenCalledWith('loca-existing')
  })
})

describe('普通 GeoJSON 图层覆盖', () => {
  test('createLayer 渲染多类型覆盖物并处理事件、样式和视野', () => {
    const map = createFakeMap()
    const clicks = []
    const hovers = []
    const layer = createLayer('mixed-layer', {
      AMap: createFakeAMap(),
      map
    })

    layer.setData({
      type: 'FeatureCollection',
      features: [
        {
          ...pointFeature,
          properties: {
            ...pointFeature.properties,
            category: 'branch',
            shortName: '点'
          }
        },
        {
          type: 'Feature',
          id: 'circle-1',
          properties: {
            id: 'circle-1',
            category: 'circle',
            radius: 600
          },
          geometry: {
            type: 'Point',
            coordinates: [121.6, 31.25]
          }
        },
        {
          type: 'Feature',
          id: 'line-1',
          properties: {
            id: 'line-1',
            category: 'route'
          },
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [[121.5, 31.2], [121.7, 31.3]]
            ]
          }
        },
        {
          type: 'Feature',
          id: 'polygon-1',
          properties: {
            id: 'polygon-1',
            category: 'area'
          },
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [[[121.5, 31.2], [121.7, 31.2], [121.7, 31.35], [121.5, 31.2]]]
            ]
          }
        }
      ]
    }, {
      point: {
        renderer: 'image',
        image: {
          src: '/marker.png',
          size: [24, 30],
          imageSize: [24, 30],
          offset: [1, 2]
        },
        label: {
          visible: true,
          field: 'name',
          direction: 'top',
          offset: [0, -28]
        }
      },
      line: {
        strokeColor: '#2563eb',
        strokeWeight: 4
      },
      polygon: {
        fillColor: '#B6002A',
        fillOpacity: 0.2
      },
      categories: {
        circle: {
          point: {
            renderer: 'circle',
            radius: 600,
            fillColor: '#22c55e'
          }
        }
      }
    }, {
      hoverStyle: {
        point: {
          renderer: 'html',
          size: [40, 40],
          html: '<span>hover</span>'
        }
      },
      clickStyle: {
        point: {
          renderer: 'pin',
          color: '#f59e0b'
        }
      },
      events: {
        click(feature, event) {
          clicks.push({ feature, event })
        },
        hover(feature, event) {
          hovers.push({ feature, event })
        }
      }
    })

    layer.show()

    expect(map.added).toHaveLength(4)
    expect(layer.getInfo().geometryKinds).toEqual(['point', 'line', 'polygon'])
    expect(FakeMapOverlay.instances[0].icon.options.image).toBe('http://localhost/marker.png')
    expect(FakeMapOverlay.instances[0].label.content).toBe('测试点')
    expect(FakeMapOverlay.instances[1].radius).toBe(600)

    FakeMapOverlay.instances[0].handlers.mouseover({
      lnglat: new FakeLngLat(121.5, 31.2),
      pixel: new FakePixel(5, 6)
    })
    FakeMapOverlay.instances[0].handlers.click({
      lnglat: [121.5, 31.2],
      pixel: [7, 8]
    })
    FakeMapOverlay.instances[0].handlers.mouseout({})

    expect(hovers[0].event.lnglat).toEqual([121.5, 31.2])
    expect(hovers[0].event.pixel).toEqual([5, 6])
    expect(clicks[0].event.featureId).toBe('point-1')
    expect(layer.getInfo().clickedFeatureId).toBe('point-1')

    layer.setCategoryVisible('route', false)
    expect(FakeMapOverlay.instances[2].visible).toBe(false)

    layer.setFeaturesVisible('circle-1', false)
    expect(FakeMapOverlay.instances[1].visible).toBe(false)

    expect(layer.setFeatureStyle('point-1', {
      point: {
        renderer: 'html',
        html: '<b>A</b>'
      }
    })).toBe(true)
    expect(layer.clearFeatureStyle('point-1')).toBe(true)

    layer.fitView({
      padding: [12, 24],
      maxZoom: 16
    })
    expect(map.fitViewCalls[0].padding).toEqual([12, 24, 12, 24])
    expect(map.fitViewCalls[0].maxZoom).toBe(16)

    layer.focus('point-1')
    expect(map.zoomCalls[0].position).toEqual([121.5, 31.2])

    layer.destroy()
    expect(layer.getInfo().featureCount).toBe(0)
  })

  test('createLayer 支持热力图过滤和按 feature 回退聚焦', () => {
    class FakeHeatMap {
      constructor(mapInstance, options) {
        this.map = mapInstance
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

      setMap(mapInstance) {
        this.map = mapInstance
      }
    }
    FakeHeatMap.instances = []
    FakeHeatMap.prototype.setDataSet = FakeHeatMap.prototype.setDataSet

    const AMap = {
      ...createFakeAMap(),
      HeatMap: FakeHeatMap
    }
    const map = createFakeMap()
    const layer = createLayer('heat-layer', {
      AMap,
      map
    })

    layer.setData({
      type: 'FeatureCollection',
      features: [
        pointFeature,
        {
          ...pointFeature,
          id: 'hidden-point',
          properties: {
            ...pointFeature.properties,
            id: 'hidden-point',
            category: 'hidden',
            value: 30
          },
          geometry: {
            type: 'Point',
            coordinates: [121.9, 31.4]
          }
        }
      ]
    }, {
      renderer: 'heatmap',
      heatmap: {
        valueField: 'value',
        max: 50
      }
    })
    layer.show()

    expect(FakeHeatMap.instances).toHaveLength(1)
    expect(FakeHeatMap.instances[0].dataset.data).toHaveLength(2)
    expect(FakeHeatMap.instances[0].dataset.max).toBe(50)

    layer.setCategoryVisible('hidden', false)
    expect(FakeHeatMap.instances[0].dataset.data).toHaveLength(1)

    layer.fitView({ padding: [10, 20, 30, 40] })
    expect(map.boundsCalls[0].padding).toEqual([10, 20, 30, 40])

    layer.focus('hidden-point')
    expect(map.zoomCalls[0].position).toEqual([121.9, 31.4])

    layer.hide()
    expect(FakeHeatMap.instances[0].visible).toBe(false)
  })
})

describe('MapController 命令分发', () => {
  test('处理已注册图层的样式、过滤、聚焦和清理命令', () => {
    const actions = {
      setLayerInfo: jest.fn(),
      removeLayerInfo: jest.fn(),
      setActiveTool: jest.fn()
    }
    const map = {
      zoomCalls: [],
      setZoomAndCenter(zoom, position, immediately) {
        this.zoomCalls.push({ zoom, position, immediately })
      }
    }
    const controller = new MapController({
      AMap: {},
      map,
      actions
    })
    const keepLayer = new FakeControllerLayer()
    const removeLayer = new FakeControllerLayer()
    const prefixLayer = new FakeControllerLayer()

    controller.layers.set('keep-layer', keepLayer)
    controller.layers.set('remove-layer', removeLayer)
    controller.layers.set('prefix-a', prefixLayer)

    controller.handleCommand({
      type: 'layer:visible',
      payload: {
        layerId: 'keep-layer',
        visible: true
      }
    })
    controller.handleCommand({
      type: 'layer:style:patch',
      payload: {
        layerId: 'keep-layer',
        stylePatch: {
          point: {
            color: '#B6002A'
          }
        }
      }
    })
    controller.handleCommand({
      type: 'layer:category-visible',
      payload: {
        layerId: 'keep-layer',
        category: 'bank',
        visible: false
      }
    })
    controller.handleCommand({
      type: 'layer:features-visible',
      payload: {
        layerId: 'keep-layer',
        featureIds: ['a', 'b'],
        visible: false
      }
    })
    controller.handleCommand({
      type: 'layer:feature-style',
      payload: {
        layerId: 'keep-layer',
        featureId: 'a',
        style: {
          point: {
            color: '#f59e0b'
          }
        }
      }
    })
    controller.handleCommand({
      type: 'layer:feature-style:clear',
      payload: {
        layerId: 'keep-layer',
        featureId: 'a'
      }
    })
    controller.handleCommand({
      type: 'layer:feature-styles:clear',
      payload: {
        layerId: 'keep-layer'
      }
    })
    controller.handleCommand({
      type: 'layer:fit-view',
      payload: {
        layerId: 'keep-layer',
        options: {
          padding: [10, 20]
        }
      }
    })
    controller.handleCommand({
      type: 'layer:focus',
      payload: {
        type: 'keep-layer',
        id: 'a'
      }
    })
    controller.handleCommand({
      type: 'map:center-by-coordinate',
      payload: {
        keyword: '121.5,31.2'
      }
    })
    controller.handleCommand({
      type: 'layers:clear-by-prefix',
      payload: {
        prefix: 'prefix-'
      }
    })
    controller.handleCommand({
      type: 'layers:clear-except',
      payload: {
        layerIds: ['keep-layer']
      }
    })

    expect(keepLayer.visible).toBe(true)
    expect(keepLayer.stylePatch.point.color).toBe('#B6002A')
    expect(keepLayer.categoryVisibility).toEqual({
      category: 'bank',
      visible: false
    })
    expect(keepLayer.featuresVisibility.featureIds).toEqual(['a', 'b'])
    expect(keepLayer.featureStyle.featureId).toBe('a')
    expect(keepLayer.clearedFeatureId).toBe('a')
    expect(keepLayer.clearedFeatureStyles).toBe(true)
    expect(keepLayer.fitOptions.padding).toEqual([10, 20])
    expect(keepLayer.focusedFeatureId).toBe('a')
    expect(map.zoomCalls[0]).toEqual({
      zoom: 14,
      position: [121.5, 31.2],
      immediately: true
    })
    expect(prefixLayer.destroyed).toBe(true)
    expect(removeLayer.destroyed).toBe(true)
    expect(actions.removeLayerInfo).toHaveBeenCalledWith('prefix-a')
    expect(actions.removeLayerInfo).toHaveBeenCalledWith('remove-layer')
    expect(controller.layers.has('keep-layer')).toBe(true)
  })

  test('处理自定义标记的渲染、更新、保存和删除', () => {
    const actions = {
      setActiveTool: jest.fn(),
      setCustomMarkerResult: jest.fn(),
      clearCustomMarkerResult: jest.fn(),
      setCustomMarkerAction: jest.fn(),
      setCustomMarkerSaveRequest: jest.fn(),
      removeLayerInfo: jest.fn(),
      setLayerInfo: jest.fn()
    }
    const map = createFakeMap()
    const controller = new MapController({
      AMap: createFakeAMap(),
      map,
      actions
    })

    controller.handleCommand({
      type: 'marker:render',
      payload: {
        markers: [
          {
            id: 'marker-1',
            name: '原始标记',
            position: [121.5, 31.2],
            createdAt: 1,
            updatedAt: 1
          },
          {
            id: 'bad-marker',
            name: '无效标记',
            position: []
          }
        ]
      }
    })

    expect(controller.customMarkerRecords.size).toBe(1)
    expect(actions.setCustomMarkerAction.mock.calls[0][0].type).toBe('render')
    expect(map.added).toHaveLength(1)

    controller.handleCommand({
      type: 'marker:update-name',
      payload: {
        id: 'marker-1',
        name: '更新标记'
      }
    })
    const record = controller.customMarkerRecords.get('marker-1')
    expect(record.name).toBe('更新标记')
    expect(record.marker.label.content).toBe('更新标记')
    expect(actions.setCustomMarkerResult).toHaveBeenCalled()

    controller.handleCommand({
      type: 'marker:save',
      payload: {
        id: 'marker-1'
      }
    })
    expect(actions.setCustomMarkerSaveRequest.mock.calls[0][0].id).toBe('marker-1')

    record.handlers = record.marker.handlers
    record.marker.handlers.rightclick({
      lnglat: [121.5, 31.2],
      originEvent: {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      }
    })
    expect(controller.activeCustomMarkerId).toBe('marker-1')

    controller.handleCommand({
      type: 'marker:delete',
      payload: {
        id: 'marker-1'
      }
    })
    expect(controller.customMarkerRecords.size).toBe(0)
    expect(actions.clearCustomMarkerResult).toHaveBeenCalled()
    expect(actions.setCustomMarkerAction.mock.calls.at(-1)[0].type).toBe('delete')
  })

  test('处理绘图覆盖物的注册、编辑、删除和缩略图结果', () => {
    const actions = {
      setActiveTool: jest.fn(),
      setDrawResult: jest.fn(),
      clearDrawResult: jest.fn(),
      setDrawOverlayInfo: jest.fn(),
      setDrawOverlayAction: jest.fn(),
      removeLayerInfo: jest.fn(),
      setLayerInfo: jest.fn()
    }
    const map = {
      ...createFakeMap(),
      getContainer() {
        return {
          querySelector() {
            return {
              toDataURL() {
                return 'data:image/png;base64,unit'
              }
            }
          }
        }
      }
    }
    const controller = new MapController({
      AMap: createFakeAMap(),
      map,
      actions
    })
    const overlay = new FakeMapOverlay({
      path: [
        new FakeLngLat(121.5, 31.2),
        new FakeLngLat(121.7, 31.2),
        new FakeLngLat(121.7, 31.4)
      ]
    })

    controller.mouseTool = {
      overlays: {
        polygon: [overlay]
      },
      close: jest.fn()
    }
    const record = controller.registerDrawOverlay('polygon', overlay)

    expect(record.id).toContain('draw-')
    expect(controller.mouseTool.overlays.polygon).toEqual([])
    expect(actions.setDrawOverlayInfo).not.toHaveBeenCalled()

    controller.updateDrawOverlayInfo(record)
    expect(actions.setDrawOverlayInfo.mock.calls[0][0].shape).toBe('polygon')

    controller.startEditDrawOverlay({
      id: record.id
    })
    expect(FakeDrawEditor.instances[0].opened).toBe(true)
    expect(record.editing).toBe(true)

    FakeDrawEditor.instances[0].handlers.change()
    expect(actions.setDrawResult.mock.calls.at(-1)[0].geoJSON.geometry.type).toBe('Polygon')

    controller.stopEditDrawOverlay({
      keepActiveTool: true,
      skipResultUpdate: true
    })
    expect(FakeDrawEditor.instances[0].closed).toBe(true)
    expect(record.editing).toBe(false)

    controller.deleteDrawOverlay({
      id: record.id
    })
    expect(controller.drawOverlays.size).toBe(0)
    expect(actions.clearDrawResult).toHaveBeenCalled()
    expect(actions.setDrawOverlayAction.mock.calls.at(-1)[0].type).toBe('delete')
    expect(controller.captureThumbnail().thumbnail).toBe('data:image/png;base64,unit')
  })
})

describe('业务地图渲染封装', () => {
  test('mapActions 覆盖绘图、标记、批量清理和视口命令', () => {
    mapActions.activateRuler()
    mapActions.restartRuler()
    mapActions.clearRuler()
    mapActions.activateDraw('rectangle')
    mapActions.startEditDrawOverlay('draw-1')
    mapActions.stopEditDrawOverlay()
    mapActions.deleteDrawOverlay('draw-1')
    mapActions.clearDrawOverlay()
    mapActions.activateCoordinatePicker()
    mapActions.activateCustomMarker()
    mapActions.updateCustomMarkerName('marker-1', '新名称')
    mapActions.saveCustomMarker('marker-1')
    mapActions.deleteCustomMarker('marker-1')
    mapActions.renderCustomMarkers([{ id: 'marker-1', position: [121, 31] }])
    mapActions.zoomIn()
    mapActions.zoomOut()
    mapActions.searchCoordinate('121.5,31.2')
    mapActions.clearAllLayers()
    mapActions.clearLayerByPrefix('tmp-')
    mapActions.clearLayersExcept(['base', null, ''])
    mapActions.setViewport({
      zoom: 13,
      center: [121.5, 31.2]
    })

    expect(mapStore.activeTool).toBe('custom-marker')
    expect(mapStore.viewport.zoom).toBe(13)
    expect(mapStore.commandQueue.map((command) => command.type)).toEqual([
      'ruler:start',
      'ruler:restart',
      'ruler:clear',
      'draw:start',
      'draw:overlay:edit-start',
      'draw:overlay:edit-stop',
      'draw:overlay:delete',
      'draw:overlay:clear',
      'coordinate-picker:start',
      'marker:start',
      'marker:update-name',
      'marker:save',
      'marker:delete',
      'marker:render',
      'zoom:in',
      'zoom:out',
      'map:center-by-coordinate',
      'layers:clear',
      'layers:clear-by-prefix',
      'layers:clear-except'
    ])
    expect(mapStore.commandQueue[19].payload.layerIds).toEqual(['base'])

    mapActions.setDrawResult({ id: 'draw-1' })
    mapActions.setDrawOverlayInfo({ count: 1 })
    mapActions.setDrawOverlayAction({ type: 'create' })
    mapActions.setCoordinatePickResult({ coordinate: '121,31' })
    mapActions.setCustomMarkerResult({ id: 'marker-1' })
    mapActions.setCustomMarkerAction({ type: 'create' })
    mapActions.setCustomMarkerSaveRequest({ id: 'marker-1' })

    expect(mapStore.drawResult.id).toBe('draw-1')
    expect(mapStore.drawOverlayInfo.count).toBe(1)
    expect(mapStore.customMarkerSaveRequest.id).toBe('marker-1')

    mapActions.clearDrawResult()
    mapActions.clearDrawOverlayInfo()
    mapActions.clearDrawOverlayAction()
    mapActions.clearCoordinatePickResult()
    mapActions.clearCustomMarkerResult()
    mapActions.clearCustomMarkerAction()
    mapActions.clearCustomMarkerSaveRequest()

    expect(mapStore.drawResult).toBe(null)
    expect(mapStore.drawOverlayInfo).toBe(null)
    expect(mapStore.customMarkerSaveRequest).toBe(null)
  })

  test('银行点位和半径封装会生成图层渲染命令', () => {
    const records = [
      {
        id: 1,
        level3Classification: '中国银行',
        geom: {
          type: 'Point',
          coordinates: [121.5, 31.2]
        }
      },
      {
        id: 2,
        level3Classification: '其他银行',
        pointX: 121.6,
        pointY: 31.3
      }
    ]

    expect(createBankPointGeoJSON(records).features).toHaveLength(2)
    expect(createBankRadiusGeoJSON(records, { radius: 500 }).features).toHaveLength(1)

    const result = renderBankPointsWithChinaBankRadius(records, {
      fitView: false,
      radius: 500
    })

    expect(result.pointLayerId).toBe(BANK_POINT_LAYER_ID)
    expect(result.radiusLayerId).toBe(BANK_RADIUS_LAYER_ID)
    expect(mapStore.commandQueue.map((command) => command.type)).toEqual([
      'layer:clear',
      'layer:clear',
      'layer:render',
      'layer:render'
    ])
    expect(mapStore.commandQueue[2].payload.layerId).toBe(BANK_RADIUS_LAYER_ID)
    expect(mapStore.commandQueue[3].payload.layerId).toBe(BANK_POINT_LAYER_ID)
  })

  test('POI 聚合和区县统计按 zoom 切换图层', () => {
    const records = [
      {
        id: 1,
        codeCoun: '310101',
        nameCoun: '黄浦区',
        districtName: '黄浦区',
        showTag: '便利店',
        geom: {
          type: 'Point',
          coordinates: [121.49, 31.23]
        }
      },
      {
        id: 2,
        codeCoun: '310101',
        nameCoun: '黄浦区',
        showTag: '便利店',
        pointX: 121.5,
        pointY: 31.24
      }
    ]

    const districtGeoJSON = createDistrictCountGeoJSONFromPoiRecords(records)
    expect(districtGeoJSON.features[0].properties.num).toBe(2)

    const districtResult = renderPoiClusterOrDistrictCount(records, {
      zoom: 10,
      switchZoom: 11
    })
    expect(districtResult.mode).toBe('district-count')
    expect(mapStore.commandQueue[0].payload.layerId).toBe(BUSINESS_POI_CLUSTER_LAYER_ID)
    expect(mapStore.commandQueue[1].payload.layerId).toBe(DISTRICT_COUNT_LAYER_ID)

    resetMapStore()

    const clusterResult = renderPoiClusterOrDistrictCount(records, {
      zoom: 13,
      switchZoom: 11
    })
    expect(clusterResult.mode).toBe('cluster')
    expect(mapStore.commandQueue[0].payload.layerId).toBe(DISTRICT_COUNT_LAYER_ID)
    expect(mapStore.commandQueue[1].payload.layerId).toBe(BUSINESS_POI_CLUSTER_LAYER_ID)
  })

  test('区县统计和 POI 聚合回调会转成业务参数', () => {
    const records = [
      {
        id: 1,
        codeCoun: '310101',
        nameCoun: '黄浦区',
        showTag: '便利店',
        geom: {
          type: 'Point',
          coordinates: [121.49, 31.23]
        },
        num: 'bad'
      },
      {
        id: 2,
        codeCoun: '310102',
        nameCoun: '徐汇区',
        level2Classification: '餐饮',
        pointX: 121.43,
        pointY: 31.18
      }
    ]
    const districtEvents = {
      click: jest.fn()
    }
    const districtClick = jest.fn()
    const clusterEvents = {
      click: jest.fn(),
      clusterClick: jest.fn()
    }
    const poiClick = jest.fn()
    const clusterClick = jest.fn()

    renderDistrictCountPoints(records, {
      layerId: 'district-test',
      fitView: true,
      events: districtEvents,
      onClick: districtClick
    })
    const districtRender = mapStore.commandQueue.find((command) => command.type === 'layer:render')
    const districtFeature = districtRender.payload.geoJSON.features[0]
    districtRender.payload.events.click(districtFeature, {
      properties: districtFeature.properties,
      featureId: districtFeature.id,
      lnglat: [121.49, 31.23]
    })

    expect(districtEvents.click).toHaveBeenCalled()
    expect(districtClick.mock.calls[0][0].districtName).toBe(districtFeature.properties.districtName)
    expect(mapStore.commandQueue.some((command) => command.type === 'layer:fit-view')).toBe(true)

    resetMapStore()

    renderPoiClusterLayer(records, {
      layerId: 'poi-test',
      fitView: true,
      events: clusterEvents,
      onClick: poiClick,
      onClusterClick: clusterClick,
      style: {
        point: {
          color: '#B6002A'
        }
      }
    })
    const clusterRender = mapStore.commandQueue.find((command) => command.type === 'cluster:render')
    const poiFeature = clusterRender.payload.geoJSON.features[0]
    clusterRender.payload.events.click(poiFeature, {
      properties: poiFeature.properties,
      featureId: poiFeature.id,
      lnglat: [121.49, 31.23]
    })
    clusterRender.payload.events.clusterClick({
      count: 2
    })

    expect(clusterEvents.click).toHaveBeenCalled()
    expect(poiClick.mock.calls[0][0].districtName).toBe('黄浦区')
    expect(clusterEvents.clusterClick).toHaveBeenCalledWith({ count: 2 })
    expect(clusterClick).toHaveBeenCalledWith({ count: 2 })
    expect(mapStore.commandQueue.some((command) => command.type === 'layer:fit-view')).toBe(true)
  })

  test('POI zoom renderer 会跳过重复模式并支持强制刷新和销毁', () => {
    const renderer = createPoiClusterDistrictZoomRenderer([
      {
        id: 1,
        codeCoun: '310101',
        nameCoun: '黄浦区',
        showTag: '便利店',
        geom: {
          type: 'Point',
          coordinates: [121.49, 31.23]
        }
      }
    ], {
      zoom: 10,
      switchZoom: 11,
      clusterLayerId: 'cluster-custom',
      districtLayerId: 'district-custom'
    })

    expect(renderer.renderByZoom(10).mode).toBe('district-count')
    expect(renderer.renderByZoom(10).skipped).toBe(true)
    expect(renderer.setRecords([], { zoom: 13 }).mode).toBe('cluster')
    expect(renderer.getMode()).toBe('cluster')

    renderer.destroy()

    const clearCommands = mapStore.commandQueue
      .filter((command) => command.type === 'layer:clear')
      .map((command) => command.payload.layerId)
    expect(clearCommands).toContain('cluster-custom')
    expect(clearCommands).toContain('district-custom')
    expect(renderer.getMode()).toBe('')
  })
})
