import Vue from 'vue'

const DEFAULT_FEATURE_HIGHLIGHT_STYLE = {
  point: {
    renderer: 'pin',
    color: '#f59e0b',
    size: 36,
    zIndex: 120
  },
  line: {
    strokeColor: '#f59e0b',
    strokeOpacity: 1,
    strokeWeight: 6,
    zIndex: 120
  },
  polygon: {
    fillColor: '#f59e0b',
    fillOpacity: 0.28,
    strokeColor: '#f59e0b',
    strokeOpacity: 1,
    strokeWeight: 4,
    zIndex: 120
  }
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function getRenderDefaultProperties(renderParams) {
  const properties = isPlainObject(renderParams.properties)
    ? { ...renderParams.properties }
    : {}

  if (renderParams.category != null) {
    properties.category = renderParams.category
  }

  return Object.keys(properties).length ? properties : undefined
}

export const mapStore = Vue.observable({
  activeTool: '',
  commandSeq: 0,
  commandQueue: [],
  layerRegistry: {},
  drawResult: null,
  customMarkerResult: null,
  viewport: {
    center: [117.2272, 31.8206],
    zoom: 11,
    bounds: null
  }
})

export const mapActions = {
  setActiveTool(toolId) {
    mapStore.activeTool = toolId
  },

  dispatchMapCommand(type, payload = null) {
    const command = {
      seq: mapStore.commandSeq + 1,
      type,
      payload
    }

    mapStore.commandSeq = command.seq
    mapStore.commandQueue.push(command)
  },

  clearHandledCommands(seq) {
    mapStore.commandQueue = mapStore.commandQueue.filter((command) => command.seq > seq)
  },

  setDrawResult(result) {
    mapStore.drawResult = result
  },

  clearDrawResult() {
    mapStore.drawResult = null
  },

  setCustomMarkerResult(result) {
    mapStore.customMarkerResult = result
  },

  clearCustomMarkerResult() {
    mapStore.customMarkerResult = null
  },

  setLayerInfo(layerId, info = {}) {
    if (!layerId) return

    Vue.set(mapStore.layerRegistry, layerId, {
      layerId,
      ...info
    })
  },

  removeLayerInfo(layerId) {
    if (!layerId) return

    Vue.delete(mapStore.layerRegistry, layerId)
  },

  clearLayerInfo() {
    Object.keys(mapStore.layerRegistry).forEach((layerId) => {
      Vue.delete(mapStore.layerRegistry, layerId)
    })
  },

  getLayerList() {
    return Object.keys(mapStore.layerRegistry).map((layerId) => mapStore.layerRegistry[layerId])
  },

  getLayerInfo(layerId) {
    return mapStore.layerRegistry[layerId] || null
  },

  getFeatureInfo(layerId, featureId) {
    const layerInfo = this.getLayerInfo(layerId)
    const featureIndex = layerInfo && layerInfo.featureIndex
    if (!featureIndex || featureId == null) return null

    return featureIndex[String(featureId)] || null
  },

  activateRuler() {
    mapStore.activeTool = 'ruler'
    this.dispatchMapCommand('ruler:start')
  },

  clearRuler() {
    mapStore.activeTool = ''
    this.dispatchMapCommand('ruler:clear')
  },

  restartRuler() {
    mapStore.activeTool = 'ruler'
    this.dispatchMapCommand('ruler:restart')
  },

  activateDraw(shape) {
    mapStore.activeTool = `draw:${shape}`
    this.dispatchMapCommand('draw:start', { shape })
  },

  activateCustomMarker() {
    mapStore.activeTool = 'custom-marker'
    this.clearCustomMarkerResult()
    this.dispatchMapCommand('marker:start')
  },

  zoomIn() {
    this.dispatchMapCommand('zoom:in')
  },

  zoomOut() {
    this.dispatchMapCommand('zoom:out')
  },

  searchCoordinate(keyword) {
    this.dispatchMapCommand('map:center-by-coordinate', {
      keyword
    })
  },

  setLayerVisible(layerId, visible) {
    this.dispatchMapCommand('layer:visible', {
      layerId,
      visible
    })
  },

  setLayerStyle(layerId, style = {}) {
    if (!layerId) return

    this.dispatchMapCommand('layer:style', {
      layerId,
      style
    })
  },

  patchLayerStyle(layerId, stylePatch = {}) {
    if (!layerId) return

    this.dispatchMapCommand('layer:style:patch', {
      layerId,
      stylePatch
    })
  },

  setLayerCategoryVisible(layerId, category, visible) {
    this.dispatchMapCommand('layer:category-visible', {
      layerId,
      category,
      visible
    })
  },

  setFeaturesVisible(layerId, featureIds, visible) {
    if (!layerId) return

    this.dispatchMapCommand('layer:features-visible', {
      layerId,
      featureIds,
      visible
    })
  },

  clearLayer(layerId) {
    if (!layerId) return

    this.dispatchMapCommand('layer:clear', {
      layerId
    })
  },

  clearAllLayers() {
    this.dispatchMapCommand('layers:clear')
  },

  clearLayerByPrefix(prefix) {
    if (!prefix) return

    this.dispatchMapCommand('layers:clear-by-prefix', {
      prefix
    })
  },

  setFeatureStyle(layerId, featureId, style = {}) {
    if (!layerId || featureId == null) return

    this.dispatchMapCommand('layer:feature-style', {
      layerId,
      featureId,
      style
    })
  },

  highlightFeature(layerId, featureId, style = DEFAULT_FEATURE_HIGHLIGHT_STYLE) {
    this.setFeatureStyle(layerId, featureId, style)
  },

  clearFeatureStyle(layerId, featureId) {
    if (!layerId || featureId == null) return

    this.dispatchMapCommand('layer:feature-style:clear', {
      layerId,
      featureId
    })
  },

  clearLayerFeatureStyles(layerId) {
    if (!layerId) return

    this.dispatchMapCommand('layer:feature-styles:clear', {
      layerId
    })
  },

  focusFeature(layerId, featureId) {
    if (!layerId || featureId == null) return

    this.dispatchMapCommand('layer:focus', {
      type: layerId,
      id: featureId
    })
  },

  fitLayerView(layerId, options = {}) {
    if (!layerId) return

    this.dispatchMapCommand('layer:fit-view', {
      layerId,
      options
    })
  },

  renderGeoJSONLayer(params, geoJSON) {
    const renderParams = typeof params === 'string'
      ? { layerId: params }
      : params || {}
    const layerId = renderParams.layerId

    if (!layerId) {
      return
    }

    this.dispatchMapCommand('layer:render', {
      layerId,
      geoJSON,
      visible: renderParams.visible,
      style: renderParams.style || (geoJSON && (geoJSON.style || (geoJSON.properties && geoJSON.properties.style))),
      events: renderParams.events,
      hoverStyle: renderParams.hoverStyle,
      clickStyle: renderParams.clickStyle,
      defaultProperties: getRenderDefaultProperties(renderParams)
    })

    if (renderParams.selection) {
      this.dispatchMapCommand('layer:focus', renderParams.selection)
    }
  },

  renderGeoJSONClusterLayer(params, geoJSON) {
    const renderParams = typeof params === 'string'
      ? { layerId: params }
      : params || {}
    const layerId = renderParams.layerId

    if (!layerId) {
      return
    }

    this.dispatchMapCommand('cluster:render', {
      layerId,
      geoJSON,
      visible: renderParams.visible,
      style: renderParams.style || {},
      events: renderParams.events,
      defaultProperties: getRenderDefaultProperties(renderParams)
    })

    if (renderParams.selection) {
      this.dispatchMapCommand('layer:focus', renderParams.selection)
    }
  },

  renderWMSLayer(params) {
    const renderParams = typeof params === 'string'
      ? { layerId: params }
      : params || {}
    const layerId = renderParams.layerId

    if (!layerId) {
      return
    }

    this.dispatchMapCommand('wms:render', {
      ...renderParams,
      layerId
    })
  },

  setViewport(viewportPatch) {
    mapStore.viewport = {
      ...mapStore.viewport,
      ...viewportPatch
    }
  }
}
