import { createClusterLayer } from './cluster-layer-registry'
import { createLayer } from './layer-registry'
import { createVectorTileLayer } from './vector-tile-layer-registry'
import { createWMSLayer } from './wms-layer-registry'
import {
  boundsToPlain,
  getOverlayBounds,
  toLngLatArray
} from './utils/coord'
import { scheduleTask } from './utils/dom'
import { overlayToGeoJSON } from './utils/overlay'
import { customMarkerMixin } from './controller-mixins/custom-marker'

const DRAW_OPTIONS = {
  fillColor: '#5f97f0',
  fillOpacity: 0.24,
  strokeColor: '#168eea',
  strokeOpacity: 0.95,
  strokeWeight: 2
}

const DRAW_EDITOR_OPTIONS = {
  editOptions: {
    fillColor: '#5f97f0',
    fillOpacity: 0.2,
    strokeColor: '#f59e0b',
    strokeOpacity: 1,
    strokeWeight: 3
  }
}

const DRAW_EDITOR_EVENTS = ['end', 'adjust', 'move', 'addnode', 'removenode', 'change']

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

  startDraw(shape) {
    this.clearCustomMarkerHandler()
    this.clearRuler()
    this.stopEditDrawOverlay({
      keepActiveTool: true
    })

    const mouseTool = this.getMouseTool()
    if (!mouseTool) {
      this.warnToolUnavailable('AMap.MouseTool')
      return
    }

    this.currentDrawShape = shape
    this.bindDrawCompleteHandler(mouseTool)

    if (shape === 'rectangle') {
      mouseTool.rectangle(DRAW_OPTIONS)
      return
    }

    if (shape === 'circle') {
      mouseTool.circle(DRAW_OPTIONS)
      return
    }

    if (shape === 'polygon') {
      mouseTool.polygon(DRAW_OPTIONS)
    }
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

  getMouseTool() {
    if (typeof this.AMap.MouseTool !== 'function') {
      return null
    }

    if (!this.mouseTool) {
      this.mouseTool = new this.AMap.MouseTool(this.map)
    }

    return this.mouseTool
  }

  bindDrawCompleteHandler(mouseTool) {
    if (!mouseTool || typeof mouseTool.on !== 'function') return

    if (this.drawCompleteHandler) return

    this.drawCompleteHandler = (event) => {
      this.handleDrawComplete(event)
    }
    mouseTool.on('draw', this.drawCompleteHandler)
  }

  clearDrawCompleteHandler() {
    if (!this.mouseTool || !this.drawCompleteHandler || typeof this.mouseTool.off !== 'function') return

    this.mouseTool.off('draw', this.drawCompleteHandler)
    this.drawCompleteHandler = null
  }

  handleDrawComplete(event = {}) {
    const overlay = event.obj
    const shape = this.currentDrawShape || 'unknown'
    const record = this.registerDrawOverlay(shape, overlay)
    const result = this.createDrawResult(record)

    if (!result) return

    this.activeDrawOverlayId = record.id
    this.updateDrawOverlayInfo(record)

    this.closeMouseTool(false)
    if (this.actions.setActiveTool) {
      this.actions.setActiveTool('')
    }

    scheduleTask(() => {
      const thumbnailResult = this.captureThumbnail()
      this.syncDrawResult(record, {
        ...result,
        ...thumbnailResult
      }, 'create')
    }, 80)
  }

  registerDrawOverlay(shape, overlay) {
    if (!overlay) return null

    const id = `draw-${Date.now()}-${this.drawOverlaySeq += 1}`
    const record = {
      id,
      shape,
      overlay,
      editing: false,
      rightClickHandler: null
    }

    if (typeof overlay.setExtData === 'function') {
      const oldExtData = typeof overlay.getExtData === 'function' ? overlay.getExtData() : {}
      overlay.setExtData({
        ...(oldExtData || {}),
        id,
        type: 'draw-overlay',
        shape
      })
    }

    this.bindDrawOverlayContextMenu(record)
    this.drawOverlays.set(id, record)
    return record
  }

  createDrawResult(record) {
    if (!record || !record.overlay) return null

    const bounds = getOverlayBounds(record.overlay)
    const geoJSON = overlayToGeoJSON(record.shape, record.overlay, bounds)
    const result = {
      id: record.id,
      shape: record.shape,
      geoJSON,
      bounds,
      thumbnail: '',
      thumbnailError: ''
    }

    return result
  }

  emitDrawOverlayAction(type, record = null, result = null, extra = {}) {
    if (!this.actions.setDrawOverlayAction) return

    this.actions.setDrawOverlayAction({
      type,
      id: record ? record.id : '',
      shape: record ? record.shape : '',
      result,
      overlayCount: this.drawOverlays.size,
      timestamp: Date.now(),
      ...extra
    })
  }

  syncDrawResult(record, result, actionType) {
    if (this.actions.setDrawResult) {
      this.actions.setDrawResult(result)
    }
    if (actionType) {
      this.emitDrawOverlayAction(actionType, record, result)
    }
  }

  updateDrawResultFromRecord(record, withThumbnail = false, actionType = 'update') {
    const result = this.createDrawResult(record)
    if (!result) return

    if (!withThumbnail) {
      this.syncDrawResult(record, result, actionType)
      return
    }

    scheduleTask(() => {
      const thumbnailResult = this.captureThumbnail()
      this.syncDrawResult(record, {
        ...result,
        ...thumbnailResult
      }, actionType)
    }, 80)
  }

  getDrawOverlayRecord(id) {
    const targetId = id == null || id === ''
      ? this.activeDrawOverlayId
      : String(id)

    if (targetId && this.drawOverlays.has(targetId)) {
      return this.drawOverlays.get(targetId)
    }

    const records = Array.from(this.drawOverlays.values())
    return records.length ? records[records.length - 1] : null
  }

  updateDrawOverlayInfo(record = this.getDrawOverlayRecord()) {
    if (!this.actions.setDrawOverlayInfo) return

    if (!record) {
      this.actions.setDrawOverlayInfo(null)
      return
    }

    this.actions.setDrawOverlayInfo({
      id: record.id,
      shape: record.shape,
      editing: Boolean(record.editing),
      overlayCount: this.drawOverlays.size
    })
  }

  getDrawEditorConstructor(shape) {
    if (shape === 'circle') {
      return typeof this.AMap.CircleEditor === 'function' ? this.AMap.CircleEditor : null
    }

    if (shape === 'rectangle' && typeof this.AMap.RectangleEditor === 'function') {
      return this.AMap.RectangleEditor
    }

    if ((shape === 'rectangle' || shape === 'polygon') && typeof this.AMap.PolygonEditor === 'function') {
      return this.AMap.PolygonEditor
    }

    return null
  }

  startEditDrawOverlay(payload = {}) {
    const record = this.getDrawOverlayRecord(payload && payload.id)
    if (!record) return

    if (this.drawEditor && this.drawEditorOverlayId === record.id) {
      return
    }

    this.stopEditDrawOverlay({
      keepActiveTool: true
    })

    const Editor = this.getDrawEditorConstructor(record.shape)
    if (!Editor) {
      this.warnToolUnavailable(record.shape === 'circle' ? 'AMap.CircleEditor' : 'AMap.PolygonEditor')
      return
    }

    this.activeDrawOverlayId = record.id
    this.drawEditorOverlayId = record.id
    this.drawEditor = new Editor(this.map, record.overlay, DRAW_EDITOR_OPTIONS)

    if (this.drawEditor && typeof this.drawEditor.setTarget === 'function') {
      this.drawEditor.setTarget(record.overlay)
    }

    this.bindDrawEditorEvents(record)

    if (this.drawEditor && typeof this.drawEditor.open === 'function') {
      this.drawEditor.open()
    }

    record.editing = true
    this.updateDrawOverlayInfo(record)
    this.emitDrawOverlayAction('edit-start', record, this.createDrawResult(record))
  }

  bindDrawEditorEvents(record) {
    if (!this.drawEditor || typeof this.drawEditor.on !== 'function') return

    this.drawEditorHandlers = DRAW_EDITOR_EVENTS.map((eventName) => {
      const handler = () => {
        this.updateDrawResultFromRecord(record)
      }
      this.drawEditor.on(eventName, handler)
      return {
        eventName,
        handler
      }
    })
  }

  clearDrawEditorEvents() {
    if (!this.drawEditor || typeof this.drawEditor.off !== 'function') {
      this.drawEditorHandlers = []
      return
    }

    this.drawEditorHandlers.forEach(({ eventName, handler }) => {
      this.drawEditor.off(eventName, handler)
    })
    this.drawEditorHandlers = []
  }

  stopEditDrawOverlay(options = {}) {
    if (!this.drawEditor) return

    const record = this.getDrawOverlayRecord(this.drawEditorOverlayId)
    if (typeof this.drawEditor.close === 'function') {
      this.drawEditor.close()
    }

    this.clearDrawEditorEvents()

    if (typeof this.drawEditor.destroy === 'function') {
      this.drawEditor.destroy()
    }

    this.drawEditor = null
    this.drawEditorOverlayId = ''

    if (record) {
      record.editing = false
      if (!options.skipResultUpdate) {
        this.updateDrawResultFromRecord(record, true, 'edit-stop')
      }
      this.updateDrawOverlayInfo(record)
    }

    if (!options.keepActiveTool && this.actions.setActiveTool) {
      this.actions.setActiveTool('')
    }
  }

  deleteDrawOverlay(payload = {}) {
    const record = this.getDrawOverlayRecord(payload && payload.id)
    if (!record) return
    const deletedResult = this.createDrawResult(record)

    if (this.drawEditorOverlayId === record.id) {
      this.stopEditDrawOverlay({
        keepActiveTool: true,
        skipResultUpdate: true
      })
    }

    this.unbindDrawOverlayContextMenu(record)
    if (typeof this.map.remove === 'function') {
      this.map.remove(record.overlay)
    } else if (record.overlay && typeof record.overlay.setMap === 'function') {
      record.overlay.setMap(null)
    }

    this.drawOverlays.delete(record.id)
    if (this.activeDrawOverlayId === record.id) {
      const records = Array.from(this.drawOverlays.values())
      this.activeDrawOverlayId = records.length ? records[records.length - 1].id : ''
    }

    this.closeContextMenu('drawContextMenu')

    if (this.actions.clearDrawResult) {
      this.actions.clearDrawResult()
    }

    this.updateDrawOverlayInfo()
    this.emitDrawOverlayAction('delete', record, deletedResult)
  }

  clearDrawOverlays(options = {}) {
    const records = Array.from(this.drawOverlays.values())
    const clearedRecords = records.map((record) => ({
      id: record.id,
      shape: record.shape,
      result: this.createDrawResult(record)
    }))

    this.stopEditDrawOverlay({
      keepActiveTool: true,
      skipResultUpdate: true
    })

    this.closeContextMenu('drawContextMenu')

    const overlays = records.map((record) => {
      this.unbindDrawOverlayContextMenu(record)
      return record.overlay
    }).filter(Boolean)

    if (overlays.length && typeof this.map.remove === 'function') {
      this.map.remove(overlays)
    } else {
      overlays.forEach((overlay) => {
        if (overlay && typeof overlay.setMap === 'function') {
          overlay.setMap(null)
        }
      })
    }

    this.drawOverlays.clear()
    this.activeDrawOverlayId = ''
    this.drawContextMenuTargetId = ''

    if (!options.keepResult && this.actions.clearDrawResult) {
      this.actions.clearDrawResult()
    }

    this.updateDrawOverlayInfo(null)
    if (!options.keepResult && clearedRecords.length) {
      this.emitDrawOverlayAction('clear', null, null, {
        id: '',
        shape: '',
        records: clearedRecords,
        ids: clearedRecords.map((record) => record.id),
        overlayCount: 0
      })
    }
  }

  openDrawContextMenu(record, lnglat) {
    const menu = this.createContextMenu('drawContextMenu')
    if (!menu) return

    let index = 0
    const isEditingCurrentOverlay = this.drawEditorOverlayId === record.id && record.editing
    const canEdit = isEditingCurrentOverlay || Boolean(this.getDrawEditorConstructor(record.shape))

    if (isEditingCurrentOverlay) {
      this.addContextMenuItem(menu, 'drawContextMenu', '完成编辑', () => {
        this.stopEditDrawOverlay()
      }, index)
      index += 1
    } else if (canEdit) {
      this.addContextMenuItem(menu, 'drawContextMenu', '编辑图形', () => {
        this.startEditDrawOverlay({
          id: record.id
        })
      }, index)
      index += 1
    }

    this.addContextMenuItem(menu, 'drawContextMenu', '删除图形', () => {
      this.deleteDrawOverlay({
        id: record.id
      })
    }, index)
    index += 1

    if (this.drawOverlays.size > 1) {
      this.addContextMenuItem(menu, 'drawContextMenu', '清空绘图', () => {
        this.clearDrawOverlays()
      }, index)
    }

    if (typeof menu.open === 'function') {
      menu.open(this.map, lnglat)
    }
  }

  bindDrawOverlayContextMenu(record) {
    if (!record || !record.overlay || typeof record.overlay.on !== 'function') return

    record.rightClickHandler = (event = {}) => {
      this.drawContextMenuTargetId = record.id
      this.activeDrawOverlayId = record.id
      this.updateDrawOverlayInfo(record)

      this.openDrawContextMenu(record, event.lnglat)

      const originEvent = event.originEvent || event.originalEvent
      if (originEvent && typeof originEvent.preventDefault === 'function') {
        originEvent.preventDefault()
      }
      if (originEvent && typeof originEvent.stopPropagation === 'function') {
        originEvent.stopPropagation()
      }
    }

    record.overlay.on('rightclick', record.rightClickHandler)
  }

  unbindDrawOverlayContextMenu(record) {
    if (!record || !record.overlay || !record.rightClickHandler || typeof record.overlay.off !== 'function') return

    record.overlay.off('rightclick', record.rightClickHandler)
    record.rightClickHandler = null
  }

  captureThumbnail() {
    const container = typeof this.map.getContainer === 'function'
      ? this.map.getContainer()
      : (typeof this.map.getMapsContainer === 'function' ? this.map.getMapsContainer() : null)
    const canvas = container && container.querySelector ? container.querySelector('canvas') : null

    if (!canvas || typeof canvas.toDataURL !== 'function') {
      return {
        thumbnail: '',
        thumbnailError: 'Map canvas is unavailable.'
      }
    }

    try {
      return {
        thumbnail: canvas.toDataURL('image/png'),
        thumbnailError: ''
      }
    } catch (error) {
      return {
        thumbnail: '',
        thumbnailError: error && error.message ? error.message : 'Failed to capture map canvas.'
      }
    }
  }

  closeMouseTool(ifClear) {
    if (this.mouseTool) {
      this.mouseTool.close(Boolean(ifClear))
    }
  }

  warnToolUnavailable(pluginName) {
    console.warn(`[AmapMap] ${pluginName} is unavailable in the offline package.`)
    if (this.actions.setActiveTool) {
      this.actions.setActiveTool('')
    }
  }
}

Object.assign(MapController.prototype, customMarkerMixin)
