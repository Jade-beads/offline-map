import { mergeStyle } from './style-resolver'

const TEMPLATE_Z_KEYS = ['{z}', '[z]']
const TEMPLATE_X_KEYS = ['{x}', '[x]']
const TEMPLATE_Y_KEYS = ['{y}', '[y]']

const DEFAULT_WMTS_OPTIONS = {
  opacity: 1,
  visible: true,
  zIndex: 58,
  zooms: [2, 30],
  tileSize: 256,
  version: '1.0.0',
  format: 'image/png',
  style: 'default',
  service: 'WMTS',
  request: 'GetTile'
}

const TILE_LAYER_OPTION_KEYS = [
  'opacity',
  'zIndex',
  'zooms',
  'tileSize',
  'dataZooms'
]

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function hasAnyTemplateKey(url, keys) {
  return keys.some((key) => url.includes(key))
}

function isTemplateUrl(url) {
  const text = String(url || '')
  return hasAnyTemplateKey(text, TEMPLATE_Z_KEYS) &&
    hasAnyTemplateKey(text, TEMPLATE_X_KEYS) &&
    hasAnyTemplateKey(text, TEMPLATE_Y_KEYS)
}

function replaceTileToken(url, keys, value) {
  return keys.reduce((result, key) => result.split(key).join(String(value)), url)
}

function appendQuery(url, params) {
  const query = Object.keys(params)
    .filter((key) => params[key] != null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')

  if (!query) return url

  return `${url}${url.includes('?') ? '&' : '?'}${query}`
}

function pickTileLayerOptions(options) {
  return TILE_LAYER_OPTION_KEYS.reduce((result, key) => {
    if (options[key] !== undefined) {
      result[key] = options[key]
    }
    return result
  }, {})
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
  const normalizedInput = isPlainObject(input) ? input : {}
  const {
    layerId,
    params,
    query,
    dimensions,
    ...rest
  } = normalizedInput
  const options = mergeStyle(DEFAULT_WMTS_OPTIONS, rest)

  options.params = mergeStyle({}, params || {}, query || {}, dimensions || {})
  options.template = isTemplateUrl(options.url)

  if (!options.url) {
    throw new Error('createWMTSLayer: url 不能为空')
  }

  if (!options.template) {
    if (!options.layer) {
      throw new Error('createWMTSLayer: 标准 WMTS 模式必须提供 layer')
    }

    if (!options.tileMatrixSet) {
      throw new Error('createWMTSLayer: 标准 WMTS 模式必须提供 tileMatrixSet')
    }
  }

  return options
}

function getTileMatrix(options, z) {
  if (Array.isArray(options.tileMatrixLabels) && options.tileMatrixLabels[z] != null) {
    return options.tileMatrixLabels[z]
  }

  if (isPlainObject(options.tileMatrixLabels) && options.tileMatrixLabels[z] != null) {
    return options.tileMatrixLabels[z]
  }

  return options.tileMatrixPrefix ? `${options.tileMatrixPrefix}${z}` : z
}

export function buildWMTSTileUrl(options, x, y, z) {
  if (options.template) {
    let url = String(options.url)
    url = replaceTileToken(url, TEMPLATE_Z_KEYS, z)
    url = replaceTileToken(url, TEMPLATE_X_KEYS, x)
    url = replaceTileToken(url, TEMPLATE_Y_KEYS, y)
    return url
  }

  return appendQuery(String(options.url), {
    SERVICE: options.service,
    REQUEST: options.request,
    VERSION: options.version,
    LAYER: options.layer,
    STYLE: options.style,
    TILEMATRIXSET: options.tileMatrixSet,
    TILEMATRIX: getTileMatrix(options, z),
    TILEROW: y,
    TILECOL: x,
    FORMAT: options.format,
    ...options.params
  })
}

export function createWMTSLayer(layerId, context) {
  const { AMap, map } = context
  let layer = null
  let options = mergeStyle({}, DEFAULT_WMTS_OPTIONS)
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
    if (!AMap || typeof AMap.TileLayer !== 'function') {
      throw new Error('createWMTSLayer: 当前 AMap SDK 未提供 AMap.TileLayer')
    }

    return new AMap.TileLayer({
      ...pickTileLayerOptions(options),
      visible,
      getTileUrl(x, y, z) {
        return buildWMTSTileUrl(options, x, y, z)
      }
    })
  }

  function ensureLayer() {
    if (layer) return layer

    layer = createLayerInstance()
    applyOptionSetters(layer, options)
    addLayer(map, layer)
    added = true

    if (visible === false && typeof layer.hide === 'function') {
      layer.hide()
    }

    return layer
  }

  function applyOptions(nextOptions) {
    const previousUrl = options.url
    const previousTemplate = options.template
    const previousLayer = options.layer
    const previousTileMatrixSet = options.tileMatrixSet

    options = normalizeOptions(nextOptions)
    visible = options.visible !== false

    const needsRecreate = !layer ||
      previousUrl !== options.url ||
      previousTemplate !== options.template ||
      previousLayer !== options.layer ||
      previousTileMatrixSet !== options.tileMatrixSet

    if (needsRecreate) {
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
      applyOptions(params)
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
      options = mergeStyle({}, DEFAULT_WMTS_OPTIONS)
      visible = true
    },

    getType() {
      return 'wmts'
    },

    getInfo() {
      return {
        type: 'wmts',
        visible,
        added,
        url: options.url || '',
        template: Boolean(options.template),
        layer: options.layer || '',
        tileMatrixSet: options.tileMatrixSet || '',
        format: options.format,
        style: options.style,
        opacity: options.opacity,
        zIndex: options.zIndex,
        zooms: Array.isArray(options.zooms) ? [...options.zooms] : options.zooms,
        tileSize: options.tileSize,
        param: mergeStyle({}, options.params || {}),
        optionsSnapshot: mergeStyle({}, options)
      }
    }
  }
}
