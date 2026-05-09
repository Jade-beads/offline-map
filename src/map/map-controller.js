import { createClusterLayer } from './cluster-layer-registry'
import { createLayer } from './layer-registry'
import { createVectorTileLayer } from './vector-tile-layer-registry'
import { createWMSLayer } from './wms-layer-registry'
import { boundsToPlain, toLngLatArray } from './utils/coord'
import { customMarkerMixin } from './controller-mixins/custom-marker'
import { drawMixin } from './controller-mixins/draw'

export class MapController {
  constructor({ AMap, map, actions }) {
    this.AMap = AMap
    this.map = map
    this.actions = actions
    this.layers = new Map()
    this.mouseTool = null
    this.rangingTool = null
    this.customMarkerHandler = null
    this.customMarkers = []
    this.customMarkerRecords = new Map()
    this.customMarkerSeq = 0
    this.activeCustomMarkerId = ''
    this.customMarkerContextMenu = null
    this.customMarkerContextMenuTargetId = ''
    this.currentDrawShape = ''
    this.drawCompleteHandler = null
    this.drawOverlays = new Map()
    this.drawOverlaySeq = 0
    this.activeDrawOverlayId = ''
    this.drawEditor = null
    this.drawEditorOverlayId = ''
    this.drawEditorHandlers = []
    this.drawContextMenu = null
    this.drawContextMenuTargetId = ''
  }

  closeContextMenu(menuKey) {
    const menu = this[menuKey]
    if (menu && typeof menu.close === 'function') {
      menu.close()
    }
    this[menuKey] = null
  }

  createContextMenu(menuKey) {
    this.closeContextMenu(menuKey)

    if (!this.AMap || typeof this.AMap.ContextMenu !== 'function') {
      return null
    }

    const menu = new this.AMap.ContextMenu()
    this[menuKey] = menu
    return menu
  }

  addContextMenuItem(menu, menuKey, label, handler, index) {
    if (!menu || typeof menu.addItem !== 'function') return

    menu.addItem(label, () => {
      this.closeContextMenu(menuKey)
      handler()
    }, index)
  }

  handleCommand(command) {
    if (!command || !command.type) return

    const handlers = {
      'ruler:start': () => this.startRuler(),
      'ruler:clear': () => this.clearRuler(),
      'ruler:restart': () => this.restartRuler(),
      'draw:start': () => this.startDraw(command.payload && command.payload.shape),
      'draw:overlay:clear': () => this.clearDrawOverlays(),
      'draw:overlay:edit-start': () => this.startEditDrawOverlay(command.payload),
      'draw:overlay:edit-stop': () => this.stopEditDrawOverlay(),
      'draw:overlay:delete': () => this.deleteDrawOverlay(command.payload),
      'coordinate-picker:start': () => this.prepareCoordinatePicker(),
      'marker:start': () => this.startCustomMarker(),
      'marker:update-name': () => this.updateCustomMarkerName(command.payload),
      'marker:delete': () => this.deleteCustomMarker(command.payload),
      'marker:save': () => this.saveCustomMarker(command.payload),
      'zoom:in': () => this.zoomIn(),
      'zoom:out': () => this.zoomOut(),
      'map:center-by-coordinate': () => this.centerByCoordinate(command.payload),
      'cluster:render': () => this.renderClusterLayer(command.payload),
      'wms:render': () => this.renderWMSLayer(command.payload),
      'vector-tile:render': () => this.renderVectorTileLayer(command.payload),
      'layer:render': () => this.renderLayer(command.payload),
      'layer:visible': () => this.setLayerVisible(command.payload),
      'layer:style': () => this.setLayerStyle(command.payload),
      'layer:style:patch': () => this.patchLayerStyle(command.payload),
      'layer:category-visible': () => this.setLayerCategoryVisible(command.payload),
      'layer:features-visible': () => this.setFeaturesVisible(command.payload),
      'layer:clear': () => this.clearLayer(command.payload),
      'layers:clear': () => this.clearAllLayers(),
      'layers:clear-by-prefix': () => this.clearLayersByPrefix(command.payload),
      'layer:feature-style': () => this.setFeatureStyle(command.payload),
      'layer:feature-style:clear': () => this.clearFeatureStyle(command.payload),
      'layer:feature-styles:clear': () => this.clearLayerFeatureStyles(command.payload),
      'layer:fit-view': () => this.fitLayerView(command.payload),
      'layer:focus': () => this.focusFeature(command.payload)
    }

    if (handlers[command.type]) {
      handlers[command.type]()
    }
  }

  renderLayer(payload = {}) {
    const layerExists = this.layers.has(payload.layerId)
    const layer = this.getLayer(payload.layerId)
    layer.setData(payload.geoJSON, payload.style, {
      defaultProperties: payload.defaultProperties,
      events: payload.events,
      hoverStyle: payload.hoverStyle,
      clickStyle: payload.clickStyle
    })

    if (payload.visible === false) {
      layer.hide()
      this.syncLayerInfo(payload.layerId, layer)
      return
    }

    if (payload.visible === true || !layerExists) {
      layer.show()
    }

    this.syncLayerInfo(payload.layerId, layer)
  }

  renderClusterLayer(payload = {}) {
    const layerExists = this.layers.has(payload.layerId)
    const layer = this.getClusterLayer(payload.layerId)
    layer.setData(payload.geoJSON, payload.style, {
      defaultProperties: payload.defaultProperties,
      events: payload.events
    })

    if (payload.visible === false) {
      layer.hide()
      this.syncLayerInfo(payload.layerId, layer)
      return
    }

    if (payload.visible === true || !layerExists) {
      layer.show()
    }

    this.syncLayerInfo(payload.layerId, layer)
  }

  renderWMSLayer(payload = {}) {
    const layerExists = this.layers.has(payload.layerId)
    const layer = this.getWMSLayer(payload.layerId)
    layer.setData(payload)

    if (payload.visible === false) {
      layer.hide()
      this.syncLayerInfo(payload.layerId, layer)
      return
    }

    if (payload.visible === true || !layerExists) {
      layer.show()
    }

    this.syncLayerInfo(payload.layerId, layer)
  }

  renderVectorTileLayer(payload = {}) {
    const layerExists = this.layers.has(payload.layerId)
    const layer = this.getVectorTileLayer(payload.layerId)
    layer.setData(payload)

    if (payload.visible === false) {
      layer.hide()
      this.syncLayerInfo(payload.layerId, layer)
      return
    }

    if (payload.visible === true || !layerExists) {
      layer.show()
    }

    this.syncLayerInfo(payload.layerId, layer)
  }

  setLayerVisible(payload = {}) {
    const layer = this.layers.get(payload.layerId)
    if (!layer) return

    if (payload.visible) {
      layer.show()
    } else {
      layer.hide()
    }

    this.syncLayerInfo(payload.layerId, layer)
  }

  setLayerStyle(payload = {}) {
    const layer = this.layers.get(payload.layerId)
    if (!layer || !layer.setStyle) return

    layer.setStyle(payload.style)
    this.syncLayerInfo(payload.layerId, layer)
  }

  patchLayerStyle(payload = {}) {
    const layer = this.layers.get(payload.layerId)
    if (!layer || !layer.patchStyle) return

    layer.patchStyle(payload.stylePatch)
    this.syncLayerInfo(payload.layerId, layer)
  }

  setLayerCategoryVisible(payload = {}) {
    const layer = this.layers.get(payload.layerId)
    if (!layer) return

    if (layer.setCategoryVisible) {
      layer.setCategoryVisible(payload.category, payload.visible)
      this.syncLayerInfo(payload.layerId, layer)
    }
  }

  setFeaturesVisible(payload = {}) {
    const layer = this.layers.get(payload.layerId)
    if (!layer || !layer.setFeaturesVisible) return

    layer.setFeaturesVisible(payload.featureIds, payload.visible)
    this.syncLayerInfo(payload.layerId, layer)
  }

  clearLayer(payload = {}) {
    const layer = this.layers.get(payload.layerId)
    if (!layer) return

    layer.destroy()
    this.layers.delete(payload.layerId)
    this.removeLayerInfo(payload.layerId)
  }

  clearAllLayers() {
    this.layers.forEach((layer, layerId) => {
      layer.destroy()
      this.removeLayerInfo(layerId)
    })
    this.layers.clear()
  }

  clearLayersByPrefix(payload = {}) {
    const prefix = String(payload.prefix)

    Array.from(this.layers.keys())
      .filter((layerId) => String(layerId).startsWith(prefix))
      .forEach((layerId) => {
        const layer = this.layers.get(layerId)
        if (layer) {
          layer.destroy()
        }
        this.layers.delete(layerId)
        this.removeLayerInfo(layerId)
      })
  }

  setFeatureStyle(payload = {}) {
    const layer = this.layers.get(payload.layerId)
    if (layer && layer.setFeatureStyle) {
      layer.setFeatureStyle(payload.featureId, payload.style)
      this.syncLayerInfo(payload.layerId, layer)
    }
  }

  clearFeatureStyle(payload = {}) {
    const layer = this.layers.get(payload.layerId)
    if (layer && layer.clearFeatureStyle) {
      layer.clearFeatureStyle(payload.featureId)
      this.syncLayerInfo(payload.layerId, layer)
    }
  }

  clearLayerFeatureStyles(payload = {}) {
    const layer = this.layers.get(payload.layerId)
    if (layer && layer.clearFeatureStyles) {
      layer.clearFeatureStyles()
      this.syncLayerInfo(payload.layerId, layer)
    }
  }

  fitLayerView(payload = {}) {
    const layer = this.layers.get(payload.layerId)
    if (layer && layer.fitView) {
      layer.fitView(payload.options)
    }
  }

  focusFeature(feature) {
    if (!feature || !feature.type || feature.id == null) return

    const layer = this.layers.get(feature.type)
    if (!layer) return

    if (layer.focus) {
      layer.focus(feature.id)
    }
  }

  centerByCoordinate(payload = {}) {
    const keyword = String(payload.keyword || '').trim()
    const position = keyword.split(',').map((item) => Number(item.trim()))

    if (position.length === 2 && position.every((item) => !Number.isNaN(item))) {
      this.map.setZoomAndCenter(14, position, true)
    }
  }

  startRuler() {
    this.closeMouseTool(false)
    this.clearCustomMarkerHandler()

    if (!this.rangingTool && typeof this.AMap.RangingTool === 'function') {
      this.rangingTool = new this.AMap.RangingTool(this.map, {
        lineOptions: {
          strokeColor: '#168eea',
          strokeWeight: 3,
          strokeOpacity: 0.9
        },
        tmpLineOptions: {
          strokeColor: '#168eea',
          strokeStyle: 'dashed',
          strokeWeight: 2,
          strokeOpacity: 0.8
        },
        startLabelText: '起点'
      })
    }

    if (this.rangingTool) {
      this.rangingTool.turnOn()
      return
    }

    this.warnToolUnavailable('AMap.RangingTool')
  }

  clearRuler() {
    if (this.rangingTool) {
      this.rangingTool.turnOff(true)
    }
  }

  restartRuler() {
    this.closeMouseTool(false)
    this.clearCustomMarkerHandler()
    this.clearRuler()
    this.startRuler()
  }

  prepareCoordinatePicker() {
    this.closeMouseTool(false)
    this.clearRuler()
    this.clearCustomMarkerHandler()
    this.stopEditDrawOverlay({
      keepActiveTool: true
    })
  }

  zoomIn() {
    this.map.zoomIn()
  }

  zoomOut() {
    this.map.zoomOut()
  }

  destroy() {
    this.clearRuler()
    this.closeMouseTool(false)
    this.clearDrawCompleteHandler()
    this.clearDrawOverlays({
      keepResult: true
    })
    this.clearCustomMarkerHandler()
    this.closeContextMenu('customMarkerContextMenu')
    if (this.customMarkers.length) {
      this.customMarkerRecords.forEach((record) => {
        this.unbindCustomMarkerContextMenu(record)
      })
      this.map.remove(this.customMarkers)
      this.customMarkers = []
    }
    this.customMarkerRecords.clear()
    this.activeCustomMarkerId = ''
    this.customMarkerContextMenuTargetId = ''
    this.clearAllLayers()
    this.map.destroy()
  }

  getLayer(layerId) {
    if (!this.layers.has(layerId)) {
      this.layers.set(layerId, createLayer(layerId, {
        AMap: this.AMap,
        map: this.map
      }))
    }

    return this.layers.get(layerId)
  }

  getClusterLayer(layerId) {
    const existingLayer = this.layers.get(layerId)
    if (existingLayer && existingLayer.getType && existingLayer.getType() === 'cluster') {
      return existingLayer
    }

    if (existingLayer && existingLayer.destroy) {
      existingLayer.destroy()
    }

    const layer = createClusterLayer(layerId, {
      AMap: this.AMap,
      map: this.map
    })
    this.layers.set(layerId, layer)

    return layer
  }

  getWMSLayer(layerId) {
    const existingLayer = this.layers.get(layerId)
    if (existingLayer && existingLayer.getType && existingLayer.getType() === 'wms') {
      return existingLayer
    }

    if (existingLayer && existingLayer.destroy) {
      existingLayer.destroy()
    }

    const layer = createWMSLayer(layerId, {
      AMap: this.AMap,
      map: this.map
    })
    this.layers.set(layerId, layer)

    return layer
  }

  getVectorTileLayer(layerId) {
    const existingLayer = this.layers.get(layerId)
    if (existingLayer && existingLayer.getType && existingLayer.getType() === 'vector-tile') {
      return existingLayer
    }

    if (existingLayer && existingLayer.destroy) {
      existingLayer.destroy()
    }

    const layer = createVectorTileLayer(layerId, {
      AMap: this.AMap,
      map: this.map
    })
    this.layers.set(layerId, layer)

    return layer
  }

  syncLayerInfo(layerId, layer) {
    if (!this.actions.setLayerInfo || !layer || !layer.getInfo) return

    this.actions.setLayerInfo(layerId, layer.getInfo())
  }

  removeLayerInfo(layerId) {
    if (this.actions.removeLayerInfo) {
      this.actions.removeLayerInfo(layerId)
    }
  }

  warnToolUnavailable(pluginName) {
    console.warn(`[AmapMap] ${pluginName} is unavailable in the offline package.`)
    if (this.actions.setActiveTool) {
      this.actions.setActiveTool('')
    }
  }
}

Object.assign(MapController.prototype, customMarkerMixin, drawMixin)
