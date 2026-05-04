import { createLocaLayer } from './loca-layer-registry'

export class LocaController {
  constructor({ Loca, AMap, map, actions }) {
    const Container = Loca && (Loca.Container || Loca)
    if (typeof Container !== 'function') {
      throw new Error('window.Loca does not expose a usable Container.')
    }

    this.Loca = Loca
    this.AMap = AMap
    this.map = map
    this.actions = actions
    this.container = new Container({ map })
    this.layers = new Map()
  }

  handleCommand(command) {
    if (!command || !command.type) return

    const handlers = {
      'loca:layer:render': () => this.renderLayer(command.payload),
      'loca:layer:visible': () => this.setLayerVisible(command.payload),
      'loca:layer:category-visible': () => this.setLayerCategoryVisible(command.payload),
      'loca:layer:features-visible': () => this.setFeaturesVisible(command.payload),
      'loca:layer:style': () => this.setLayerStyle(command.payload),
      'loca:layer:style:patch': () => this.patchLayerStyle(command.payload),
      'loca:layer:feature-style': () => this.setFeatureStyle(command.payload),
      'loca:layer:feature-style:clear': () => this.clearFeatureStyle(command.payload),
      'loca:layer:feature-styles:clear': () => this.clearLayerFeatureStyles(command.payload),
      'loca:layer:fit-view': () => this.fitLayerView(command.payload),
      'loca:layer:clear': () => this.clearLayer(command.payload),
      'loca:layers:clear': () => this.clearAllLayers()
    }

    if (handlers[command.type]) {
      handlers[command.type]()
    }
  }

  renderLayer(payload = {}) {
    if (!payload.layerId) return

    const layerExists = this.layers.has(payload.layerId)
    const layer = this.getLayer(payload.layerId, payload.type)
    layer.setData(payload.geoJSON, payload.style, {
      defaultProperties: payload.defaultProperties,
      layerOptions: payload.layerOptions,
      type: payload.type
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

  setLayerCategoryVisible(payload = {}) {
    if (!payload.layerId || payload.category == null) return

    const layer = this.layers.get(payload.layerId)
    if (!layer || !layer.setCategoryVisible) return

    layer.setCategoryVisible(payload.category, payload.visible)
    this.syncLayerInfo(payload.layerId, layer)
  }

  setFeaturesVisible(payload = {}) {
    if (!payload.layerId) return

    const layer = this.layers.get(payload.layerId)
    if (!layer || !layer.setFeaturesVisible) return

    layer.setFeaturesVisible(payload.featureIds, payload.visible)
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

  setFeatureStyle(payload = {}) {
    if (!payload.layerId || payload.featureId == null) return

    const layer = this.layers.get(payload.layerId)
    if (!layer || !layer.setFeatureStyle) return

    layer.setFeatureStyle(payload.featureId, payload.style)
    this.syncLayerInfo(payload.layerId, layer)
  }

  clearFeatureStyle(payload = {}) {
    if (!payload.layerId || payload.featureId == null) return

    const layer = this.layers.get(payload.layerId)
    if (!layer || !layer.clearFeatureStyle) return

    layer.clearFeatureStyle(payload.featureId)
    this.syncLayerInfo(payload.layerId, layer)
  }

  clearLayerFeatureStyles(payload = {}) {
    if (!payload.layerId) return

    const layer = this.layers.get(payload.layerId)
    if (!layer || !layer.clearFeatureStyles) return

    layer.clearFeatureStyles()
    this.syncLayerInfo(payload.layerId, layer)
  }

  fitLayerView(payload = {}) {
    if (!payload.layerId) return

    const layer = this.layers.get(payload.layerId)
    if (layer && layer.fitView) {
      layer.fitView(payload.options)
    }
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

  destroy() {
    this.clearAllLayers()

    if (this.container && typeof this.container.destroy === 'function') {
      this.container.destroy()
    } else if (this.container && typeof this.container.clear === 'function') {
      this.container.clear()
    }

    if (this.actions.clearLayerInfo) {
      this.actions.clearLayerInfo()
    }

    this.container = null
    this.map = null
  }

  getLayer(layerId, type) {
    const currentLayer = this.layers.get(layerId)
    if (currentLayer && (!type || currentLayer.getType() === type)) {
      return currentLayer
    }

    if (currentLayer) {
      currentLayer.destroy()
      this.layers.delete(layerId)
    }

    const layer = createLocaLayer(layerId, {
      Loca: this.Loca,
      AMap: this.AMap,
      map: this.map,
      container: this.container,
      type
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
}
