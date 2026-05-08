import { createClusterLayer } from './cluster-layer-registry'
import { createLayer } from './layer-registry'
import { createVectorTileLayer } from './vector-tile-layer-registry'
import { createWMSLayer } from './wms-layer-registry'

const DRAW_OPTIONS = {
  fillColor: '#5f97f0',
  fillOpacity: 0.24,
  strokeColor: '#168eea',
  strokeOpacity: 0.95,
  strokeWeight: 2
}

const DEFAULT_CUSTOM_MARKER_NAME = '自定义锚点'

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

function toLngLatArray(lnglat) {
  if (!lnglat) return null
  if (typeof lnglat.toArray === 'function') return lnglat.toArray()
  if (typeof lnglat.getLng === 'function' && typeof lnglat.getLat === 'function') {
    return [lnglat.getLng(), lnglat.getLat()]
  }
  return Array.isArray(lnglat) ? lnglat : null
}

function normalizePath(path) {
  if (!Array.isArray(path)) return []

  return path
    .map(toLngLatArray)
    .filter((position) => Array.isArray(position) && position.length >= 2)
}

function closeRing(path) {
  if (!path.length) return path

  const first = path[0]
  const last = path[path.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) {
    return path
  }

  return [...path, first]
}

function boundsToPlain(bounds) {
  if (!bounds) return null

  const southWest = typeof bounds.getSouthWest === 'function' ? toLngLatArray(bounds.getSouthWest()) : null
  const northEast = typeof bounds.getNorthEast === 'function' ? toLngLatArray(bounds.getNorthEast()) : null

  if (!southWest || !northEast) return null

  return {
    southWest,
    northEast
  }
}

function getOverlayBounds(overlay) {
  if (!overlay || typeof overlay.getBounds !== 'function') return null

  try {
    return boundsToPlain(overlay.getBounds())
  } catch (error) {
    return null
  }
}

function scheduleTask(callback, delay) {
  const timerHost = typeof window !== 'undefined' && window.setTimeout
    ? window
    : globalThis

  return timerHost.setTimeout(callback, delay)
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function createCustomMarkerContent(name) {
  return `<div class="custom-map-marker" title="${escapeHtml(name)}"><span></span></div>`
}

function getPromptInput(message, defaultValue) {
  const promptFn = typeof window !== 'undefined' && typeof window.prompt === 'function'
    ? window.prompt.bind(window)
    : (typeof globalThis.prompt === 'function' ? globalThis.prompt.bind(globalThis) : null)

  return promptFn ? promptFn(message, defaultValue) : null
}

function getPathFromBounds(bounds) {
  if (!bounds || !bounds.southWest || !bounds.northEast) return []

  const [west, south] = bounds.southWest
  const [east, north] = bounds.northEast

  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south]
  ]
}

function overlayToGeoJSON(shape, overlay, bounds) {
  if (!overlay) return null

  if (shape === 'circle' && typeof overlay.getCenter === 'function') {
    const center = toLngLatArray(overlay.getCenter())
    const radius = typeof overlay.getRadius === 'function' ? overlay.getRadius() : undefined

    return {
      type: 'Feature',
      properties: {
        shape,
        radius
      },
      geometry: {
        type: 'Point',
        coordinates: center
      }
    }
  }

  const path = typeof overlay.getPath === 'function'
    ? closeRing(normalizePath(overlay.getPath()))
    : getPathFromBounds(bounds)

  if (!path.length) return null

  return {
    type: 'Feature',
    properties: {
      shape
    },
    geometry: {
      type: 'Polygon',
      coordinates: [path]
    }
  }
}

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
    if (!payload.layerId) return

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
    if (!payload.layerId) return

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
    if (!payload.layerId) return

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
    if (!payload.layerId) return

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
    if (!payload.layerId) return

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
    if (!payload.layerId) return

    const layer = this.layers.get(payload.layerId)
    if (!layer || !layer.setStyle) return

    layer.setStyle(payload.style)
    this.syncLayerInfo(payload.layerId, layer)
  }

  patchLayerStyle(payload = {}) {
    if (!payload.layerId) return

    const layer = this.layers.get(payload.layerId)
    if (!layer || !layer.patchStyle) return

    layer.patchStyle(payload.stylePatch)
    this.syncLayerInfo(payload.layerId, layer)
  }

  setLayerCategoryVisible(payload = {}) {
    if (!payload.layerId || payload.category == null) return

    const layer = this.layers.get(payload.layerId)
    if (!layer) return

    if (layer.setCategoryVisible) {
      layer.setCategoryVisible(payload.category, payload.visible)
      this.syncLayerInfo(payload.layerId, layer)
    }
  }

  setFeaturesVisible(payload = {}) {
    if (!payload.layerId) return

    const layer = this.layers.get(payload.layerId)
    if (!layer || !layer.setFeaturesVisible) return

    layer.setFeaturesVisible(payload.featureIds, payload.visible)
    this.syncLayerInfo(payload.layerId, layer)
  }

  clearLayer(payload = {}) {
    if (!payload.layerId) return

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
    const prefix = payload.prefix == null ? '' : String(payload.prefix)
    if (!prefix) return

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
    if (!payload.layerId || payload.featureId == null) return

    const layer = this.layers.get(payload.layerId)
    if (layer && layer.setFeatureStyle) {
      layer.setFeatureStyle(payload.featureId, payload.style)
      this.syncLayerInfo(payload.layerId, layer)
    }
  }

  clearFeatureStyle(payload = {}) {
    if (!payload.layerId || payload.featureId == null) return

    const layer = this.layers.get(payload.layerId)
    if (layer && layer.clearFeatureStyle) {
      layer.clearFeatureStyle(payload.featureId)
      this.syncLayerInfo(payload.layerId, layer)
    }
  }

  clearLayerFeatureStyles(payload = {}) {
    if (!payload.layerId) return

    const layer = this.layers.get(payload.layerId)
    if (layer && layer.clearFeatureStyles) {
      layer.clearFeatureStyles()
      this.syncLayerInfo(payload.layerId, layer)
    }
  }

  fitLayerView(payload = {}) {
    if (!payload.layerId) return

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

  startCustomMarker() {
    this.closeMouseTool(false)
    this.clearRuler()
    this.clearCustomMarkerHandler()

    if (typeof this.AMap.Marker !== 'function') {
      this.warnToolUnavailable('AMap.Marker')
      return
    }

    this.customMarkerHandler = (event) => {
      const position = toLngLatArray(event.lnglat)
      if (!position) return

      const markerId = `custom-${Date.now()}-${this.customMarkerSeq += 1}`
      const name = DEFAULT_CUSTOM_MARKER_NAME
      const marker = new this.AMap.Marker({
        position: event.lnglat,
        content: createCustomMarkerContent(name),
        offset: new this.AMap.Pixel(-12, -24),
        title: name,
        label: {
          content: name,
          direction: 'bottom'
        },
        extData: {
          id: markerId,
          type: 'custom-marker',
          name,
          position
        }
      })
      const record = {
        id: markerId,
        type: 'custom-marker',
        name,
        marker,
        position,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        rightClickHandler: null
      }

      this.updateCustomMarkerVisual(record)
      this.map.add(marker)
      this.customMarkers.push(marker)
      this.customMarkerRecords.set(markerId, record)
      this.activeCustomMarkerId = markerId
      this.bindCustomMarkerContextMenu(record)
      this.syncCustomMarkerResult(record)
      this.clearCustomMarkerHandler()
      if (this.actions.setActiveTool) {
        this.actions.setActiveTool('')
      }
    }

    this.bindOneMapEvent('click', this.customMarkerHandler)
  }

  createCustomMarkerResult(record) {
    if (!record) return null

    return {
      id: record.id,
      type: 'custom-marker',
      name: record.name,
      position: record.position,
      lng: record.position[0],
      lat: record.position[1],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }
  }

  syncCustomMarkerResult(record) {
    if (!record || !this.actions.setCustomMarkerResult) return

    this.actions.setCustomMarkerResult(this.createCustomMarkerResult(record))
  }

  getCustomMarkerRecord(id) {
    const targetId = id == null || id === ''
      ? this.activeCustomMarkerId
      : String(id)

    if (targetId && this.customMarkerRecords.has(targetId)) {
      return this.customMarkerRecords.get(targetId)
    }

    const records = Array.from(this.customMarkerRecords.values())
    return records.length ? records[records.length - 1] : null
  }

  updateCustomMarkerVisual(record) {
    if (!record || !record.marker) return

    const extData = typeof record.marker.getExtData === 'function'
      ? record.marker.getExtData()
      : {}
    const nextExtData = {
      ...(extData || {}),
      id: record.id,
      type: 'custom-marker',
      name: record.name,
      position: record.position
    }

    if (typeof record.marker.setExtData === 'function') {
      record.marker.setExtData(nextExtData)
    }
    if (typeof record.marker.setTitle === 'function') {
      record.marker.setTitle(record.name)
    }
    if (typeof record.marker.setContent === 'function') {
      record.marker.setContent(createCustomMarkerContent(record.name))
    }
    if (typeof record.marker.setLabel === 'function') {
      record.marker.setLabel({
        content: record.name,
        direction: 'bottom'
      })
    }
  }

  updateCustomMarkerName(payload = {}) {
    const record = this.getCustomMarkerRecord(payload && payload.id)
    if (!record) return

    const rawName = payload && payload.name != null
      ? payload.name
      : getPromptInput('请输入锚点名称', record.name)

    if (rawName == null) return

    const name = String(rawName).trim()
    if (!name) return

    record.name = name
    record.updatedAt = Date.now()
    this.activeCustomMarkerId = record.id
    this.updateCustomMarkerVisual(record)
    this.syncCustomMarkerResult(record)
  }

  deleteCustomMarker(payload = {}) {
    const record = this.getCustomMarkerRecord(payload && payload.id)
    if (!record) return

    this.unbindCustomMarkerContextMenu(record)
    if (typeof this.map.remove === 'function') {
      this.map.remove(record.marker)
    } else if (record.marker && typeof record.marker.setMap === 'function') {
      record.marker.setMap(null)
    }

    this.customMarkers = this.customMarkers.filter((marker) => marker !== record.marker)
    this.customMarkerRecords.delete(record.id)

    if (this.activeCustomMarkerId === record.id) {
      const records = Array.from(this.customMarkerRecords.values())
      this.activeCustomMarkerId = records.length ? records[records.length - 1].id : ''
    }

    this.closeContextMenu('customMarkerContextMenu')

    if (this.actions.clearCustomMarkerResult) {
      this.actions.clearCustomMarkerResult()
    }
  }

  saveCustomMarker(payload = {}) {
    const record = this.getCustomMarkerRecord(payload && payload.id)
    if (!record || !this.actions.setCustomMarkerSaveRequest) return

    this.activeCustomMarkerId = record.id
    this.syncCustomMarkerResult(record)
    this.actions.setCustomMarkerSaveRequest({
      ...this.createCustomMarkerResult(record),
      requestedAt: Date.now()
    })
  }

  openCustomMarkerContextMenu(record, lnglat) {
    const menu = this.createContextMenu('customMarkerContextMenu')
    if (!menu) return

    this.addContextMenuItem(menu, 'customMarkerContextMenu', '修改名称', () => {
      this.updateCustomMarkerName({
        id: record.id
      })
    }, 0)
    this.addContextMenuItem(menu, 'customMarkerContextMenu', '保存锚点', () => {
      this.saveCustomMarker({
        id: record.id
      })
    }, 1)
    this.addContextMenuItem(menu, 'customMarkerContextMenu', '删除锚点', () => {
      this.deleteCustomMarker({
        id: record.id
      })
    }, 2)

    if (typeof menu.open === 'function') {
      menu.open(this.map, lnglat)
    }
  }

  bindCustomMarkerContextMenu(record) {
    if (!record || !record.marker || typeof record.marker.on !== 'function') return

    record.rightClickHandler = (event = {}) => {
      this.customMarkerContextMenuTargetId = record.id
      this.activeCustomMarkerId = record.id
      this.syncCustomMarkerResult(record)

      this.openCustomMarkerContextMenu(record, event.lnglat)

      const originEvent = event.originEvent || event.originalEvent
      if (originEvent && typeof originEvent.preventDefault === 'function') {
        originEvent.preventDefault()
      }
      if (originEvent && typeof originEvent.stopPropagation === 'function') {
        originEvent.stopPropagation()
      }
    }

    record.marker.on('rightclick', record.rightClickHandler)
  }

  unbindCustomMarkerContextMenu(record) {
    if (!record || !record.marker || !record.rightClickHandler || typeof record.marker.off !== 'function') return

    record.marker.off('rightclick', record.rightClickHandler)
    record.rightClickHandler = null
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

  bindOneMapEvent(type, handler) {
    if (typeof this.map.once === 'function') {
      this.map.once(type, handler)
      return
    }

    const onceHandler = (event) => {
      if (typeof this.map.off === 'function') {
        this.map.off(type, onceHandler)
      }
      handler(event)
    }

    this.customMarkerHandler = onceHandler
    this.map.on(type, onceHandler)
  }

  clearCustomMarkerHandler() {
    if (this.customMarkerHandler) {
      if (typeof this.map.off === 'function') {
        this.map.off('click', this.customMarkerHandler)
      }
      this.customMarkerHandler = null
    }
  }

  warnToolUnavailable(pluginName) {
    console.warn(`[AmapMap] ${pluginName} is unavailable in the offline package.`)
    if (this.actions.setActiveTool) {
      this.actions.setActiveTool('')
    }
  }
}
