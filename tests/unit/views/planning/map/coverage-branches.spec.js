import HeatmapToolbar from '../../../../../src/components/HeatmapToolbar.vue'
import CustomerHeatmapToolbar from '../../../../../src/components/CustomerHeatmapToolbar.vue'
import { LocaController } from '../../../../../src/loca/loca-controller'
import { createLocaLayer } from '../../../../../src/loca/loca-layer-registry'
import { locaActions, locaStore } from '../../../../../src/loca/loca-store'
import { createClusterLayer } from '../../../../../src/map/cluster-layer-registry'
import { createLayer } from '../../../../../src/map/layer-registry'
import { MapController } from '../../../../../src/map/map-controller'
import { mapActions, mapStore } from '../../../../../src/map/map-store'
import { createVectorTileLayer } from '../../../../../src/map/vector-tile-layer-registry'
import { createWMSLayer } from '../../../../../src/map/wms-layer-registry'
import { buildWMTSTileUrl, createWMTSLayer } from '../../../../../src/map/wmts-layer-registry'

const pointFeature = {
  type: 'Feature',
  id: 'p1',
  properties: {
    id: 'p1',
    name: 'point',
    category: 'bank',
    value: 12
  },
  geometry: {
    type: 'Point',
    coordinates: [121.5, 31.2]
  }
}

class FakeLayer {
  constructor(type = 'geojson') {
    this.type = type
    this.visible = false
    this.destroyed = false
  }

  setData(...args) {
    this.dataArgs = args
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
    this.categoryVisible = { category, visible }
  }

  setFeaturesVisible(featureIds, visible) {
    this.featuresVisible = { featureIds, visible }
  }

  setFeatureStyle(featureId, style) {
    this.featureStyle = { featureId, style }
  }

  clearFeatureStyle(featureId) {
    this.clearedFeatureId = featureId
  }

  clearFeatureStyles() {
    this.clearedAllFeatureStyles = true
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

  getType() {
    return this.type
  }

  getInfo() {
    return {
      type: this.type,
      visible: this.visible,
      featureCount: 1
    }
  }
}

class FakeInfoWindow {
  constructor(options = {}) {
    this.options = options
    this.content = ''
    this.openCalls = []
    this.close = jest.fn()
    FakeInfoWindow.instances.push(this)
  }

  setContent(content) {
    this.content = content
  }

  open(map, lnglat) {
    this.openCalls.push({ map, lnglat })
  }
}
FakeInfoWindow.instances = []

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

  getSouthWest() {
    return this.southWest
  }

  getNorthEast() {
    return this.northEast
  }
}

class FakePixel {
  constructor(x, y) {
    this.x = x
    this.y = y
  }
}

class FakeLocaSource {
  constructor(options = {}) {
    this.options = options
    this.dataset = options.data
    FakeLocaSource.instances.push(this)
  }

  bf(data) {
    this.bfData = data
    return data
  }

  nf() {
    this.notified = true
  }
}
FakeLocaSource.instances = []

class FakeRuntimeLocaLayer {
  constructor(options = {}) {
    this.options = options
    this.visible = options.visible !== false
    FakeRuntimeLocaLayer.instances.push(this)
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
FakeRuntimeLocaLayer.instances = []

class FakeClusterMarker {
  constructor() {
    this.handlers = {}
  }

  setContent(content) {
    this.content = content
  }

  setOffset(offset) {
    this.offset = offset
  }

  setzIndex(zIndex) {
    this.zIndex = zIndex
  }

  setExtData(extData) {
    this.extData = extData
  }

  setTitle(title) {
    this.title = title
  }

  setLabel(label) {
    this.label = label
  }

  setExtData(extData) {
    this.extData = extData
  }

  on(type, handler) {
    this.handlers[type] = handler
  }
}

class FakeMarkerCluster {
  constructor(map, data, options = {}) {
    this.map = map
    this.data = data
    this.options = options
    this.handlers = {}
    this.pointMarker = new FakeClusterMarker()
    this.clusterMarker = new FakeClusterMarker()
    FakeMarkerCluster.instances.push(this)

    if (data[0]) {
      options.renderMarker({
        marker: this.pointMarker,
        data: data[0]
      })
    }
    options.renderClusterMarker({
      marker: this.clusterMarker,
      data,
      count: undefined
    })
  }

  setMap(map) {
    this.map = map
  }

  setData(data) {
    this.data = data
  }

  getClustersCount() {
    return 1
  }

  on(type, handler) {
    this.handlers[type] = handler
  }
}
FakeMarkerCluster.instances = []

class FakeAMapOverlay {
  constructor(options = {}) {
    this.options = options
    this.extData = options.extData
    this.position = options.position || options.center
    this.path = options.path
    this.visible = options.visible !== false
    this.handlers = {}
    FakeAMapOverlay.instances.push(this)
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

  setTitle(title) {
    this.title = title
  }

  setOffset(offset) {
    this.offset = offset
  }

  setRadius(radius) {
    this.radius = radius
  }

  setMap(map) {
    this.map = map
  }

  getExtData() {
    return this.extData
  }

  getPosition() {
    return this.position
  }

  getPath() {
    return this.path
  }

  on(type, handler) {
    this.handlers[type] = handler
  }

  off(type, handler) {
    if (!handler || this.handlers[type] === handler) {
      delete this.handlers[type]
    }
  }

  getBounds() {
    return new FakeBounds(new FakeLngLat(121.5, 31.2), new FakeLngLat(121.7, 31.4))
  }
}
FakeAMapOverlay.instances = []

class FakeMouseTool {
  constructor() {
    this.handlers = {}
    this.overlays = {}
    FakeMouseTool.instances.push(this)
  }

  on(type, handler) {
    this.handlers[type] = handler
  }

  off(type, handler) {
    if (!handler || this.handlers[type] === handler) {
      delete this.handlers[type]
    }
  }

  rectangle(options) {
    this.rectangleOptions = options
  }

  circle(options) {
    this.circleOptions = options
  }

  polygon(options) {
    this.polygonOptions = options
  }

  close(ifClear) {
    this.closedWith = ifClear
  }
}
FakeMouseTool.instances = []

class FakeRangingTool {
  constructor(map, options = {}) {
    this.map = map
    this.options = options
    FakeRangingTool.instances.push(this)
  }

  turnOn() {
    this.on = true
  }

  turnOff(ifClear) {
    this.offWith = ifClear
  }
}
FakeRangingTool.instances = []

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

class FakeIcon {
  constructor(options = {}) {
    this.options = options
  }
}

class FakeSize {
  constructor(width, height) {
    this.width = width
    this.height = height
  }
}

class FakeVectorTileRuntimeLayer {
  constructor(options = {}) {
    this.options = options
    this.handlers = {}
    this.offCalls = []
    FakeVectorTileRuntimeLayer.instances.push(this)
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
    this.handlers[type] = handler
    this.eventOption = option
  }

  off(type, handler) {
    this.offCalls.push({ type, handler })
    delete this.handlers[type]
  }

  show() {
    this.visible = true
  }

  hide() {
    this.visible = false
  }

  reload() {
    this.reloaded = true
  }

  filterByRect(rect, type) {
    return [{ rect, type }]
  }

  setMap(map) {
    this.map = map
  }

  destroy() {
    this.destroyed = true
  }
}
FakeVectorTileRuntimeLayer.instances = []

class FakeWMSRuntimeLayer {
  constructor(options = {}) {
    this.options = options
    FakeWMSRuntimeLayer.instances.push(this)
  }

  setUrl(url) {
    this.url = url
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

  setMap(map) {
    this.map = map
  }

  destroy() {
    this.destroyed = true
  }
}
FakeWMSRuntimeLayer.instances = []

class FakeTileRuntimeLayer {
  constructor(options = {}) {
    this.options = options
    FakeTileRuntimeLayer.instances.push(this)
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

  setMap(map) {
    this.map = map
  }

  destroy() {
    this.destroyed = true
  }
}
FakeTileRuntimeLayer.instances = []

function resetMapState() {
  mapActions.clearHandledCommands(Number.POSITIVE_INFINITY)
  mapActions.clearLayerInfo()
  mapActions.clearDrawResult()
  mapActions.clearDrawOverlayInfo()
  mapActions.clearDrawOverlayAction()
  mapActions.clearCoordinatePickResult()
  mapActions.clearCustomMarkerResult()
  mapActions.clearCustomMarkerSaveRequest()
  mapActions.clearCustomMarkerAction()
  mapActions.setActiveTool('')
}

function resetLocaState() {
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

function createMapController(actions = {}) {
  return new MapController({
    AMap: {},
    map: {
      zoomCalls: [],
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      setZoomAndCenter(zoom, position, immediately) {
        this.zoomCalls.push({ zoom, position, immediately })
      },
      destroy: jest.fn()
    },
    actions: {
      setLayerInfo: jest.fn(),
      removeLayerInfo: jest.fn(),
      setActiveTool: jest.fn(),
      ...actions
    }
  })
}

function createLocaController(actions = {}, LocaOverride) {
  const containers = []
  const Container = LocaOverride || class {
    constructor(options) {
      this.options = options
      containers.push(this)
    }

    destroy() {
      this.destroyed = true
    }
  }

  const controller = new LocaController({
    Loca: { Container },
    AMap: {},
    map: {},
    actions: {
      setLayerInfo: jest.fn(),
      removeLayerInfo: jest.fn(),
      clearLayerInfo: jest.fn(),
      ...actions
    }
  })

  controller.createdContainers = containers
  return controller
}

function latestFakeMarkerCluster() {
  return FakeMarkerCluster.instances[FakeMarkerCluster.instances.length - 1]
}

function latestFakeOverlayById(id) {
  const matches = FakeAMapOverlay.instances.filter((overlay) => overlay.extData && overlay.extData.id === id)
  return matches[matches.length - 1]
}

beforeEach(() => {
  resetMapState()
  resetLocaState()
  FakeLocaSource.instances = []
  FakeRuntimeLocaLayer.instances = []
  FakeMarkerCluster.instances = []
  FakeAMapOverlay.instances = []
  FakeVectorTileRuntimeLayer.instances = []
  FakeWMSRuntimeLayer.instances = []
  FakeTileRuntimeLayer.instances = []
  FakeMouseTool.instances = []
  FakeRangingTool.instances = []
  FakeDrawEditor.instances = []
})

describe('mapActions branch coverage', () => {
  test('ignores invalid layer identifiers and keeps command queue stable', () => {
    const before = mapStore.commandQueue.length

    mapActions.setLayerInfo('', { name: 'ignored' })
    mapActions.removeLayerInfo('')
    mapActions.setLayerStyle('', { point: { color: '#B6002A' } })
    mapActions.patchLayerStyle('', { point: { color: '#B6002A' } })
    mapActions.setFeaturesVisible('', ['p1'], false)
    mapActions.clearLayer('')
    mapActions.clearLayerByPrefix('')
    mapActions.clearLayersExcept([null, ''])
    mapActions.setFeatureStyle('', 'p1', {})
    mapActions.setFeatureStyle('layer', null, {})
    mapActions.clearFeatureStyle('', 'p1')
    mapActions.clearFeatureStyle('layer', null)
    mapActions.clearLayerFeatureStyles('')
    mapActions.focusFeature('', 'p1')
    mapActions.focusFeature('layer', null)
    mapActions.fitLayerView('')
    mapActions.renderGeoJSONLayer({}, { type: 'FeatureCollection', features: [] })
    mapActions.renderGeoJSONClusterLayer({}, { type: 'FeatureCollection', features: [] })
    mapActions.renderWMSLayer({})
    mapActions.renderVectorTileLayer({})

    expect(mapStore.commandQueue).toHaveLength(before)
    expect(mapActions.getLayerInfo('missing')).toBeNull()
    expect(mapActions.getFeatureInfo('missing', 'p1')).toBeNull()
  })

  test('dispatches render commands with string params, defaults and selection', () => {
    const geoJSON = {
      type: 'FeatureCollection',
      style: { point: { color: '#1677ff' } },
      properties: {
        style: { point: { color: '#B6002A' } }
      },
      features: [pointFeature]
    }

    mapActions.setLayerInfo('layer-a', {
      featureIndex: {
        p1: { id: 'p1', name: 'point' }
      }
    })
    expect(mapActions.getFeatureInfo('layer-a', 'p1')).toEqual({ id: 'p1', name: 'point' })
    expect(mapActions.getFeatureInfo('layer-a', null)).toBeNull()

    mapActions.renderGeoJSONLayer({
      layerId: 'layer-a',
      category: 'bank',
      properties: { source: 'unit' },
      selection: { type: 'layer-a', id: 'p1' }
    }, geoJSON)
    mapActions.renderGeoJSONClusterLayer('cluster-a', geoJSON)
    mapActions.renderWMSLayer('wms-a')
    mapActions.renderVectorTileLayer('vt-a')
    mapActions.renderWMTSLayer({
      layerId: 'wmts-a',
      url: '/wmts/{z}/{x}/{y}.png'
    })

    expect(mapStore.commandQueue.map((command) => command.type)).toEqual([
      'layer:render',
      'layer:focus',
      'cluster:render',
      'wms:render',
      'vector-tile:render',
      'wmts:render'
    ])
    expect(mapStore.commandQueue[0].payload.defaultProperties).toEqual({
      source: 'unit',
      category: 'bank'
    })
    expect(mapStore.commandQueue[0].payload.style).toEqual(geoJSON.style)
    expect(mapStore.commandQueue[2].payload.style).toEqual({})
    expect(() => mapActions.renderWMTSLayer({ layerId: 'bad' })).toThrow('url')
  })

  test('dispatches tool and result commands with expected state changes', () => {
    mapActions.activateRuler()
    mapActions.restartRuler()
    mapActions.clearRuler()
    mapActions.activateDraw('polygon')
    mapActions.startEditDrawOverlay('draw-1')
    mapActions.stopEditDrawOverlay()
    mapActions.deleteDrawOverlay('draw-1')
    mapActions.activateCoordinatePicker()
    mapActions.activateCustomMarker()
    mapActions.updateCustomMarkerName('custom-1', 'name')
    mapActions.deleteCustomMarker('custom-1')
    mapActions.saveCustomMarker('custom-1')
    mapActions.renderCustomMarkers([{ id: 'custom-1' }])
    mapActions.zoomIn()
    mapActions.zoomOut()
    mapActions.searchCoordinate('121.5,31.2')
    mapActions.setLayerVisible('layer-a', false)
    mapActions.setLayerCategoryVisible('layer-a', 'bank', false)
    mapActions.clearAllLayers()
    mapActions.clearLayersExcept('layer-a')
    mapActions.highlightFeature('layer-a', 'p1')
    mapActions.setViewport({ zoom: 12 })

    expect(mapStore.viewport.zoom).toBe(12)
    expect(mapStore.commandQueue.map((command) => command.type)).toContain('marker:render')
    expect(mapStore.commandQueue.map((command) => command.type)).toContain('layers:clear-except')
    expect(mapStore.commandQueue.find((command) => command.type === 'layer:feature-style').payload.style.point.color).toBe('#D21F3E')
  })
})

describe('locaActions branch coverage', () => {
  test('ignores invalid ids and dispatches all supported loca commands', () => {
    locaActions.setLayerInfo('', { name: 'ignored' })
    locaActions.removeLayerInfo('')
    locaActions.renderGeoJSONLayer({}, null)
    locaActions.setLayerVisible('', true)
    locaActions.setLayerCategoryVisible('', 'bank', true)
    locaActions.setLayerCategoryVisible('loca-a', null, true)
    locaActions.setFeaturesVisible('', ['p1'], false)
    locaActions.setLayerStyle('', {})
    locaActions.patchLayerStyle('', {})
    locaActions.setFeatureStyle('', 'p1', {})
    locaActions.setFeatureStyle('loca-a', null, {})
    locaActions.clearFeatureStyle('', 'p1')
    locaActions.clearFeatureStyle('loca-a', null)
    locaActions.clearLayerFeatureStyles('')
    locaActions.fitLayerView('')
    locaActions.clearLayer('')

    expect(locaStore.commandQueue).toEqual([])

    const geoJSON = {
      type: 'FeatureCollection',
      properties: {
        style: { color: '#B6002A' }
      },
      features: [pointFeature]
    }
    locaActions.renderGeoJSONLayer({
      layerId: 'loca-a',
      visualType: 'heatmap',
      category: 'bank',
      properties: { source: 'unit' }
    }, geoJSON)
    locaActions.setLayerVisible('loca-a', false)
    locaActions.setLayerCategoryVisible('loca-a', 'bank', false)
    locaActions.setFeaturesVisible('loca-a', ['p1'], false)
    locaActions.setLayerStyle('loca-a', { color: '#1677ff' })
    locaActions.patchLayerStyle('loca-a', { color: '#B6002A' })
    locaActions.highlightFeature('loca-a', 'p1')
    locaActions.clearFeatureStyle('loca-a', 'p1')
    locaActions.clearLayerFeatureStyles('loca-a')
    locaActions.fitLayerView('loca-a', { padding: [10, 20] })
    locaActions.clearLayer('loca-a')
    locaActions.clearAllLayers()

    expect(locaStore.commandQueue.map((command) => command.type)).toEqual([
      'loca:layer:render',
      'loca:layer:visible',
      'loca:layer:category-visible',
      'loca:layer:features-visible',
      'loca:layer:style',
      'loca:layer:style:patch',
      'loca:layer:feature-style',
      'loca:layer:feature-style:clear',
      'loca:layer:feature-styles:clear',
      'loca:layer:fit-view',
      'loca:layer:clear',
      'loca:layers:clear'
    ])
    expect(locaStore.commandQueue[0].payload.type).toBe('heatmap')
    expect(locaStore.commandQueue[0].payload.defaultProperties).toEqual({
      source: 'unit',
      category: 'bank'
    })
  })

  test('maintains layer registry and feature index lookups', () => {
    locaActions.setLayerInfo('loca-a', {
      featureIndex: {
        p1: { id: 'p1', name: 'point' }
      }
    })

    expect(locaActions.getLayerList()).toHaveLength(1)
    expect(locaActions.getLayerInfo('loca-a').layerId).toBe('loca-a')
    expect(locaActions.getLayerInfo('missing')).toBeNull()
    expect(locaActions.getFeatureInfo('loca-a', 'p1').name).toBe('point')
    expect(locaActions.getFeatureInfo('loca-a', null)).toBeNull()
    locaActions.removeLayerInfo('loca-a')
    expect(locaActions.getLayerList()).toEqual([])
  })
})

describe('MapController branch coverage', () => {
  test('manages context menu creation, closing and menu item callbacks', () => {
    class FakeMenu {
      constructor() {
        this.items = []
      }

      addItem(label, handler, index) {
        this.items.push({ label, handler, index })
      }

      close() {
        this.closed = true
      }
    }

    const controller = new MapController({
      AMap: { ContextMenu: FakeMenu },
      map: { destroy: jest.fn() },
      actions: {}
    })
    const oldMenu = new FakeMenu()
    controller.drawContextMenu = oldMenu

    const menu = controller.createContextMenu('drawContextMenu')
    const handler = jest.fn()
    controller.addContextMenuItem(menu, 'drawContextMenu', 'edit', handler, 1)
    menu.items[0].handler()

    expect(oldMenu.closed).toBe(true)
    expect(handler).toHaveBeenCalled()
    expect(controller.drawContextMenu).toBeNull()

    const controllerWithoutMenu = createMapController()
    expect(controllerWithoutMenu.createContextMenu('drawContextMenu')).toBeNull()
    expect(() => controllerWithoutMenu.addContextMenuItem(null, 'drawContextMenu', 'edit', handler, 1)).not.toThrow()
  })

  test('routes every registered command to the matching method', () => {
    const controller = createMapController()
    const commandToMethod = {
      'ruler:start': 'startRuler',
      'ruler:clear': 'clearRuler',
      'ruler:restart': 'restartRuler',
      'draw:start': 'startDraw',
      'draw:overlay:clear': 'clearDrawOverlays',
      'draw:overlay:edit-start': 'startEditDrawOverlay',
      'draw:overlay:edit-stop': 'stopEditDrawOverlay',
      'draw:overlay:delete': 'deleteDrawOverlay',
      'coordinate-picker:start': 'prepareCoordinatePicker',
      'marker:start': 'startCustomMarker',
      'marker:render': 'renderCustomMarkers',
      'marker:update-name': 'updateCustomMarkerName',
      'marker:delete': 'deleteCustomMarker',
      'marker:save': 'saveCustomMarker',
      'zoom:in': 'zoomIn',
      'zoom:out': 'zoomOut',
      'map:center-by-coordinate': 'centerByCoordinate',
      'cluster:render': 'renderClusterLayer',
      'wms:render': 'renderWMSLayer',
      'wmts:render': 'renderWMTSLayer',
      'vector-tile:render': 'renderVectorTileLayer',
      'layer:render': 'renderLayer',
      'layer:visible': 'setLayerVisible',
      'layer:style': 'setLayerStyle',
      'layer:style:patch': 'patchLayerStyle',
      'layer:category-visible': 'setLayerCategoryVisible',
      'layer:features-visible': 'setFeaturesVisible',
      'layer:clear': 'clearLayer',
      'layers:clear': 'clearAllLayers',
      'layers:clear-by-prefix': 'clearLayersByPrefix',
      'layers:clear-except': 'clearLayersExcept',
      'layer:feature-style': 'setFeatureStyle',
      'layer:feature-style:clear': 'clearFeatureStyle',
      'layer:feature-styles:clear': 'clearLayerFeatureStyles',
      'layer:fit-view': 'fitLayerView',
      'layer:focus': 'focusFeature'
    }

    Object.values(commandToMethod).forEach((method) => {
      controller[method] = jest.fn()
    })

    controller.handleCommand()
    controller.handleCommand({ type: 'unknown' })
    Object.entries(commandToMethod).forEach(([type, method]) => {
      controller.handleCommand({
        type,
        payload: {
          layerId: 'layer-a',
          shape: 'polygon'
        }
      })
      expect(controller[method]).toHaveBeenCalled()
    })
    expect(controller.startDraw).toHaveBeenCalledWith('polygon')
  })

  test('renders each map layer type with visible and hidden branches', () => {
    const actions = {
      setLayerInfo: jest.fn(),
      removeLayerInfo: jest.fn()
    }
    const controller = createMapController(actions)
    const renderMethods = [
      ['renderLayer', 'getLayer', 'geojson'],
      ['renderClusterLayer', 'getClusterLayer', 'cluster'],
      ['renderWMSLayer', 'getWMSLayer', 'wms'],
      ['renderWMTSLayer', 'getWMTSLayer', 'wmts'],
      ['renderVectorTileLayer', 'getVectorTileLayer', 'vector-tile']
    ]

    renderMethods.forEach(([renderMethod, getterName, layerId]) => {
      const layer = new FakeLayer(layerId)
      controller[getterName] = jest.fn(() => layer)
      controller[renderMethod]({})
      controller[renderMethod]({
        layerId,
        visible: false,
        geoJSON: { type: 'FeatureCollection', features: [pointFeature] },
        style: { point: { color: '#B6002A' } },
        defaultProperties: { source: 'unit' }
      })
      expect(layer.visible).toBe(false)

      controller.layers.set(layerId, layer)
      controller[renderMethod]({
        layerId,
        visible: true,
        geoJSON: { type: 'FeatureCollection', features: [pointFeature] },
        style: { point: { color: '#1677ff' } }
      })
      expect(layer.visible).toBe(true)
      expect(actions.setLayerInfo).toHaveBeenCalledWith(layerId, expect.objectContaining({ type: layerId }))
    })
  })

  test('handles registered layer operations and guard branches', () => {
    const actions = {
      setLayerInfo: jest.fn(),
      removeLayerInfo: jest.fn()
    }
    const controller = createMapController(actions)
    const keepLayer = new FakeLayer()
    const staleLayer = new FakeLayer()
    const prefixLayer = new FakeLayer()

    controller.layers.set('keep', keepLayer)
    controller.layers.set('drop', staleLayer)
    controller.layers.set('prefix-one', prefixLayer)

    controller.setLayerVisible({})
    controller.setLayerVisible({ layerId: 'missing', visible: true })
    controller.setLayerVisible({ layerId: 'keep', visible: true })
    controller.setLayerVisible({ layerId: 'keep', visible: false })
    controller.setLayerStyle({})
    controller.setLayerStyle({ layerId: 'missing', style: {} })
    controller.setLayerStyle({ layerId: 'keep', style: { point: { color: '#B6002A' } } })
    controller.patchLayerStyle({ layerId: 'keep', stylePatch: { point: { size: 30 } } })
    controller.setLayerCategoryVisible({ layerId: 'keep', category: 'bank', visible: false })
    controller.setFeaturesVisible({ layerId: 'keep', featureIds: ['p1'], visible: false })
    controller.setFeatureStyle({ layerId: 'keep', featureId: 'p1', style: { point: { color: '#f59e0b' } } })
    controller.clearFeatureStyle({ layerId: 'keep', featureId: 'p1' })
    controller.clearLayerFeatureStyles({ layerId: 'keep' })
    controller.fitLayerView({ layerId: 'keep', options: { padding: [8, 16] } })
    controller.focusFeature({ type: 'keep', id: 'p1' })
    controller.centerByCoordinate({ keyword: 'bad' })
    controller.centerByCoordinate({ keyword: '121.5, 31.2' })
    controller.clearLayersByPrefix({})
    controller.clearLayersByPrefix({ prefix: 'prefix-' })
    controller.clearLayersExcept({})
    controller.clearLayersExcept({ layerIds: ['keep'] })

    expect(keepLayer.visible).toBe(false)
    expect(keepLayer.style.point.color).toBe('#B6002A')
    expect(keepLayer.stylePatch.point.size).toBe(30)
    expect(keepLayer.categoryVisible).toEqual({ category: 'bank', visible: false })
    expect(keepLayer.featuresVisible.featureIds).toEqual(['p1'])
    expect(keepLayer.focusedFeatureId).toBe('p1')
    expect(controller.map.zoomCalls).toEqual([{ zoom: 14, position: [121.5, 31.2], immediately: true }])
    expect(prefixLayer.destroyed).toBe(true)
    expect(staleLayer.destroyed).toBe(true)
    expect(actions.removeLayerInfo).toHaveBeenCalledWith('prefix-one')
    expect(actions.removeLayerInfo).toHaveBeenCalledWith('drop')
  })

  test('covers map tools, drawing edit lifecycle, custom marker click and event fallbacks', () => {
    jest.useFakeTimers()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    class FakeMenu {
      constructor() {
        this.items = []
      }

      addItem(label, handler, index) {
        this.items.push({ label, handler, index })
      }

      open(mapInstance, lnglat) {
        this.opened = { mapInstance, lnglat }
      }

      close() {
        this.closed = true
      }
    }
    const actions = {
      setActiveTool: jest.fn(),
      setCustomMarkerResult: jest.fn(),
      clearCustomMarkerResult: jest.fn(),
      setCustomMarkerAction: jest.fn(),
      setDrawResult: jest.fn(),
      clearDrawResult: jest.fn(),
      setDrawOverlayInfo: jest.fn(),
      setDrawOverlayAction: jest.fn(),
      setLayerInfo: jest.fn(),
      removeLayerInfo: jest.fn()
    }
    const map = {
      added: [],
      removed: [],
      onceHandlers: {},
      handlers: {},
      add(overlay) {
        this.added.push(overlay)
      },
      remove(overlays) {
        this.removed.push(...(Array.isArray(overlays) ? overlays : [overlays]))
      },
      once(type, handler) {
        this.onceHandlers[type] = handler
      },
      on(type, handler) {
        this.handlers[type] = handler
      },
      off(type, handler) {
        if (!handler || this.handlers[type] === handler || this.onceHandlers[type] === handler) {
          delete this.handlers[type]
          delete this.onceHandlers[type]
        }
      },
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
      },
      destroy: jest.fn()
    }
    const controller = new MapController({
      AMap: {
        MouseTool: FakeMouseTool,
        RangingTool: FakeRangingTool,
        Marker: FakeAMapOverlay,
        Pixel: FakePixel,
        PolygonEditor: FakeDrawEditor,
        RectangleEditor: FakeDrawEditor,
        CircleEditor: FakeDrawEditor,
        ContextMenu: FakeMenu
      },
      map,
      actions
    })

    controller.startRuler()
    expect(FakeRangingTool.instances[0].on).toBe(true)
    controller.clearRuler()
    expect(FakeRangingTool.instances[0].offWith).toBe(true)
    controller.restartRuler()
    expect(FakeRangingTool.instances[0].on).toBe(true)

    controller.startDraw('rectangle')
    controller.startDraw('circle')
    controller.startDraw('polygon')
    expect(FakeMouseTool.instances[0].rectangleOptions).toBeDefined()
    expect(FakeMouseTool.instances[0].circleOptions).toBeDefined()
    expect(FakeMouseTool.instances[0].polygonOptions).toBeDefined()
    controller.bindDrawCompleteHandler(FakeMouseTool.instances[0])
    controller.clearDrawCompleteHandler()
    expect(FakeMouseTool.instances[0].handlers.draw).toBeUndefined()

    controller.startCustomMarker()
    map.onceHandlers.click({ lnglat: new FakeLngLat(121.5, 31.2) })
    expect(controller.customMarkerRecords.size).toBe(1)
    expect(actions.setCustomMarkerAction.mock.calls.some((call) => call[0].type === 'create')).toBe(true)

    controller.startCustomMarker()
    map.onceHandlers.click({ lnglat: null })
    expect(controller.customMarkerRecords.size).toBe(1)

    const overlay = new FakeAMapOverlay({
      path: [
        new FakeLngLat(121.5, 31.2),
        new FakeLngLat(121.7, 31.2),
        new FakeLngLat(121.7, 31.4)
      ],
      extData: {}
    })
    controller.mouseTool.overlays = {
      polygon: [overlay]
    }
    const record = controller.registerDrawOverlay('polygon', overlay)
    expect(controller.mouseTool.overlays.polygon).toEqual([])

    controller.startEditDrawOverlay({ id: record.id })
    expect(FakeDrawEditor.instances[0].opened).toBe(true)
    controller.startEditDrawOverlay({ id: record.id })
    FakeDrawEditor.instances[0].handlers.change()
    expect(actions.setDrawResult).toHaveBeenCalled()

    controller.openDrawContextMenu(record, [121.5, 31.2])
    expect(controller.drawContextMenu.items.length).toBeGreaterThan(0)
    overlay.handlers.rightclick({
      lnglat: [121.5, 31.2],
      originEvent: {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      }
    })
    expect(controller.activeDrawOverlayId).toBe(record.id)

    controller.stopEditDrawOverlay()
    jest.runOnlyPendingTimers()
    expect(FakeDrawEditor.instances[0].destroyed).toBe(true)
    controller.deleteDrawOverlay({ id: record.id })
    expect(controller.drawOverlays.size).toBe(0)

    controller.clearDrawOverlays()
    controller.closeMouseTool(true)
    expect(FakeMouseTool.instances[0].closedWith).toBe(true)

    const fallbackMap = {
      handlers: {},
      on(type, handler) {
        this.handlers[type] = handler
      },
      off(type, handler) {
        if (this.handlers[type] === handler) {
          delete this.handlers[type]
        }
      }
    }
    const fallbackController = new MapController({
      AMap: {},
      map: fallbackMap,
      actions: {}
    })
    const onceHandler = jest.fn()
    fallbackController.bindOneMapEvent('click', onceHandler)
    fallbackMap.handlers.click({ lnglat: [1, 2] })
    expect(onceHandler).toHaveBeenCalled()
    expect(fallbackMap.handlers.click).toBeUndefined()

    const badCanvasController = new MapController({
      AMap: {},
      map: {
        getMapsContainer() {
          return {
            querySelector() {
              return {
                toDataURL() {
                  throw new Error('canvas failed')
                }
              }
            }
          }
        }
      },
      actions: {}
    })
    expect(badCanvasController.captureThumbnail().thumbnailError).toBe('canvas failed')

    const unavailableActions = { setActiveTool: jest.fn() }
    const unavailableController = new MapController({
      AMap: {},
      map: {},
      actions: unavailableActions
    })
    unavailableController.startRuler()
    unavailableController.startDraw('polygon')
    unavailableController.startCustomMarker()
    expect(unavailableActions.setActiveTool).toHaveBeenCalledWith('')

    warn.mockRestore()
    jest.useRealTimers()
  })

  test('reuses matching map layers and replaces mismatched specialized layers', () => {
    const controller = createMapController()
    const reusableCluster = new FakeLayer('cluster')
    const staleCluster = new FakeLayer('geojson')
    const reusableWMS = new FakeLayer('wms')
    const staleWMS = new FakeLayer('geojson')
    const reusableWMTS = new FakeLayer('wmts')
    const staleWMTS = new FakeLayer('geojson')
    const reusableVectorTile = new FakeLayer('vector-tile')
    const staleVectorTile = new FakeLayer('geojson')

    controller.zoomIn()
    controller.zoomOut()
    expect(controller.map.zoomIn).toHaveBeenCalled()
    expect(controller.map.zoomOut).toHaveBeenCalled()

    controller.layers.set('plain', new FakeLayer('geojson'))
    expect(controller.getLayer('plain').getType()).toBe('geojson')

    controller.layers.set('cluster-reuse', reusableCluster)
    expect(controller.getClusterLayer('cluster-reuse')).toBe(reusableCluster)
    controller.layers.set('cluster-replace', staleCluster)
    expect(controller.getClusterLayer('cluster-replace')).not.toBe(staleCluster)
    expect(staleCluster.destroyed).toBe(true)

    controller.layers.set('wms-reuse', reusableWMS)
    expect(controller.getWMSLayer('wms-reuse')).toBe(reusableWMS)
    controller.layers.set('wms-replace', staleWMS)
    expect(controller.getWMSLayer('wms-replace')).not.toBe(staleWMS)
    expect(staleWMS.destroyed).toBe(true)

    controller.layers.set('wmts-reuse', reusableWMTS)
    expect(controller.getWMTSLayer('wmts-reuse')).toBe(reusableWMTS)
    controller.layers.set('wmts-replace', staleWMTS)
    expect(controller.getWMTSLayer('wmts-replace')).not.toBe(staleWMTS)
    expect(staleWMTS.destroyed).toBe(true)

    controller.layers.set('vector-reuse', reusableVectorTile)
    expect(controller.getVectorTileLayer('vector-reuse')).toBe(reusableVectorTile)
    controller.layers.set('vector-replace', staleVectorTile)
    expect(controller.getVectorTileLayer('vector-replace')).not.toBe(staleVectorTile)
    expect(staleVectorTile.destroyed).toBe(true)
  })
})

describe('LocaController branch coverage', () => {
  test('throws when Loca container is unavailable and routes commands', () => {
    expect(() => new LocaController({ Loca: {}, AMap: {}, map: {}, actions: {} })).toThrow('Container')

    const controller = createLocaController()
    const commandToMethod = {
      'loca:layer:render': 'renderLayer',
      'loca:layer:visible': 'setLayerVisible',
      'loca:layer:category-visible': 'setLayerCategoryVisible',
      'loca:layer:features-visible': 'setFeaturesVisible',
      'loca:layer:style': 'setLayerStyle',
      'loca:layer:style:patch': 'patchLayerStyle',
      'loca:layer:feature-style': 'setFeatureStyle',
      'loca:layer:feature-style:clear': 'clearFeatureStyle',
      'loca:layer:feature-styles:clear': 'clearLayerFeatureStyles',
      'loca:layer:fit-view': 'fitLayerView',
      'loca:layer:clear': 'clearLayer',
      'loca:layers:clear': 'clearAllLayers'
    }

    Object.values(commandToMethod).forEach((method) => {
      controller[method] = jest.fn()
    })

    controller.handleCommand()
    controller.handleCommand({ type: 'unknown' })
    Object.entries(commandToMethod).forEach(([type, method]) => {
      controller.handleCommand({ type, payload: { layerId: 'loca-a' } })
      expect(controller[method]).toHaveBeenCalled()
    })
  })

  test('renders, updates and clears loca layers with guard branches', () => {
    const actions = {
      setLayerInfo: jest.fn(),
      removeLayerInfo: jest.fn(),
      clearLayerInfo: jest.fn()
    }
    const controller = createLocaController(actions)
    const layer = new FakeLayer('point')

    controller.getLayer = jest.fn(() => layer)
    controller.renderLayer({})
    controller.renderLayer({ layerId: 'loca-a', type: 'point', visible: false })
    expect(layer.visible).toBe(false)
    controller.layers.set('loca-a', layer)
    controller.renderLayer({ layerId: 'loca-a', type: 'point', visible: true })
    expect(layer.visible).toBe(true)

    controller.setLayerVisible({})
    controller.setLayerVisible({ layerId: 'missing', visible: true })
    controller.setLayerVisible({ layerId: 'loca-a', visible: false })
    controller.setLayerCategoryVisible({})
    controller.setLayerCategoryVisible({ layerId: 'loca-a', category: null, visible: false })
    controller.setLayerCategoryVisible({ layerId: 'loca-a', category: 'bank', visible: false })
    controller.setFeaturesVisible({})
    controller.setFeaturesVisible({ layerId: 'loca-a', featureIds: ['p1'], visible: false })
    controller.setLayerStyle({})
    controller.setLayerStyle({ layerId: 'loca-a', style: { color: '#1677ff' } })
    controller.patchLayerStyle({})
    controller.patchLayerStyle({ layerId: 'loca-a', stylePatch: { color: '#B6002A' } })
    controller.setFeatureStyle({})
    controller.setFeatureStyle({ layerId: 'loca-a', featureId: 'p1', style: { color: '#f59e0b' } })
    controller.clearFeatureStyle({})
    controller.clearFeatureStyle({ layerId: 'loca-a', featureId: 'p1' })
    controller.clearLayerFeatureStyles({})
    controller.clearLayerFeatureStyles({ layerId: 'loca-a' })
    controller.fitLayerView({})
    controller.fitLayerView({ layerId: 'loca-a', options: { padding: [4, 8] } })

    expect(layer.categoryVisible).toEqual({ category: 'bank', visible: false })
    expect(layer.featuresVisible.featureIds).toEqual(['p1'])
    expect(layer.style.color).toBe('#1677ff')
    expect(layer.stylePatch.color).toBe('#B6002A')
    expect(layer.featureStyle.featureId).toBe('p1')
    expect(layer.clearedFeatureId).toBe('p1')
    expect(layer.clearedAllFeatureStyles).toBe(true)
    expect(layer.fitOptions.padding).toEqual([4, 8])

    controller.clearLayer({})
    controller.clearLayer({ layerId: 'missing' })
    controller.clearLayer({ layerId: 'loca-a' })
    expect(layer.destroyed).toBe(true)
    expect(actions.removeLayerInfo).toHaveBeenCalledWith('loca-a')
    controller.destroy()
    expect(actions.clearLayerInfo).toHaveBeenCalled()
  })

  test('wraps GeoJSON click events to open a shared InfoWindow before business callback', () => {
    FakeInfoWindow.instances = []
    const controller = createMapController()
    const layer = new FakeLayer('geojson')
    const businessClick = jest.fn()
    const lnglatA = [121.5, 31.2]
    const lnglatB = [121.6, 31.3]

    controller.AMap = { InfoWindow: FakeInfoWindow }
    controller.getLayer = jest.fn(() => layer)

    controller.renderLayer({
      layerId: 'bank-layer',
      geoJSON: { type: 'FeatureCollection', features: [pointFeature] },
      style: { point: { renderer: 'pin' } },
      infoWindow: {
        content: (feature, properties) => `<div>${feature.id}-${properties.name}</div>`
      },
      events: {
        click: businessClick
      }
    })

    const wrappedClick = layer.dataArgs[2].events.click
    wrappedClick(pointFeature, { lnglat: lnglatA })
    wrappedClick(pointFeature, { lnglat: lnglatB })

    expect(FakeInfoWindow.instances).toHaveLength(1)
    expect(FakeInfoWindow.instances[0].options).toEqual({
      isCustom: true,
      autoMove: true,
      closeWhenClickMap: false
    })
    expect(FakeInfoWindow.instances[0].content).toBe('<div>p1-point</div>')
    expect(FakeInfoWindow.instances[0].openCalls).toEqual([
      { map: controller.map, lnglat: lnglatA },
      { map: controller.map, lnglat: lnglatB }
    ])
    expect(businessClick).toHaveBeenCalledTimes(2)
    expect(businessClick).toHaveBeenCalledWith(pointFeature, { lnglat: lnglatA })
  })

  test('opens InfoWindow at overlay position when click event has no lnglat', () => {
    FakeInfoWindow.instances = []
    const controller = createMapController()
    const layer = new FakeLayer('geojson')
    const markerPosition = [121.7, 31.4]

    controller.AMap = { InfoWindow: FakeInfoWindow }
    controller.getLayer = jest.fn(() => layer)

    controller.renderLayer({
      layerId: 'bank-layer',
      infoWindow: {
        content: '<div>详情</div>'
      }
    })

    layer.dataArgs[2].events.click(pointFeature, {
      overlay: {
        getPosition: () => markerPosition
      }
    })

    expect(FakeInfoWindow.instances).toHaveLength(1)
    expect(FakeInfoWindow.instances[0].openCalls).toEqual([
      { map: controller.map, lnglat: markerPosition }
    ])
  })

  test('does not open InfoWindow when click payload has no usable position', () => {
    FakeInfoWindow.instances = []
    const controller = createMapController()
    const layer = new FakeLayer('geojson')

    controller.AMap = { InfoWindow: FakeInfoWindow }
    controller.getLayer = jest.fn(() => layer)

    controller.renderLayer({
      layerId: 'bank-layer',
      infoWindow: {
        content: '<div>详情</div>'
      }
    })

    layer.dataArgs[2].events.click(pointFeature, {})

    expect(FakeInfoWindow.instances).toHaveLength(0)
  })

  test('routes close InfoWindow command to the shared instance', () => {
    const controller = createMapController()
    controller.infoWindow = new FakeInfoWindow()

    controller.handleCommand({ type: 'infowindow:close' })

    expect(controller.infoWindow.close).toHaveBeenCalledTimes(1)
  })

  test('uses marker-backed InfoWindow when the offline AMap package has no InfoWindow constructor', () => {
    FakeAMapOverlay.instances = []
    const controller = createMapController()
    const layer = new FakeLayer('geojson')
    const markerPosition = [121.7, 31.4]
    const plugin = jest.fn()

    controller.AMap = {
      Marker: FakeAMapOverlay,
      Pixel: FakePixel,
      plugin
    }
    controller.getLayer = jest.fn(() => layer)

    controller.renderLayer({
      layerId: 'bank-layer',
      infoWindow: {
        content: '<div class="map-info-window">详情</div>'
      }
    })

    layer.dataArgs[2].events.click(pointFeature, {
      overlay: {
        getPosition: () => markerPosition
      }
    })

    expect(FakeAMapOverlay.instances).toHaveLength(1)
    expect(plugin).not.toHaveBeenCalled()
    expect(FakeAMapOverlay.instances[0].options.position).toEqual(markerPosition)
    expect(FakeAMapOverlay.instances[0].options.content).toContain('map-info-window-host')
    expect(FakeAMapOverlay.instances[0].options.content).toContain('map-info-window')
    expect(FakeAMapOverlay.instances[0].options.offset).toEqual(new FakePixel(0, 0))

    controller.handleCommand({ type: 'infowindow:close' })

    expect(FakeAMapOverlay.instances[0].map).toBeNull()
  })

  test('does not keep unused InfoWindow map click handler state', () => {
    const controller = createMapController()

    expect(controller).not.toHaveProperty('infoWindowMapClickHandler')
  })

  test('routes InfoWindow action button clicks with feature context', () => {
    FakeInfoWindow.instances = []
    const controller = createMapController()
    const layer = new FakeLayer('geojson')
    const onAction = jest.fn()
    const lnglat = [121.5, 31.2]

    controller.AMap = { InfoWindow: FakeInfoWindow }
    controller.getLayer = jest.fn(() => layer)

    controller.renderLayer({
      layerId: 'bank-layer',
      infoWindow: {
        title: 'name',
        fields: [
          { label: '分类', field: 'category' }
        ],
        actions: [
          { key: 'detail', label: '查看详情', type: 'primary' }
        ],
        onAction
      }
    })

    layer.dataArgs[2].events.click(pointFeature, { lnglat })

    const host = FakeInfoWindow.instances[0].content
    const button = host.querySelector('[data-map-info-action="detail"]')
    expect(host.innerHTML).toContain('map-info-window')
    expect(host.innerHTML).toContain('查看详情')
    expect(button).not.toBeNull()

    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onAction.mock.calls[0][0]).toEqual({
      key: 'detail',
      label: '查看详情',
      type: 'primary'
    })
    expect(onAction.mock.calls[0][1]).toMatchObject({
      layerId: 'bank-layer',
      featureId: 'p1',
      properties: pointFeature.properties,
      lnglat
    })
    expect(typeof onAction.mock.calls[0][1].close).toBe('function')
  })

  test('uses container clear when destroy is not available', () => {
    class ClearOnlyContainer {
      constructor(options) {
        this.options = options
      }

      clear() {
        this.cleared = true
      }
    }

    const actions = {
      clearLayerInfo: jest.fn()
    }
    const controller = new LocaController({
      Loca: { Container: ClearOnlyContainer },
      AMap: {},
      map: {},
      actions
    })
    const container = controller.container

    controller.destroy()

    expect(container.cleared).toBe(true)
    expect(actions.clearLayerInfo).toHaveBeenCalled()
  })

  test('reuses compatible loca layer instances and replaces mismatched ones', () => {
    const controller = createLocaController()
    const current = new FakeLayer('point')
    controller.layers.set('loca-a', current)

    expect(controller.getLayer('loca-a', 'point')).toBe(current)

    controller.getLayer = LocaController.prototype.getLayer.bind(controller)
    controller.Loca = {
      Container: controller.Loca.Container,
      LineLayer: class {}
    }

    expect(() => controller.getLayer('loca-a', 'line')).not.toThrow()
    expect(current.destroyed).toBe(true)
    expect(controller.layers.get('loca-a')).toBeDefined()
  })
})

describe('layer registry branch coverage', () => {
  test('createLocaLayer updates source data, runtime options, highlight and fitView', () => {
    const container = {
      added: [],
      removed: [],
      renderCount: 0,
      add(layer) {
        this.added.push(layer)
      },
      remove(layer) {
        this.removed.push(layer)
      },
      requestRender() {
        this.renderCount += 1
      }
    }
    const map = {
      boundsCalls: [],
      setBounds(bounds, immediately, padding) {
        this.boundsCalls.push({ bounds, immediately, padding })
      }
    }
    const Loca = {
      GeoJSONSource: FakeLocaSource,
      PointLayer: FakeRuntimeLocaLayer,
      PolygonLayer: FakeRuntimeLocaLayer,
      LineLayer: FakeRuntimeLocaLayer
    }
    const AMap = {
      LngLat: FakeLngLat,
      Bounds: FakeBounds
    }
    const layer = createLocaLayer('loca-registry', {
      Loca,
      AMap,
      map,
      container,
      type: 'polygon'
    })
    const polygonFeature = {
      type: 'Feature',
      id: 'poly-1',
      properties: {
        id: 'poly-1',
        category: 'area',
        name: 'area'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [[121.5, 31.2], [121.7, 31.2], [121.7, 31.4], [121.5, 31.2]]
        ]
      }
    }

    layer.setData({
      type: 'FeatureCollection',
      features: [
        polygonFeature,
        {
          type: 'Point',
          id: 'geom-1',
          properties: {
            category: 'single'
          },
          coordinates: [121.6, 31.3]
        },
        null
      ]
    }, {
      color: '#B6002A',
      layerOptions: {
        opacity: 0.6,
        zIndex: 8,
        zooms: [4, 18]
      }
    })

    expect(layer.getInfo().featureCount).toBe(2)
    expect(layer.getInfo().style.color).toBe('#B6002A')

    layer.show()
    layer.setStyle({
      color: '#1677ff',
      layerOptions: {
        opacity: 0.3,
        zIndex: 12,
        zooms: [5, 16]
      }
    })
    expect(FakeRuntimeLocaLayer.instances[0].opacity).toBe(0.3)
    expect(FakeRuntimeLocaLayer.instances[0].zIndex).toBe(12)
    expect(FakeRuntimeLocaLayer.instances[0].zooms).toEqual([5, 16])

    layer.patchStyle({
      layerOptions: {
        visible: false
      }
    })
    expect(FakeRuntimeLocaLayer.instances[0].visible).toBe(false)

    layer.setCategoryVisible(['area'], false)
    expect(FakeLocaSource.instances[0].bfData.features).toHaveLength(1)
    layer.setCategoryVisible('area', true)
    expect(FakeLocaSource.instances[0].bfData.features).toHaveLength(2)

    layer.setFeaturesVisible('geom-1', false)
    expect(FakeLocaSource.instances[0].bfData.features).toHaveLength(1)
    layer.setFeaturesVisible(['geom-1'], true)
    expect(FakeLocaSource.instances[0].bfData.features).toHaveLength(2)

    expect(layer.setFeatureStyle(null, { color: '#f59e0b' })).toBe(false)
    expect(layer.setFeatureStyle('poly-1', { color: '#f59e0b' })).toBe(true)
    expect(layer.getInfo().styledFeatureIds).toEqual(['poly-1'])
    expect(layer.clearFeatureStyle('missing')).toBe(false)
    expect(layer.clearFeatureStyle('poly-1')).toBe(true)
    layer.clearFeatureStyles()
    layer.setFeatureStyle('poly-1', { color: '#22c55e' })
    layer.clearFeatureStyles()
    expect(layer.getInfo().styledFeatureIds).toEqual([])

    layer.fitView({ padding: ['bad', 24, 32, 40] })
    expect(map.boundsCalls[0].padding).toEqual([80, 24, 32, 40])

    layer.hide()
    expect(container.renderCount).toBeGreaterThan(0)
    layer.destroy()
    expect(layer.getInfo().featureCount).toBe(0)
  })

  test('createLocaLayer handles unavailable source, constructor and fallback container APIs', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const fallbackContainer = {
      added: [],
      removed: [],
      addLayer(layer) {
        this.added.push(layer)
      },
      removeLayer(layer) {
        this.removed.push(layer)
      }
    }
    const noSourceLayer = createLocaLayer('no-source', {
      Loca: {
        PointLayer: FakeRuntimeLocaLayer
      },
      AMap: {},
      map: {},
      container: fallbackContainer,
      type: 'point'
    })
    noSourceLayer.setData(pointFeature, { color: '#B6002A' })
    expect(warn).toHaveBeenCalledWith('[Loca] GeoJSONSource is unavailable in the offline package.')

    const noConstructorLayer = createLocaLayer('no-constructor', {
      Loca: {
        GeoJSONSource: FakeLocaSource
      },
      AMap: {},
      map: {},
      container: fallbackContainer,
      type: 'missing'
    })
    noConstructorLayer.setData(pointFeature, { color: '#B6002A' })
    expect(warn.mock.calls.some((call) => String(call[0]).includes('PointLayer'))).toBe(true)

    const layer = createLocaLayer('fallback-container', {
      Loca: {
        GeoJSONSource: FakeLocaSource,
        PointLayer: FakeRuntimeLocaLayer
      },
      AMap: {},
      map: {},
      container: fallbackContainer,
      type: 'point'
    })
    layer.setData(pointFeature, {
      style: { color: '#B6002A' },
      layerOptions: { opacity: 0.4 }
    })
    layer.patchStyle({
      layerOptions: {
        tileSize: 512
      }
    })
    layer.destroy()

    expect(fallbackContainer.added.length).toBeGreaterThan(0)
    expect(fallbackContainer.removed.length).toBeGreaterThan(0)
    warn.mockRestore()
  })

  test('createClusterLayer renders marker variants, filters data and exposes cluster events', () => {
    const clusterClick = jest.fn()
    const pointClick = jest.fn()
    const map = {
      boundsCalls: [],
      zoomCalls: [],
      setBounds(bounds, immediately, padding) {
        this.boundsCalls.push({ bounds, immediately, padding })
      },
      setZoomAndCenter(zoom, position, immediately) {
        this.zoomCalls.push({ zoom, position, immediately })
      }
    }
    const AMap = {
      Pixel: FakePixel,
      LngLat: FakeLngLat,
      Bounds: FakeBounds,
      MarkerCluster: FakeMarkerCluster
    }
    const layer = createClusterLayer('cluster-registry', {
      AMap,
      map
    })
    const geoJSON = {
      type: 'FeatureCollection',
      features: [
        pointFeature,
        {
          ...pointFeature,
          id: 'p2',
          properties: {
            ...pointFeature.properties,
            id: 'p2',
            category: 'hidden',
            shortName: 'H'
          },
          geometry: {
            type: 'MultiPoint',
            coordinates: [[121.6, 31.3], [121.61, 31.31]]
          }
        },
        {
          type: 'Feature',
          id: 'line-ignored',
          properties: { id: 'line-ignored' },
          geometry: {
            type: 'LineString',
            coordinates: [[121.5, 31.2], [121.7, 31.4]]
          }
        }
      ]
    }

    layer.setData(geoJSON, {
      point: {
        renderer: 'html',
        html: '<b>P</b>',
        size: [28, 28],
        label: {
          visible: true,
          content: 'label'
        }
      },
      cluster: {
        renderer: 'image',
        image: {
          src: '/cluster.png'
        },
        text: ({ count }) => `n-${count}`
      }
    }, {
      events: {
        click: pointClick,
        clusterClick
      }
    })
    layer.show()

    const firstCluster = FakeMarkerCluster.instances[0]
    expect(firstCluster.pointMarker.content).toContain('<b>P</b>')
    expect(firstCluster.clusterMarker.content).toContain('/cluster.png')
    expect(layer.getInfo().overlayCount).toBe(3)

    firstCluster.pointMarker.handlers.click({ raw: true })
    firstCluster.handlers.click({
      count: 3,
      clusterData: firstCluster.data
    })
    expect(pointClick).toHaveBeenCalled()
    expect(clusterClick).toHaveBeenCalledWith(expect.objectContaining({ count: 3 }))

    layer.setCategoryVisible('hidden', false)
    expect(latestFakeMarkerCluster().data).toHaveLength(1)
    layer.setFeaturesVisible(['p1'], false)
    expect(latestFakeMarkerCluster().data).toHaveLength(0)
    layer.setCategoryVisible('hidden', true)
    layer.setFeaturesVisible('p1', true)
    expect(latestFakeMarkerCluster().data.length).toBeGreaterThan(0)

    layer.patchStyle({
      cluster: {
        renderer: 'html',
        html: ({ count }) => `<i>${count}</i>`
      }
    })
    expect(latestFakeMarkerCluster().clusterMarker.content).toContain('<i>')

    layer.fitView({ padding: [10, 20] })
    expect(map.boundsCalls[0].padding).toEqual([10, 20, 10, 20])
    layer.focus('p1')
    expect(map.zoomCalls[0].position).toEqual([121.5, 31.2])
    expect(layer.clearFeatureStyle()).toBe(false)
    expect(layer.setFeatureStyle()).toBe(false)
    layer.clearFeatureStyles()
    layer.hide()
    expect(latestFakeMarkerCluster().map).toBeNull()
    layer.destroy()
    expect(layer.getInfo().featureCount).toBe(0)
  })

  test('createVectorTileLayer covers setters, event rebinding, reload and fallbacks', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const click = jest.fn()
    const map = {
      added: [],
      removed: [],
      addLayer(layer) {
        this.added.push(layer)
      },
      removeLayer(layer) {
        this.removed.push(layer)
      }
    }
    const layer = createVectorTileLayer('vector-branches', {
      AMap: { MapboxVectorTileLayer: FakeVectorTileRuntimeLayer },
      map
    })

    layer.setData({
      url: '/tiles/{z}/{x}/{y}.pbf',
      opacity: 0.6,
      zIndex: 22,
      zooms: [4, 15],
      point: { sourceLayer: 'poi', color: '#B6002A' },
      line: { sourceLayer: 'road' },
      events: {
        click,
        broken: 'noop'
      },
      eventOptions: {
        default: { passive: true },
        click: { capture: true }
      }
    })

    const firstLayer = FakeVectorTileRuntimeLayer.instances[0]
    expect(firstLayer.options.url).toBe('/tiles/[z]/[x]/[y].pbf')
    expect(firstLayer.styles.point.color).toBe('#B6002A')
    expect(firstLayer.opacity).toBe(0.6)
    expect(firstLayer.zIndex).toBe(22)
    expect(firstLayer.zooms).toEqual([4, 15])
    expect(firstLayer.eventOption).toEqual({ capture: true })
    expect(layer.getInfo().sourceLayers).toEqual(['poi', 'road'])
    expect(layer.filterByRect([1, 2, 3, 4], 'point')[0].type).toBe('point')

    layer.setData({
      url: '/tiles/{z}/{x}/{y}.pbf',
      styles: { polygon: { sourceLayer: 'area' } },
      events: { mousemove: jest.fn() },
      eventOptions: { default: { once: true } }
    })
    expect(firstLayer.offCalls[0].type).toBe('click')
    expect(firstLayer.handlers.mousemove).toBeDefined()

    layer.patchStyle({
      opacity: 0.3,
      zIndex: 30,
      zooms: [6, 12],
      point: { color: '#1677ff' },
      customIgnoredWhenPatch: 'ignored'
    })
    expect(firstLayer.opacity).toBe(0.3)
    expect(firstLayer.zIndex).toBe(30)
    expect(firstLayer.zooms).toEqual([6, 12])

    layer.reload()
    expect(firstLayer.reloaded).toBe(true)
    layer.hide()
    expect(firstLayer.visible).toBe(false)
    layer.show()
    expect(firstLayer.visible).toBe(true)

    const setMapLayer = createVectorTileLayer('vector-set-map', {
      AMap: { MapboxVectorTileLayer: FakeVectorTileRuntimeLayer },
      map: {}
    })
    setMapLayer.setData({ url: '/fallback/{z}/{x}/{y}.pbf' })
    const fallbackLayer = FakeVectorTileRuntimeLayer.instances[FakeVectorTileRuntimeLayer.instances.length - 1]
    expect(fallbackLayer.map).toEqual({})
    setMapLayer.destroy()
    expect(fallbackLayer.map).toBeNull()

    createVectorTileLayer('vector-no-sdk', { AMap: {}, map }).show()
    createVectorTileLayer('vector-no-url', {
      AMap: { MapboxVectorTileLayer: FakeVectorTileRuntimeLayer },
      map
    }).show()
    expect(warn.mock.calls.some((call) => String(call[0]).includes('MapboxVectorTileLayer'))).toBe(true)
    expect(warn.mock.calls.some((call) => String(call[0]).includes('requires url'))).toBe(true)

    layer.destroy()
    expect(firstLayer.destroyed).toBe(true)
    warn.mockRestore()
  })

  test('createWMSLayer covers option updates, recreate paths and map fallbacks', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const map = {
      added: [],
      removed: [],
      add(layer) {
        this.added.push(layer)
      },
      remove(layer) {
        this.removed.push(layer)
      }
    }
    const AMap = {
      TileLayer: {
        WMS: FakeWMSRuntimeLayer
      }
    }
    const layer = createWMSLayer('wms-branches', { AMap, map })

    layer.setData({
      url: '/geoserver/wms',
      opacity: 0.7,
      zIndex: 12,
      zooms: [5, 16],
      params: {
        LAYERS: 'site:grid'
      }
    })

    const firstLayer = FakeWMSRuntimeLayer.instances[0]
    expect(firstLayer.url).toBe('/geoserver/wms')
    expect(firstLayer.params.LAYERS).toBe('site:grid')
    expect(firstLayer.opacity).toBe(0.7)
    expect(firstLayer.zIndex).toBe(12)
    expect(firstLayer.zooms).toEqual([5, 16])

    layer.patchStyle({
      visible: false,
      opacity: 0.4
    })
    expect(firstLayer.visible).toBe(false)
    expect(firstLayer.opacity).toBe(0.4)

    layer.setStyle({
      visible: true,
      param: {
        LAYERS: 'site:next'
      }
    })
    expect(firstLayer.visible).toBe(true)
    expect(firstLayer.params.LAYERS).toBe('site:next')

    layer.setData({
      url: '/geoserver/wms-next',
      params: {
        LAYERS: 'site:changed'
      }
    })
    expect(firstLayer.destroyed).toBe(true)
    expect(FakeWMSRuntimeLayer.instances).toHaveLength(2)

    const setMapLayer = createWMSLayer('wms-set-map', { AMap, map: {} })
    setMapLayer.setData({ url: '/geoserver/wms-fallback' })
    const fallbackLayer = FakeWMSRuntimeLayer.instances[FakeWMSRuntimeLayer.instances.length - 1]
    expect(fallbackLayer.map).toEqual({})
    setMapLayer.destroy()
    expect(fallbackLayer.map).toBeNull()

    createWMSLayer('wms-no-sdk', { AMap: {}, map }).show()
    createWMSLayer('wms-no-url', { AMap, map }).show()
    expect(warn.mock.calls.some((call) => String(call[0]).includes('TileLayer.WMS'))).toBe(true)
    expect(warn.mock.calls.some((call) => String(call[0]).includes('requires url'))).toBe(true)

    layer.destroy()
    expect(layer.getInfo().visible).toBe(true)
    warn.mockRestore()
  })

  test('createWMTSLayer covers template urls, standard urls, validation and fallbacks', () => {
    expect(buildWMTSTileUrl({
      template: true,
      url: '/wmts/{z}/{x}/{y}.png'
    }, 1, 2, 3)).toBe('/wmts/3/1/2.png')
    expect(buildWMTSTileUrl({
      template: true,
      url: '/wmts/[z]/[x]/[y].png'
    }, 4, 5, 6)).toBe('/wmts/6/4/5.png')
    expect(buildWMTSTileUrl({
      url: '/wmts',
      service: 'WMTS',
      request: 'GetTile',
      version: '1.0.0',
      layer: 'grid',
      style: 'default',
      tileMatrixSet: 'EPSG:3857',
      tileMatrixLabels: { 3: 'matrix-3' },
      format: 'image/png',
      params: { token: 'abc' }
    }, 1, 2, 3)).toContain('TILEMATRIX=matrix-3')
    expect(buildWMTSTileUrl({
      url: '/wmts',
      service: 'WMTS',
      request: 'GetTile',
      version: '1.0.0',
      layer: 'grid',
      style: 'default',
      tileMatrixSet: 'EPSG:3857',
      tileMatrixLabels: ['m0', 'm1'],
      format: 'image/png',
      params: {}
    }, 1, 2, 1)).toContain('TILEMATRIX=m1')
    expect(buildWMTSTileUrl({
      url: '/wmts',
      service: 'WMTS',
      request: 'GetTile',
      version: '1.0.0',
      layer: 'grid',
      style: 'default',
      tileMatrixSet: 'EPSG:3857',
      tileMatrixPrefix: '3857:',
      format: 'image/png',
      params: {}
    }, 1, 2, 9)).toContain('TILEMATRIX=3857%3A9')

    const map = {
      added: [],
      removed: [],
      add(layer) {
        this.added.push(layer)
      },
      remove(layer) {
        this.removed.push(layer)
      }
    }
    const AMap = {
      TileLayer: FakeTileRuntimeLayer
    }
    const layer = createWMTSLayer('wmts-branches', { AMap, map })

    expect(() => layer.setData({})).toThrow('url')
    expect(() => layer.setData({ url: '/wmts' })).toThrow('layer')
    expect(() => layer.setData({ url: '/wmts', layer: 'grid' })).toThrow('tileMatrixSet')

    layer.setData({
      url: '/wmts',
      layer: 'grid',
      tileMatrixSet: 'EPSG:3857',
      visible: false,
      opacity: 0.5,
      zIndex: 9,
      zooms: [3, 18],
      params: {
        token: 'abc'
      }
    })
    const firstLayer = FakeTileRuntimeLayer.instances[0]
    expect(firstLayer.visible).toBe(false)
    expect(firstLayer.opacity).toBe(0.5)
    expect(firstLayer.zIndex).toBe(9)
    expect(firstLayer.zooms).toEqual([3, 18])
    expect(firstLayer.options.getTileUrl(1, 2, 3)).toContain('LAYER=grid')

    layer.patchStyle({
      visible: true,
      opacity: 0.8
    })
    expect(firstLayer.visible).toBe(true)
    expect(firstLayer.opacity).toBe(0.8)

    layer.setData({
      url: '/wmts/{z}/{x}/{y}.png',
      visible: true
    })
    expect(firstLayer.destroyed).toBe(true)
    expect(FakeTileRuntimeLayer.instances).toHaveLength(2)

    const setMapLayer = createWMTSLayer('wmts-set-map', { AMap, map: {} })
    setMapLayer.setData({ url: '/tiles/{z}/{x}/{y}.png' })
    const fallbackLayer = FakeTileRuntimeLayer.instances[FakeTileRuntimeLayer.instances.length - 1]
    expect(fallbackLayer.map).toEqual({})
    setMapLayer.destroy()
    expect(fallbackLayer.map).toBeNull()

    expect(() => createWMTSLayer('wmts-no-sdk', { AMap: {}, map }).show()).toThrow('TileLayer')
    layer.destroy()
    expect(layer.getInfo().visible).toBe(true)
  })

  test('createLayer covers marker fallback renderers, interaction styles and focus paths', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    const map = {
      added: [],
      removed: [],
      fitViewCalls: [],
      zoomCalls: [],
      add(overlay) {
        this.added.push(overlay)
      },
      remove(overlays) {
        this.removed.push(...(Array.isArray(overlays) ? overlays : [overlays]))
      },
      setFitView(overlays, immediately, padding, maxZoom) {
        this.fitViewCalls.push({ overlays, immediately, padding, maxZoom })
      },
      setZoomAndCenter(zoom, position, immediately) {
        this.zoomCalls.push({ zoom, position, immediately })
      }
    }
    const AMap = {
      Pixel: FakePixel,
      Size: FakeSize,
      Icon: FakeIcon,
      Marker: FakeAMapOverlay,
      Circle: FakeAMapOverlay,
      Polyline: FakeAMapOverlay,
      Polygon: FakeAMapOverlay
    }
    const layer = createLayer('geo-branches', { AMap, map })
    const geoJSON = {
      type: 'FeatureCollection',
      features: [
        pointFeature,
        {
          ...pointFeature,
          id: 'image-no-src',
          properties: {
            id: 'image-no-src',
            name: 'image',
            category: 'image'
          }
        },
        {
          ...pointFeature,
          id: 'html-empty',
          properties: {
            id: 'html-empty',
            name: 'html',
            category: 'html'
          }
        },
        {
          ...pointFeature,
          id: 'circle-point',
          properties: {
            id: 'circle-point',
            name: 'circle',
            category: 'circle'
          }
        },
        {
          ...pointFeature,
          id: 'icon-point',
          properties: {
            id: 'icon-point',
            name: 'icon',
            category: 'icon',
            shortName: 'I'
          }
        },
        {
          type: 'Feature',
          id: 'line-focus',
          properties: {
            id: 'line-focus',
            category: 'route'
          },
          geometry: {
            type: 'LineString',
            coordinates: [[121.5, 31.2], [121.6, 31.3]]
          }
        },
        {
          type: 'Feature',
          id: 'polygon-focus',
          properties: {
            id: 'polygon-focus',
            category: 'area'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [[121.5, 31.2], [121.7, 31.2], [121.7, 31.4], [121.5, 31.2]]
            ]
          }
        },
        {
          type: 'Feature',
          id: 'ignored-invalid',
          properties: {
            id: 'ignored-invalid'
          },
          geometry: {
            type: 'Point',
            coordinates: ['bad', 31.2]
          }
        }
      ]
    }

    layer.setData(geoJSON, {
      point: {
        renderer: 'pin',
        size: 32,
        anchor: 'center',
        textField: 'missing',
        label: {
          visible: true,
          field: 'missing'
        }
      },
      line: {
        strokeColor: '#1677ff'
      },
      polygon: {
        fillColor: '#B6002A'
      },
      categories: {
        image: {
          point: {
            renderer: 'image',
            image: {},
            label: {
              visible: true,
              content: ''
            }
          }
        },
        html: {
          point: {
            renderer: 'html',
            html: '',
            size: [20, 22]
          }
        },
        circle: {
          point: {
            renderer: 'circle',
            radius: 'bad',
            color: '#22c55e'
          }
        },
        icon: {
          point: {
            renderer: 'image',
            image: {
              src: '/icon.png',
              size: [18, 24],
              offset: ['bad', 2]
            },
            label: {
              visible: true,
              field: 'shortName',
              offset: [1, 2]
            }
          }
        }
      }
    }, {
      events: {
        click() {
          throw new Error('event failed')
        },
        hover: jest.fn()
      },
      hoverStyle: {
        point: {
          renderer: 'html',
          html: '<span>hover</span>'
        }
      },
      clickStyle: {
        point: {
          renderer: 'pin',
          color: '#f59e0b'
        }
      }
    })
    layer.show()

    expect(layer.getInfo().featureCount).toBe(8)
    expect(layer.getInfo().overlayCount).toBe(7)
    expect(map.added).toHaveLength(7)
    expect(latestFakeOverlayById('circle-point').options.radius).toBe(500)
    expect(latestFakeOverlayById('icon-point').options.icon.options.image).toBe('http://localhost/icon.png')

    const firstPoint = latestFakeOverlayById('p1')
    firstPoint.handlers.mouseover({
      lnglat: new FakeLngLat(121.5, 31.2),
      pixel: { x: 1, y: 2 }
    })
    expect(layer.getInfo().hoveredFeatureId).toBe('p1')
    firstPoint.handlers.click({
      lnglat: [121.5, 31.2],
      pixel: [3, 4]
    })
    expect(error).toHaveBeenCalled()
    firstPoint.handlers.mouseout({})
    expect(layer.getInfo().hoveredFeatureId).toBeNull()

    expect(layer.setFeatureStyle(null, { point: { color: '#B6002A' } })).toBe(false)
    expect(layer.setFeatureStyle('missing', { point: { color: '#B6002A' } })).toBe(false)
    expect(layer.setFeatureStyle('p1', { point: { renderer: 'html', html: '<b>A</b>', title: 'A' } })).toBe(true)
    expect(layer.clearFeatureStyle('missing')).toBe(false)
    expect(layer.clearFeatureStyle('p1')).toBe(true)
    layer.clearFeatureStyles()

    layer.setCategoryVisible(['image', 'html'], false)
    expect(latestFakeOverlayById('image-no-src').visible).toBe(false)
    layer.setCategoryVisible('image', true)
    layer.setFeaturesVisible(['p1'], false)
    expect(latestFakeOverlayById('p1').visible).toBe(false)
    layer.setFeaturesVisible('p1', true)

    layer.focus('line-focus')
    expect(map.fitViewCalls[0].overlays[0].extData.id).toBe('line-focus')
    layer.focus('p1')
    expect(map.zoomCalls[0].position).toEqual([121.5, 31.2])
    layer.fitView({ padding: [8, 16] })
    expect(map.fitViewCalls[1].padding).toEqual([8, 16, 8, 16])

    layer.destroy()
    expect(map.removed.length).toBeGreaterThan(0)
    error.mockRestore()
  })

  test('createLayer covers heatmap constructor fallback, refresh and unavailable SDK paths', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    class FallbackHeatMap {
      constructor(...args) {
        if (args.length === 2) {
          throw new Error('old signature failed')
        }
        this.options = args[0]
        FallbackHeatMap.instances.push(this)
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
    }
    FallbackHeatMap.instances = []
    FallbackHeatMap.prototype.setDataSet = FallbackHeatMap.prototype.setDataSet

    const map = {
      boundsCalls: [],
      setBounds(bounds, immediately, padding) {
        this.boundsCalls.push({ bounds, immediately, padding })
      }
    }
    const AMap = {
      HeatMap: FallbackHeatMap,
      LngLat: FakeLngLat,
      Bounds: FakeBounds,
      Pixel: FakePixel,
      Marker: FakeAMapOverlay
    }
    const layer = createLayer('heat-branches', { AMap, map })

    layer.setData({
      type: 'FeatureCollection',
      features: [
        pointFeature,
        {
          ...pointFeature,
          id: 'hidden-heat',
          properties: {
            id: 'hidden-heat',
            category: 'hidden',
            value: 'bad'
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

    const heatmap = FallbackHeatMap.instances[0]
    expect(heatmap.dataset.data).toHaveLength(2)
    expect(heatmap.dataset.max).toBe(12)

    layer.show()
    expect(heatmap.visible).toBe(true)
    layer.setCategoryVisible('hidden', false)
    expect(heatmap.dataset.data).toHaveLength(1)
    layer.setFeaturesVisible('p1', false)
    expect(heatmap.dataset.data).toHaveLength(0)
    layer.setFeaturesVisible('p1', true)
    layer.setCategoryVisible('hidden', true)
    layer.fitView({ padding: [4, 12, 20, 28] })
    expect(map.boundsCalls[0].padding).toEqual([4, 12, 20, 28])
    layer.hide()
    expect(heatmap.visible).toBe(false)

    layer.setStyle({
      point: {
        renderer: 'pin'
      }
    })
    expect(heatmap.visible).toBe(false)

    const missingHeatmapLayer = createLayer('heat-missing', {
      AMap: {},
      map: {}
    })
    missingHeatmapLayer.setData(pointFeature, {
      renderer: 'heatmap'
    })
    expect(warn).toHaveBeenCalledWith('[AmapMap] AMap.HeatMap is unavailable in the offline package.')

    warn.mockRestore()
  })
})

describe('toolbar branch coverage', () => {
  test('toolbar default stop factories expose default legends', () => {
    expect(HeatmapToolbar.props.stops.default()).toHaveLength(4)
    expect(CustomerHeatmapToolbar.props.stops.default()).toHaveLength(8)
  })

  test('HeatmapToolbar covers watcher, single stop, empty stop and mounted paths', () => {
    locaActions.setLayerInfo('heat-a', {
      visible: false,
      layerOptions: {
        opacity: 0.56
      }
    })

    const toolbar = createToolbarContext(HeatmapToolbar, {
      layerId: 'heat-a',
      mode: 'loca',
      visible: false,
      opacity: 'bad',
      minOpacity: 10,
      maxOpacity: 90,
      step: 25,
      stops: [{ color: '#B6002A' }]
    })

    expect(toolbar.localOpacity).toBe(80)
    expect(toolbar.gradientCss).toContain('#B6002A 100%')

    HeatmapToolbar.mounted.call(toolbar)
    expect(toolbar.localVisible).toBe(false)
    expect(toolbar.localOpacity).toBe(56)

    HeatmapToolbar.watch.visible.call(toolbar, true)
    HeatmapToolbar.watch.opacity.call(toolbar, 999)
    expect(toolbar.localVisible).toBe(true)
    expect(toolbar.localOpacity).toBe(90)

    toolbar.stops = []
    expect(toolbar.gradientCss).toBe('')

    toolbar.updateOpacity(toolbar.localOpacity + toolbar.step)
    toolbar.updateOpacity(toolbar.localOpacity - toolbar.step)

    expect(locaStore.commandQueue.map((command) => command.type)).toContain('loca:layer:style:patch')
    expect(toolbar.$emit).toHaveBeenCalledWith('opacity-change', 90)
    expect(toolbar.$emit).toHaveBeenCalledWith('opacity-change', 65)
  })

  test('CustomerHeatmapToolbar covers map mode, watchers and mounted paths', () => {
    const toolbar = createToolbarContext(CustomerHeatmapToolbar, {
      layerId: 'customer-a',
      mode: 'map',
      visible: true,
      opacity: 0,
      minOpacity: 10,
      maxOpacity: 80,
      step: 5,
      stops: [null, { color: '#B6002A' }]
    })

    expect(toolbar.localOpacity).toBe(10)
    expect(toolbar.normalizedStops).toEqual([{ color: '#B6002A' }])

    CustomerHeatmapToolbar.watch.visible.call(toolbar, false)
    CustomerHeatmapToolbar.watch.opacity.call(toolbar, 120)
    expect(toolbar.localVisible).toBe(false)
    expect(toolbar.localOpacity).toBe(80)

    CustomerHeatmapToolbar.mounted.call(toolbar)
    toolbar.handleOpacityChange(5)

    expect(mapStore.commandQueue.map((command) => command.type)).toEqual([
      'layer:style:patch',
      'layer:visible',
      'layer:style:patch'
    ])
    expect(toolbar.$emit).toHaveBeenCalledWith('opacity-change', 10)
  })
})
