import { mergeStyle } from './style-resolver'

const VECTOR_STYLE_KEYS = ['point', 'line', 'polygon', 'polyhedron']

const DEFAULT_VECTOR_TILE_OPTIONS = {
  opacity: 1,
  visible: true,
  zIndex: 80,
  zooms: [2, 22],
  dataZooms: [2, 18],
  tileSize: 256,
  styles: {}
}

const UPDATE_WITH_SETTER_KEYS = ['opacity', 'zIndex', 'zooms', 'styles', 'visible']

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function getVectorTileConstructor(AMap) {
  return AMap && typeof AMap.MapboxVectorTileLayer === 'function'
    ? AMap.MapboxVectorTileLayer
    : null
}

function normalizeTileUrlTemplate(url) {
  if (url == null) return url

  return String(url)
    .replace(/\{z\}/g, '[z]')
    .replace(/\{x\}/g, '[x]')
    .replace(/\{y\}/g, '[y]')
}

function addLayer(map, layer) {
  if (!map || !layer) return

  if (typeof map.addLayer === 'function') {
    map.addLayer(layer)
    return
  }

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

  if (typeof map.removeLayer === 'function') {
    map.removeLayer(layer)
    return
  }

  if (typeof map.remove === 'function') {
    map.remove(layer)
    return
  }

  if (typeof layer.setMap === 'function') {
    layer.setMap(null)
  }
}

function extractVectorStyles(input = {}) {
  if (!isPlainObject(input)) return {}

  const scopedStyles = VECTOR_STYLE_KEYS.reduce((result, key) => {
    if (input[key] !== undefined) {
      result[key] = input[key]
    }
    return result
  }, {})

  return mergeStyle(input.styles || {}, input.style || {}, scopedStyles)
}

function extractLayerOptions(input = {}, includeUnknown = true) {
  if (!isPlainObject(input)) return {}

  return Object.keys(input).reduce((result, key) => {
    if (
      key === 'layerId' ||
      key === 'style' ||
      key === 'styles' ||
      key === 'events' ||
      key === 'eventOptions' ||
      VECTOR_STYLE_KEYS.includes(key)
    ) {
      return result
    }

    if (!includeUnknown && !Object.prototype.hasOwnProperty.call(DEFAULT_VECTOR_TILE_OPTIONS, key)) {
      return result
    }

    result[key] = input[key]
    return result
  }, {})
}

function normalizeOptions(input = {}) {
  const layerOptions = extractLayerOptions(input)
  const styles = extractVectorStyles(input)
  const nextOptions = mergeStyle(DEFAULT_VECTOR_TILE_OPTIONS, layerOptions)

  if (nextOptions.url != null) {
    nextOptions.url = normalizeTileUrlTemplate(nextOptions.url)
  }

  if (Object.keys(styles).length) {
    nextOptions.styles = styles
  }

  return nextOptions
}

function normalizeStylePatch(stylePatch = {}) {
  const layerOptions = extractLayerOptions(stylePatch, false)
  const styles = extractVectorStyles(stylePatch)

  return {
    layerOptions,
    styles
  }
}

function shallowEqualValue(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false
    if (left.length !== right.length) return false
    return left.every((item, index) => item === right[index])
  }

  return left === right
}

function shouldRecreateLayer(previousOptions = {}, nextOptions = {}) {
  const keys = Array.from(new Set([
    ...Object.keys(previousOptions),
    ...Object.keys(nextOptions)
  ]))

  return keys.some((key) => {
    if (UPDATE_WITH_SETTER_KEYS.includes(key)) return false
    return !shallowEqualValue(previousOptions[key], nextOptions[key])
  })
}

function applyOptionSetters(layer, options = {}) {
  if (!layer) return

  if (options.styles && typeof layer.setStyles === 'function') {
    layer.setStyles(options.styles)
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

function getEventOption(type, eventOptions) {
  if (!isPlainObject(eventOptions)) return undefined
  const option = eventOptions[type]
  return option === undefined ? eventOptions.default : option
}

function getSourceLayers(styles = {}) {
  if (!isPlainObject(styles)) return []

  return VECTOR_STYLE_KEYS
    .map((key) => styles[key] && styles[key].sourceLayer)
    .filter((sourceLayer, index, list) => sourceLayer && list.indexOf(sourceLayer) === index)
}

export function createVectorTileLayer(layerId, context) {
  const { AMap, map } = context
  let layer = null
  let options = mergeStyle({}, DEFAULT_VECTOR_TILE_OPTIONS)
  let visible = true
  let added = false
  let events = {}
  let eventOptions = {}
  let eventBindings = []

  function unbindEvents() {
    if (!layer || typeof layer.off !== 'function') {
      eventBindings = []
      return
    }

    eventBindings.forEach(({ type, handler }) => {
      layer.off(type, handler)
    })
    eventBindings = []
  }

  function bindEvents() {
    if (!layer || typeof layer.on !== 'function' || !isPlainObject(events)) return

    eventBindings = Object.keys(events)
      .filter((type) => typeof events[type] === 'function')
      .map((type) => {
        const handler = events[type]
        layer.on(type, handler, getEventOption(type, eventOptions))
        return { type, handler }
      })
  }

  function destroyLayerInstance() {
    if (!layer) return

    unbindEvents()
    removeLayer(map, layer)
    if (typeof layer.destroy === 'function') {
      layer.destroy()
    }
    layer = null
    added = false
  }

  function createLayerInstance() {
    const VectorTileLayer = getVectorTileConstructor(AMap)
    if (!VectorTileLayer) {
      console.warn('[AmapMap] AMap.MapboxVectorTileLayer is unavailable in the current AMap SDK.')
      return null
    }

    if (!options.url) {
      console.warn(`[AmapMap] vector tile layer "${layerId}" requires url.`)
      return null
    }

    return new VectorTileLayer({
      ...options,
      visible
    })
  }

  function ensureLayer() {
    if (layer) return layer

    layer = createLayerInstance()
    if (!layer) return null

    applyOptionSetters(layer, options)
    addLayer(map, layer)
    added = true
    bindEvents()

    if (visible === false && typeof layer.hide === 'function') {
      layer.hide()
    }

    return layer
  }

  function applyVisibility() {
    if (!layer) return

    if (visible) {
      if (typeof layer.show === 'function') layer.show()
    } else if (typeof layer.hide === 'function') {
      layer.hide()
    }
  }

  function applyOptions(nextOptions, meta = {}) {
    const resolvedOptions = isPlainObject(nextOptions)
      ? nextOptions
      : mergeStyle({}, options || DEFAULT_VECTOR_TILE_OPTIONS)
    const previousOptions = options
    const eventsChanged = Boolean(meta.eventsChanged)

    options = resolvedOptions
    visible = options.visible !== false

    const needsRecreate = !layer ||
      shouldRecreateLayer(previousOptions, options) ||
      (eventsChanged && layer && typeof layer.off !== 'function')

    if (needsRecreate) {
      destroyLayerInstance()
      ensureLayer()
      return
    }

    applyOptionSetters(layer, options)

    if (eventsChanged) {
      unbindEvents()
      bindEvents()
    }

    applyVisibility()
  }

  return {
    setData(params = {}) {
      const nextEvents = isPlainObject(params.events) ? params.events : {}
      const nextEventOptions = isPlainObject(params.eventOptions) ? params.eventOptions : {}
      const eventsChanged = nextEvents !== events || nextEventOptions !== eventOptions

      events = nextEvents
      eventOptions = nextEventOptions

      applyOptions(normalizeOptions(params), {
        eventsChanged
      })
    },

    setStyle(style = {}) {
      applyOptions({
        ...options,
        styles: mergeStyle({}, style || {})
      })
    },

    patchStyle(stylePatch = {}) {
      const normalizedPatch = normalizeStylePatch(stylePatch)
      applyOptions(mergeStyle(options, normalizedPatch.layerOptions, {
        styles: mergeStyle(options.styles || {}, normalizedPatch.styles)
      }))
    },

    reload() {
      if (layer && typeof layer.reload === 'function') {
        layer.reload()
        return
      }

      destroyLayerInstance()
      ensureLayer()
    },

    filterByRect(rect, type = 'all') {
      if (!layer || typeof layer.filterByRect !== 'function') return []

      return layer.filterByRect(rect, type)
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
      options = mergeStyle({}, DEFAULT_VECTOR_TILE_OPTIONS)
      visible = true
      events = {}
      eventOptions = {}
    },

    getType() {
      return 'vector-tile'
    },

    getInfo() {
      return {
        type: 'vector-tile',
        visible,
        added,
        url: options.url || '',
        opacity: options.opacity,
        zIndex: options.zIndex,
        zooms: Array.isArray(options.zooms) ? [...options.zooms] : options.zooms,
        dataZooms: Array.isArray(options.dataZooms) ? [...options.dataZooms] : options.dataZooms,
        tileSize: options.tileSize,
        sourceLayers: getSourceLayers(options.styles),
        eventTypes: Object.keys(events || {}),
        styleSnapshot: mergeStyle({}, options.styles || {}),
        optionsSnapshot: mergeStyle({}, options)
      }
    }
  }
}
