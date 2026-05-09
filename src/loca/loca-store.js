import Vue from 'vue'

const DEFAULT_FEATURE_HIGHLIGHT_STYLE = {
  radius: 18,
  color: '#f59e0b',
  borderWidth: 0,
  blurWidth: 0.05
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function assertLayerId(layerId, method) {
  if (!layerId) {
    throw new Error(`locaActions.${method}: layerId 不能为空`)
  }
}

function assertFeatureId(featureId, method) {
  if (featureId == null) {
    throw new Error(`locaActions.${method}: featureId 不能为空`)
  }
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

export const locaStore = Vue.observable({
  commandSeq: 0,
  commandQueue: [],
  layerRegistry: {}
})

export const locaActions = {
  dispatchLocaCommand(type, payload = null) {
    const command = {
      seq: locaStore.commandSeq + 1,
      type,
      payload
    }

    locaStore.commandSeq = command.seq
    locaStore.commandQueue.push(command)
  },

  clearHandledCommands(seq) {
    locaStore.commandQueue = locaStore.commandQueue.filter((command) => command.seq > seq)
  },

  setLayerInfo(layerId, info = {}) {
    assertLayerId(layerId, 'setLayerInfo')

    Vue.set(locaStore.layerRegistry, layerId, {
      layerId,
      ...info
    })
  },

  removeLayerInfo(layerId) {
    assertLayerId(layerId, 'removeLayerInfo')

    Vue.delete(locaStore.layerRegistry, layerId)
  },

  clearLayerInfo() {
    Object.keys(locaStore.layerRegistry).forEach((layerId) => {
      Vue.delete(locaStore.layerRegistry, layerId)
    })
  },

  getLayerList() {
    return Object.keys(locaStore.layerRegistry).map((layerId) => locaStore.layerRegistry[layerId])
  },

  getLayerInfo(layerId) {
    return locaStore.layerRegistry[layerId] || null
  },

  getFeatureInfo(layerId, featureId) {
    const layerInfo = this.getLayerInfo(layerId)
    const featureIndex = layerInfo && layerInfo.featureIndex
    if (!featureIndex || featureId == null) return null

    return featureIndex[String(featureId)] || null
  },

  renderGeoJSONLayer(params, geoJSON) {
    const renderParams = typeof params === 'string'
      ? { layerId: params }
      : params || {}
    const layerId = renderParams.layerId
    assertLayerId(layerId, 'renderGeoJSONLayer')

    this.dispatchLocaCommand('loca:layer:render', {
      layerId,
      geoJSON,
      type: renderParams.type || renderParams.visualType || renderParams.renderer,
      visible: renderParams.visible,
      style: renderParams.style || (geoJSON && (geoJSON.style || (geoJSON.properties && geoJSON.properties.style))),
      layerOptions: renderParams.layerOptions,
      defaultProperties: getRenderDefaultProperties(renderParams)
    })
  },

  setLayerVisible(layerId, visible) {
    assertLayerId(layerId, 'setLayerVisible')

    this.dispatchLocaCommand('loca:layer:visible', {
      layerId,
      visible
    })
  },

  setLayerCategoryVisible(layerId, category, visible) {
    assertLayerId(layerId, 'setLayerCategoryVisible')
    if (category == null) {
      throw new Error('locaActions.setLayerCategoryVisible: category 不能为空')
    }

    this.dispatchLocaCommand('loca:layer:category-visible', {
      layerId,
      category,
      visible
    })
  },

  setFeaturesVisible(layerId, featureIds, visible) {
    assertLayerId(layerId, 'setFeaturesVisible')

    this.dispatchLocaCommand('loca:layer:features-visible', {
      layerId,
      featureIds,
      visible
    })
  },

  setLayerStyle(layerId, style = {}) {
    assertLayerId(layerId, 'setLayerStyle')

    this.dispatchLocaCommand('loca:layer:style', {
      layerId,
      style
    })
  },

  patchLayerStyle(layerId, stylePatch = {}) {
    assertLayerId(layerId, 'patchLayerStyle')

    this.dispatchLocaCommand('loca:layer:style:patch', {
      layerId,
      stylePatch
    })
  },

  setFeatureStyle(layerId, featureId, style = {}) {
    assertLayerId(layerId, 'setFeatureStyle')
    assertFeatureId(featureId, 'setFeatureStyle')

    this.dispatchLocaCommand('loca:layer:feature-style', {
      layerId,
      featureId,
      style
    })
  },

  highlightFeature(layerId, featureId, style = DEFAULT_FEATURE_HIGHLIGHT_STYLE) {
    this.setFeatureStyle(layerId, featureId, style)
  },

  clearFeatureStyle(layerId, featureId) {
    assertLayerId(layerId, 'clearFeatureStyle')
    assertFeatureId(featureId, 'clearFeatureStyle')

    this.dispatchLocaCommand('loca:layer:feature-style:clear', {
      layerId,
      featureId
    })
  },

  clearLayerFeatureStyles(layerId) {
    assertLayerId(layerId, 'clearLayerFeatureStyles')

    this.dispatchLocaCommand('loca:layer:feature-styles:clear', {
      layerId
    })
  },

  fitLayerView(layerId, options = {}) {
    assertLayerId(layerId, 'fitLayerView')

    this.dispatchLocaCommand('loca:layer:fit-view', {
      layerId,
      options
    })
  },

  clearLayer(layerId) {
    assertLayerId(layerId, 'clearLayer')

    this.dispatchLocaCommand('loca:layer:clear', {
      layerId
    })
  },

  clearAllLayers() {
    this.dispatchLocaCommand('loca:layers:clear')
  }
}
