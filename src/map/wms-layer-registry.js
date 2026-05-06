import { mergeStyle } from './style-resolver'

const DEFAULT_WMS_OPTIONS = {
  blend: false,
  opacity: 1,
  visible: true,
  zIndex: 60,
  zooms: [2, 30],
  param: {
    VERSION: '1.1.1',
    FORMAT: 'image/png',
    TRANSPARENT: true,
    STYLES: ''
  }
}

function getWMSConstructor(AMap) {
  return AMap &&
    AMap.TileLayer &&
    typeof AMap.TileLayer.WMS === 'function'
    ? AMap.TileLayer.WMS
    : null
}

function addLayer(map, layer) {
  if (!map || !layer) return

  if (typeof map.add === 'function') {
    map.add(layer)
    return
  }

  if (typeof layer.setMap === 'function') {
    layer.setMap(map)
  }
}

function removeLayer(map, layer) {
  if (!map || !layer) return

  if (typeof map.remove === 'function') {
    map.remove(layer)
    return
  }

  if (typeof layer.setMap === 'function') {
    layer.setMap(null)
  }
}

function applyOptionSetters(layer, options = {}) {
  if (!layer) return

  if (options.url != null && typeof layer.setUrl === 'function') {
    layer.setUrl(options.url)
  }

  if (options.param && typeof layer.setParams === 'function') {
    layer.setParams(options.param)
  }

  if (options.opacity != null && typeof layer.setOpacity === 'function') {
    layer.setOpacity(options.opacity)
  }

  if (options.zIndex != null && typeof layer.setzIndex === 'function') {
    layer.setzIndex(options.zIndex)
  }

  if (options.zooms && typeof layer.setZooms === 'function') {
    layer.setZooms(options.zooms)
  }
}

function normalizeOptions(input = {}) {
  const {
    layerId,
    style,
    ...rest
  } = input || {}

  return mergeStyle(DEFAULT_WMS_OPTIONS, rest, style || {})
}

export function createWMSLayer(layerId, context) {
  const { AMap, map } = context
  let layer = null
  let options = mergeStyle({}, DEFAULT_WMS_OPTIONS)
  let visible = true
  let added = false

  function destroyLayerInstance() {
    if (!layer) return

    removeLayer(map, layer)
    if (typeof layer.destroy === 'function') {
      layer.destroy()
    }
    layer = null
    added = false
  }

  function createLayerInstance() {
    const WMSLayer = getWMSConstructor(AMap)
    if (!WMSLayer) {
      console.warn('[AmapMap] AMap.TileLayer.WMS is unavailable in the offline package.')
      return null
    }

    if (!options.url) {
      console.warn(`[AmapMap] WMS layer "${layerId}" requires url.`)
      return null
    }

    return new WMSLayer({
      ...options,
      visible
    })
  }

  function ensureLayer() {
    if (layer) return layer

    layer = createLayerInstance()
    if (!layer) return null

    addLayer(map, layer)
    added = true

    if (visible === false && typeof layer.hide === 'function') {
      layer.hide()
    }

    return layer
  }

  function applyOptions(nextOptions) {
    const previousUrl = options.url
    options = nextOptions
    visible = options.visible !== false

    if (!layer || previousUrl !== options.url) {
      destroyLayerInstance()
      ensureLayer()
      return
    }

    applyOptionSetters(layer, options)
    if (visible) {
      if (typeof layer.show === 'function') layer.show()
    } else if (typeof layer.hide === 'function') {
      layer.hide()
    }
  }

  return {
    setData(params = {}) {
      applyOptions(normalizeOptions(params))
    },

    setStyle(style = {}) {
      applyOptions(mergeStyle(options, style || {}))
    },

    patchStyle(stylePatch = {}) {
      applyOptions(mergeStyle(options, stylePatch || {}))
    },

    show() {
      visible = true
      options.visible = true
      const targetLayer = ensureLayer()
      if (targetLayer && typeof targetLayer.show === 'function') {
        targetLayer.show()
      }
    },

    hide() {
      visible = false
      options.visible = false
      if (layer && typeof layer.hide === 'function') {
        layer.hide()
      }
    },

    destroy() {
      destroyLayerInstance()
      options = mergeStyle({}, DEFAULT_WMS_OPTIONS)
      visible = true
    },

    getType() {
      return 'wms'
    },

    getInfo() {
      return {
        type: 'wms',
        visible,
        added,
        url: options.url || '',
        param: mergeStyle({}, options.param || {}),
        opacity: options.opacity,
        zIndex: options.zIndex,
        zooms: Array.isArray(options.zooms) ? [...options.zooms] : options.zooms,
        blend: options.blend,
        styleSnapshot: mergeStyle({}, options)
      }
    }
  }
}
