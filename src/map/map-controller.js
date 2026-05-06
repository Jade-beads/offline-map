import { createClusterLayer } from './cluster-layer-registry'
import { createLayer } from './layer-registry'
import { createWMSLayer } from './wms-layer-registry'

const DRAW_OPTIONS = {
  fillColor: '#5f97f0',
  fillOpacity: 0.24,
  strokeColor: '#168eea',
  strokeOpacity: 0.95,
  strokeWeight: 2
}

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
    this.currentDrawShape = ''
    this.drawCompleteHandler = null
  }

  handleCommand(command) {
    if (!command || !command.type) return

    const handlers = {
      'ruler:start': () => this.startRuler(),
      'ruler:clear': () => this.clearRuler(),
      'ruler:restart': () => this.restartRuler(),
      'draw:start': () => this.startDraw(command.payload && command.payload.shape),
      'marker:start': () => this.startCustomMarker(),
      'zoom:in': () => this.zoomIn(),
      'zoom:out': () => this.zoomOut(),
      'map:center-by-coordinate': () => this.centerByCoordinate(command.payload),
      'cluster:render': () => this.renderClusterLayer(command.payload),
      'wms:render': () => this.renderWMSLayer(command.payload),
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

  startDraw(shape) {
    this.clearCustomMarkerHandler()
    this.clearRuler()

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

      const markerId = `custom-${Date.now()}`
      const marker = new this.AMap.Marker({
        position: event.lnglat,
        content: '<div class="custom-map-marker"><span></span></div>',
        offset: new this.AMap.Pixel(-12, -24),
        title: '自定义标点',
        extData: {
          id: markerId,
          type: 'custom-marker',
          position
        }
      })

      this.map.add(marker)
      this.customMarkers.push(marker)
      if (this.actions.setCustomMarkerResult) {
        this.actions.setCustomMarkerResult({
          id: markerId,
          type: 'custom-marker',
          position,
          lng: position[0],
          lat: position[1],
          createdAt: Date.now()
        })
      }
      this.clearCustomMarkerHandler()
      if (this.actions.setActiveTool) {
        this.actions.setActiveTool('')
      }
    }

    this.bindOneMapEvent('click', this.customMarkerHandler)
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
    this.clearCustomMarkerHandler()
    if (this.customMarkers.length) {
      this.map.remove(this.customMarkers)
      this.customMarkers = []
    }
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
    const bounds = getOverlayBounds(overlay)
    const geoJSON = overlayToGeoJSON(shape, overlay, bounds)
    const result = {
      shape,
      geoJSON,
      bounds,
      thumbnail: '',
      thumbnailError: ''
    }

    this.closeMouseTool(false)
    if (this.actions.setActiveTool) {
      this.actions.setActiveTool('')
    }

    window.setTimeout(() => {
      const thumbnailResult = this.captureThumbnail()
      this.actions.setDrawResult({
        ...result,
        ...thumbnailResult
      })
    }, 80)
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
