import { mergeStyle } from '../map/style-resolver'

const GEOMETRY_TYPES = [
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon'
]

const LAYER_TYPE_MAP = {
  point: 'PointLayer',
  points: 'PointLayer',
  scatter: 'ScatterLayer',
  icon: 'IconLayer',
  heatmap: 'HeatMapLayer',
  heat: 'HeatMapLayer',
  grid: 'GridLayer',
  polygon: 'PolygonLayer',
  polygons: 'PolygonLayer',
  line: 'LineLayer',
  lines: 'LineLayer'
}

const DEFAULT_STYLES = {
  point: {
    radius: 7,
    color: '#1677ff',
    borderWidth: 0,
    blurWidth: 0.6
  },
  heatmap: {
    radius: 28,
    unit: 'px',
    height: 0,
    value: (index, feature) => getNumericProperty(feature, 'value', 1),
    gradient: {
      0.2: '#2dd4bf',
      0.5: '#facc15',
      0.8: '#f97316',
      1.0: '#ef4444'
    }
  },
  grid: {
    unit: 'meter',
    radius: 150,
    gap: 0,
    height: 0,
    color: '#1677ff'
  },
  polygon: {
    topColor: '#1677ff',
    bottomColor: '#1677ff',
    sideTopColor: '#1677ff',
    sideBottomColor: '#0f5fd0',
    opacity: 0.38,
    borderColor: '#0f5fd0',
    borderWidth: 1
  },
  line: {
    color: '#1677ff',
    lineWidth: 3,
    opacity: 0.9
  }
}

const RUNTIME_LAYER_OPTION_SETTERS = {
  opacity: 'setOpacity',
  zIndex: 'setzIndex',
  zooms: 'setZooms'
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function isGeometry(geoJSON) {
  return Boolean(geoJSON && GEOMETRY_TYPES.includes(geoJSON.type))
}

function normalizeProperties(defaultProperties, properties) {
  return {
    ...(defaultProperties || {}),
    ...(properties || {})
  }
}

function normalizeGeometryFeature(geometry, index = 0, defaultProperties = {}) {
  const properties = normalizeProperties(defaultProperties, geometry.properties)

  return {
    type: 'Feature',
    id: geometry.id || properties.id || `loca-geometry-${index}`,
    properties,
    geometry
  }
}

function normalizeFeature(feature, index = 0, defaultProperties = {}) {
  if (!feature) return null

  if (feature.type === 'Feature') {
    const properties = normalizeProperties(defaultProperties, feature.properties)

    return {
      ...feature,
      id: feature.id || properties.id || `loca-feature-${index}`,
      properties
    }
  }

  if (isGeometry(feature)) {
    return normalizeGeometryFeature(feature, index, defaultProperties)
  }

  return null
}

function getFeatures(geoJSON, defaultProperties = {}) {
  if (!geoJSON) return []

  if (geoJSON.type === 'FeatureCollection' && Array.isArray(geoJSON.features)) {
    return geoJSON.features
      .map((feature, index) => normalizeFeature(feature, index, defaultProperties))
      .filter(Boolean)
  }

  if (geoJSON.type === 'Feature' || isGeometry(geoJSON)) {
    return [normalizeFeature(geoJSON, 0, defaultProperties)].filter(Boolean)
  }

  if (Array.isArray(geoJSON)) {
    return geoJSON
      .map((feature, index) => normalizeFeature(feature, index, defaultProperties))
      .filter(Boolean)
  }

  return []
}

function createFeatureCollection(features) {
  return {
    type: 'FeatureCollection',
    features
  }
}

function getFeatureProperties(feature) {
  return (feature && feature.properties) || {}
}

function getFeatureId(feature) {
  const properties = getFeatureProperties(feature)
  return feature && feature.id != null ? feature.id : properties.id
}

function getFeatureStyleKey(feature) {
  const id = getFeatureId(feature)
  return id == null ? '' : String(id)
}

function getFeatureName(feature) {
  const properties = getFeatureProperties(feature)
  return properties.name || getFeatureId(feature)
}

function getFeatureCategory(feature) {
  const properties = getFeatureProperties(feature)
  return properties.category == null ? null : String(properties.category)
}

function getGeometryKind(feature) {
  const geometryType = feature && feature.geometry && feature.geometry.type

  if (geometryType === 'Point' || geometryType === 'MultiPoint') return 'point'
  if (geometryType === 'LineString' || geometryType === 'MultiLineString') return 'line'
  if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') return 'polygon'

  return ''
}

function normalizeEventLngLat(lnglat) {
  if (!lnglat) return null
  if (typeof lnglat.toArray === 'function') return lnglat.toArray()
  if (typeof lnglat.getLng === 'function' && typeof lnglat.getLat === 'function') {
    return [lnglat.getLng(), lnglat.getLat()]
  }
  return Array.isArray(lnglat) ? lnglat : null
}

function normalizeEventPixel(pixel) {
  if (!pixel) return null
  if (Array.isArray(pixel)) return pixel

  const x = pixel.x != null
    ? pixel.x
    : (typeof pixel.getX === 'function' ? pixel.getX() : undefined)
  const y = pixel.y != null
    ? pixel.y
    : (typeof pixel.getY === 'function' ? pixel.getY() : undefined)

  return x == null || y == null ? null : [x, y]
}

function getNumericProperty(feature, field, fallback) {
  const value = getFeatureProperties(feature)[field]
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function inferLayerType(features, requestedType) {
  if (requestedType) return String(requestedType)

  const kinds = new Set(features.map(getGeometryKind).filter(Boolean))
  if (kinds.size === 1) return Array.from(kinds)[0]

  return 'point'
}

function getLocaLayerConstructor(Loca, type) {
  const normalizedType = String(type || 'point').toLowerCase()
  const constructorName = LAYER_TYPE_MAP[normalizedType] || LAYER_TYPE_MAP.point
  const LayerConstructor = Loca[constructorName]

  if (typeof LayerConstructor !== 'function') {
    console.warn(`[Loca] ${constructorName} is unavailable in the offline package.`)
    return null
  }

  return {
    constructorName,
    LayerConstructor
  }
}

function splitStyle(inputStyle = {}, inputLayerOptions = {}) {
  const style = isPlainObject(inputStyle) ? inputStyle : {}
  const nestedVisualStyle = isPlainObject(style.style) ? style.style : null
  const nestedLayerOptions = isPlainObject(style.layerOptions) ? style.layerOptions : {}
  const directVisualStyle = { ...style }
  delete directVisualStyle.style
  delete directVisualStyle.layerOptions

  return {
    layerOptions: {
      ...inputLayerOptions,
      ...nestedLayerOptions
    },
    visualStyle: nestedVisualStyle || directVisualStyle
  }
}

function getDefaultStyleKey(type, constructorName) {
  const normalizedType = String(type || '').toLowerCase()
  if (DEFAULT_STYLES[normalizedType]) return normalizedType

  const mappedConstructor = LAYER_TYPE_MAP[normalizedType] || constructorName
  if (mappedConstructor === 'HeatMapLayer') return 'heatmap'
  if (mappedConstructor === 'GridLayer') return 'grid'
  if (mappedConstructor === 'PolygonLayer') return 'polygon'
  if (mappedConstructor === 'LineLayer') return 'line'

  return 'point'
}

function mergeVisualStyle(type, constructorName, visualStyle) {
  const defaultStyleKey = getDefaultStyleKey(type, constructorName)
  const nextVisualStyle = normalizeVisualStyleAliases(defaultStyleKey, visualStyle)

  return mergeStyle(DEFAULT_STYLES[defaultStyleKey] || {}, nextVisualStyle || {})
}

function patchVisualStyle(type, constructorName, currentStyle, stylePatch) {
  const defaultStyleKey = getDefaultStyleKey(type, constructorName)
  const nextVisualStyle = normalizeVisualStyleAliases(defaultStyleKey, stylePatch)

  return mergeStyle(currentStyle || {}, nextVisualStyle || {})
}

function normalizeVisualStyleAliases(defaultStyleKey, visualStyle) {
  if (defaultStyleKey !== 'polygon' || !visualStyle || visualStyle.color === undefined) {
    return visualStyle
  }

  const {
    color,
    ...rest
  } = visualStyle

  return {
    ...rest,
    topColor: rest.topColor === undefined ? color : rest.topColor,
    bottomColor: rest.bottomColor === undefined ? color : rest.bottomColor,
    sideTopColor: rest.sideTopColor === undefined ? color : rest.sideTopColor,
    sideBottomColor: rest.sideBottomColor === undefined ? color : rest.sideBottomColor
  }
}

function addLayer(container, layer) {
  if (!container || !layer) return

  if (typeof container.add === 'function') {
    container.add(layer)
    return
  }

  if (typeof container.addLayer === 'function') {
    container.addLayer(layer)
  }
}

function removeLayer(container, layer) {
  if (!container || !layer) return

  if (typeof container.remove === 'function') {
    container.remove(layer)
    return
  }

  if (typeof container.removeLayer === 'function') {
    container.removeLayer(layer)
    return
  }

  if (typeof layer.destroy === 'function') {
    layer.destroy()
  }
}

function requestRender(container) {
  if (container && typeof container.requestRender === 'function') {
    container.requestRender()
  }
}

function getLayerCategories(features) {
  return Array.from(new Set(
    features
      .map(getFeatureCategory)
      .filter((category) => category != null)
  ))
}

function getLayerGeometryKinds(features) {
  return Array.from(new Set(
    features
      .map(getGeometryKind)
      .filter(Boolean)
  ))
}

function normalizeCategories(category) {
  return (Array.isArray(category) ? category : [category])
    .filter((item) => item != null)
    .map((item) => String(item))
}

function updateHiddenCategories(hiddenCategories, category, visible) {
  normalizeCategories(category).forEach((item) => {
    if (visible) {
      hiddenCategories.delete(item)
    } else {
      hiddenCategories.add(item)
    }
  })
}

function normalizeFeatureIds(featureIds) {
  return (Array.isArray(featureIds) ? featureIds : [featureIds])
    .filter((item) => item != null)
    .map((item) => String(item))
}

function updateHiddenFeatureIds(hiddenFeatureIds, featureIds, visible) {
  normalizeFeatureIds(featureIds).forEach((item) => {
    if (visible) {
      hiddenFeatureIds.delete(item)
    } else {
      hiddenFeatureIds.add(item)
    }
  })
}

function normalizeFitPadding(padding) {
  if (!Array.isArray(padding)) return [80, 80, 80, 80]

  if (padding.length === 2) {
    return [
      Number(padding[0]) || 80,
      Number(padding[1]) || 80,
      Number(padding[0]) || 80,
      Number(padding[1]) || 80
    ]
  }

  return [
    Number(padding[0]) || 80,
    Number(padding[1]) || 80,
    Number(padding[2]) || 80,
    Number(padding[3]) || 80
  ]
}

function collectCoordinates(coordinates, result) {
  if (!Array.isArray(coordinates)) return

  if (coordinates.length >= 2 && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    const lng = Number(coordinates[0])
    const lat = Number(coordinates[1])
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      result.push([lng, lat])
    }
    return
  }

  coordinates.forEach((item) => collectCoordinates(item, result))
}

function createLngLat(AMap, position) {
  return typeof AMap.LngLat === 'function'
    ? new AMap.LngLat(position[0], position[1])
    : position
}

function getFeatureBounds(AMap, features) {
  if (!AMap || typeof AMap.Bounds !== 'function') return null

  const positions = []
  features.forEach((feature) => {
    const geometry = feature.geometry
    if (geometry) {
      collectCoordinates(geometry.coordinates, positions)
    }
  })

  if (!positions.length) return null

  const range = positions.reduce((result, position) => ({
    minLng: Math.min(result.minLng, position[0]),
    minLat: Math.min(result.minLat, position[1]),
    maxLng: Math.max(result.maxLng, position[0]),
    maxLat: Math.max(result.maxLat, position[1])
  }), {
    minLng: positions[0][0],
    minLat: positions[0][1],
    maxLng: positions[0][0],
    maxLat: positions[0][1]
  })

  const padding = 0.0005
  if (range.minLng === range.maxLng) {
    range.minLng -= padding
    range.maxLng += padding
  }
  if (range.minLat === range.maxLat) {
    range.minLat -= padding
    range.maxLat += padding
  }

  return new AMap.Bounds(
    createLngLat(AMap, [range.minLng, range.minLat]),
    createLngLat(AMap, [range.maxLng, range.maxLat])
  )
}

function hasLayerOptionsChanged(left = {}, right = {}) {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return true

  return leftKeys.some((key) => !Object.prototype.hasOwnProperty.call(right, key) || !Object.is(left[key], right[key]))
}

function getChangedLayerOptionKeys(left = {}, right = {}) {
  return Object.keys(left).filter((key) => !Object.is(left[key], right[key]))
}

function canPatchLayerOptions(keys = []) {
  return keys.every((key) => key === 'visible' || RUNTIME_LAYER_OPTION_SETTERS[key])
}

function applyRuntimeLayerOptions(targetLayer, options = {}, keys = []) {
  if (!targetLayer) return

  keys.forEach((key) => {
    if (key === 'visible') {
      if (options.visible === false && typeof targetLayer.hide === 'function') {
        targetLayer.hide()
      } else if (options.visible !== false && typeof targetLayer.show === 'function') {
        targetLayer.show()
      }
      return
    }

    const setter = RUNTIME_LAYER_OPTION_SETTERS[key]
    if (setter && typeof targetLayer[setter] === 'function') {
      targetLayer[setter](options[key])
    }
  })
}

function createFeatureIndex(features) {
  const index = features.reduce((result, feature) => {
    const key = getFeatureStyleKey(feature)
    if (!key) return result

    result[key] = Object.freeze({
      id: getFeatureId(feature),
      name: getFeatureName(feature),
      category: getFeatureCategory(feature),
      geometryKind: getGeometryKind(feature),
      properties: getFeatureProperties(feature)
    })

    return result
  }, {})

  return Object.freeze(index)
}

function hasFeatureStyle(style) {
  return isPlainObject(style) && Object.keys(style).length > 0
}

function getLocaEventCallback(events, type) {
  if (!isPlainObject(events)) return null
  return events[type] || (type === 'mouseover' ? events.hover : null)
}

function getStyleFeatureKey(feature) {
  const properties = getFeatureProperties(feature)
  const id = feature && feature.id != null ? feature.id : properties.id
  return id == null ? '' : String(id)
}

function resolveStyleValue(value, index, feature) {
  return typeof value === 'function' ? value(index, feature) : value
}

function applyFeatureStyleOverrides(visualStyle, featureStyleOverrides) {
  if (!featureStyleOverrides.size) return visualStyle

  const nextStyle = {
    ...(visualStyle || {})
  }
  const keys = new Set(Object.keys(visualStyle || {}))

  keys.forEach((key) => {
    const baseValue = visualStyle && visualStyle[key]
    nextStyle[key] = (index, feature) => {
      const override = featureStyleOverrides.get(getStyleFeatureKey(feature))
      if (override && override[key] !== undefined) {
        return resolveStyleValue(override[key], index, feature)
      }

      return resolveStyleValue(baseValue, index, feature)
    }
  })

  return nextStyle
}

function applyInteractionStyleOverrides(visualStyle, state) {
  if (!state.hoveredFeatureKey && !state.clickedFeatureKey) return visualStyle

  const nextStyle = {
    ...(visualStyle || {})
  }

  Object.keys(visualStyle || {}).forEach((key) => {
    const baseValue = visualStyle && visualStyle[key]
    nextStyle[key] = (index, feature) => {
      const featureKey = getStyleFeatureKey(feature)
      const styleChain = []

      if (state.clickedFeatureKey && state.clickedFeatureKey === featureKey) {
        styleChain.push(state.clickStyle)
      }
      if (state.hoveredFeatureKey && state.hoveredFeatureKey === featureKey) {
        styleChain.push(state.hoverStyle)
      }

      const styleOverride = mergeStyle(...styleChain)
      if (styleOverride && styleOverride[key] !== undefined) {
        return resolveStyleValue(styleOverride[key], index, feature)
      }

      return resolveStyleValue(baseValue, index, feature)
    }
  })

  return nextStyle
}

export function createLocaLayer(layerId, context) {
  const { Loca, AMap, map, container, type: initialType } = context
  let source = null
  let layer = null
  let highlightSource = null
  let highlightLayer = null
  let features = []
  let currentType = initialType || 'point'
  let constructorName = ''
  let visualStyle = {}
  let layerOptions = {}
  let layerEvents = {}
  let hoverStyle = {}
  let clickStyle = {}
  let hoveredFeatureKey = ''
  let clickedFeatureKey = ''
  let visible = false
  const mapEventHandlers = {}
  const hiddenCategories = new Set()
  const hiddenFeatureIds = new Set()
  const featureStyleOverrides = new Map()

  function destroyLayerInstance(targetLayer) {
    if (!targetLayer) return

    removeLayer(container, targetLayer)
    if (typeof targetLayer.destroy === 'function') {
      targetLayer.destroy()
    }
  }

  function clearHighlightLayer() {
    destroyLayerInstance(highlightLayer)
    highlightLayer = null
    highlightSource = null
  }

  function clearLocaLayer() {
    clearHighlightLayer()
    if (!layer) return

    destroyLayerInstance(layer)
    layer = null
    source = null
  }

  function createLayerInstance(options, syncConstructorName = true) {
    const layerCtor = getLocaLayerConstructor(Loca, currentType)
    if (!layerCtor) return null

    if (syncConstructorName) {
      constructorName = layerCtor.constructorName
    }

    return new layerCtor.LayerConstructor({
      map,
      visible,
      ...options
    })
  }

  function getVisibleFeatures() {
    return features.filter((feature) => {
      if (hiddenFeatureIds.has(getFeatureStyleKey(feature))) return false

      const category = getFeatureCategory(feature)
      return category == null || !hiddenCategories.has(category)
    })
  }

  function getResolvedVisualStyle() {
    const styleWithFeatureOverrides = applyFeatureStyleOverrides(visualStyle, featureStyleOverrides)
    return applyInteractionStyleOverrides(styleWithFeatureOverrides, {
      hoveredFeatureKey,
      clickedFeatureKey,
      hoverStyle,
      clickStyle
    })
  }

  function getResolvedHighlightStyle() {
    const highlightStyle = getResolvedVisualStyle()

    if (currentType === 'point' || currentType === 'points' || currentType === 'scatter') {
      return {
        ...highlightStyle,
        radius: highlightStyle.radius || 18,
        color: highlightStyle.color || '#f59e0b',
        blurWidth: highlightStyle.blurWidth == null ? 0.05 : highlightStyle.blurWidth
      }
    }

    return highlightStyle
  }

  function createSourceData() {
    return createFeatureCollection(getVisibleFeatures())
  }

  function updateSourceData() {
    if (!source) return false

    const data = createSourceData()
    if (typeof source.bf === 'function' && typeof source.nf === 'function') {
      source.options = {
        ...(source.options || {}),
        data
      }
      source.dataset = source.bf(data)
      source.status = 'loaded'
      source.nf()
      refreshHighlightLayer()
      requestRender(container)
      return true
    }

    return false
  }

  function getHighlightFeatures() {
    if (!featureStyleOverrides.size) return []

    return getVisibleFeatures().filter((feature) => featureStyleOverrides.has(getFeatureStyleKey(feature)))
  }

  function getHighlightLayerOptions() {
    const zIndex = Number(layerOptions.zIndex)

    return {
      ...layerOptions,
      zIndex: Number.isFinite(zIndex) ? zIndex + 100 : 100,
      opacity: 1,
      blend: 'normal'
    }
  }

  function refreshHighlightLayer() {
    clearHighlightLayer()

    const highlightFeatures = getHighlightFeatures()
    if (!highlightFeatures.length || typeof Loca.GeoJSONSource !== 'function') {
      requestRender(container)
      return
    }

    highlightLayer = createLayerInstance(getHighlightLayerOptions(), false)
    if (!highlightLayer) return

    highlightSource = new Loca.GeoJSONSource({
      data: createFeatureCollection(highlightFeatures)
    })

    highlightLayer.setSource(highlightSource)
    if (typeof highlightLayer.setStyle === 'function') {
      highlightLayer.setStyle(getResolvedHighlightStyle())
    }

    addLayer(container, highlightLayer)
    if (!visible && typeof highlightLayer.hide === 'function') {
      highlightLayer.hide()
    }

    requestRender(container)
  }

  function renderLocaLayer() {
    clearLocaLayer()

    if (typeof Loca.GeoJSONSource !== 'function') {
      console.warn('[Loca] GeoJSONSource is unavailable in the offline package.')
      return
    }

    layer = createLayerInstance(layerOptions)
    if (!layer) return

    source = new Loca.GeoJSONSource({
      data: createSourceData()
    })

    layer.setSource(source)
    if (typeof layer.setStyle === 'function') {
      layer.setStyle(getResolvedVisualStyle())
    }

    addLayer(container, layer)

    if (!visible && typeof layer.hide === 'function') {
      layer.hide()
    }

    refreshHighlightLayer()
    requestRender(container)
  }

  function getEventTypes() {
    if (!isPlainObject(layerEvents)) return []

    return Object.keys(layerEvents).filter((type) => typeof layerEvents[type] === 'function')
  }

  function hasMouseMoveBehavior() {
    return typeof getLocaEventCallback(layerEvents, 'mouseover') === 'function' ||
      typeof getLocaEventCallback(layerEvents, 'mouseout') === 'function' ||
      hasFeatureStyle(hoverStyle)
  }

  function hasClickBehavior() {
    return typeof getLocaEventCallback(layerEvents, 'click') === 'function' ||
      hasFeatureStyle(clickStyle)
  }

  function applyCurrentVisualStyle() {
    if (layer && typeof layer.setStyle === 'function') {
      layer.setStyle(getResolvedVisualStyle())
    }
    refreshHighlightLayer()
    requestRender(container)
  }

  function getPickedFeature(rawFeature) {
    if (!rawFeature) return null
    if (features.includes(rawFeature)) return rawFeature

    const rawProperties = getFeatureProperties(rawFeature)
    const rawId = rawFeature.id != null ? rawFeature.id : rawProperties.id
    if (rawId == null) return null

    const key = String(rawId)
    return getVisibleFeatures().find((feature) => getFeatureStyleKey(feature) === key) || null
  }

  function createEventPayload(type, feature, rawFeature, rawEvent = {}) {
    return {
      type,
      layerId,
      feature,
      featureId: getFeatureId(feature),
      category: getFeatureCategory(feature),
      properties: getFeatureProperties(feature),
      lnglat: normalizeEventLngLat(rawEvent.lnglat),
      pixel: normalizeEventPixel(rawEvent.pixel),
      locaLayer: layer,
      rawFeature,
      rawEvent
    }
  }

  function emitFeatureEvent(type, feature, rawFeature, rawEvent = {}) {
    const callback = getLocaEventCallback(layerEvents, type)
    if (typeof callback !== 'function') return

    const payload = createEventPayload(type, feature, rawFeature, rawEvent)
    try {
      callback(feature, payload)
    } catch (error) {
      console.error(`[Loca] ${layerId} ${type} event callback failed.`, error)
    }
  }

  function handleClick(event = {}) {
    const rawFeature = layer && typeof layer.queryFeature === 'function' && normalizeEventPixel(event.pixel)
      ? layer.queryFeature(normalizeEventPixel(event.pixel))
      : null
    const feature = getPickedFeature(rawFeature)
    if (!feature) return

    const featureKey = getFeatureStyleKey(feature)
    if (hasFeatureStyle(clickStyle) && clickedFeatureKey !== featureKey) {
      clickedFeatureKey = featureKey
      applyCurrentVisualStyle()
    }

    emitFeatureEvent('click', feature, rawFeature, event)
  }

  function handleMouseMove(event = {}) {
    const rawFeature = layer && typeof layer.queryFeature === 'function' && normalizeEventPixel(event.pixel)
      ? layer.queryFeature(normalizeEventPixel(event.pixel))
      : null
    const feature = getPickedFeature(rawFeature)
    const featureKey = feature ? getFeatureStyleKey(feature) : ''
    const previousFeature = hoveredFeatureKey
      ? getVisibleFeatures().find((item) => getFeatureStyleKey(item) === hoveredFeatureKey)
      : null

    if (featureKey === hoveredFeatureKey) return

    if (previousFeature) {
      emitFeatureEvent('mouseout', previousFeature, previousFeature, event)
    }

    hoveredFeatureKey = featureKey

    if (feature) {
      emitFeatureEvent('mouseover', feature, rawFeature, event)
    }

    if (hasFeatureStyle(hoverStyle)) {
      applyCurrentVisualStyle()
    }
  }

  function unbindMapEvents() {
    if (!map || typeof map.off !== 'function') {
      Object.keys(mapEventHandlers).forEach((type) => {
        delete mapEventHandlers[type]
      })
      return
    }

    Object.keys(mapEventHandlers).forEach((type) => {
      map.off(type, mapEventHandlers[type])
      delete mapEventHandlers[type]
    })
  }

  function bindMapEvents() {
    unbindMapEvents()
    if (!map || typeof map.on !== 'function') return

    if (hasClickBehavior()) {
      mapEventHandlers.click = handleClick
      map.on('click', mapEventHandlers.click)
    }

    if (hasMouseMoveBehavior()) {
      mapEventHandlers.mousemove = handleMouseMove
      map.on('mousemove', mapEventHandlers.mousemove)
    }
  }

  return {
    setData(geoJSON, style = {}, options = {}) {
      unbindMapEvents()
      features = getFeatures(geoJSON, options.defaultProperties)
      currentType = inferLayerType(features, options.type)

      const styleParts = splitStyle(style, options.layerOptions)
      layerOptions = styleParts.layerOptions
      constructorName = ''
      visualStyle = mergeVisualStyle(currentType, constructorName, styleParts.visualStyle)
      layerEvents = options.events || {}
      hoverStyle = options.hoverStyle || {}
      clickStyle = options.clickStyle || {}
      hoveredFeatureKey = ''
      clickedFeatureKey = ''
      featureStyleOverrides.clear()

      renderLocaLayer()
      bindMapEvents()
    },

    setStyle(style = {}) {
      const styleParts = splitStyle(style, layerOptions)
      const nextLayerOptions = styleParts.layerOptions
      const changedLayerOptionKeys = getChangedLayerOptionKeys(nextLayerOptions, layerOptions)
      const shouldRecreateLayer = hasLayerOptionsChanged(nextLayerOptions, layerOptions) &&
        !canPatchLayerOptions(changedLayerOptionKeys)
      layerOptions = nextLayerOptions
      visualStyle = mergeVisualStyle(currentType, constructorName, styleParts.visualStyle)
      featureStyleOverrides.clear()

      if (shouldRecreateLayer) {
        renderLocaLayer()
        return
      }

      applyRuntimeLayerOptions(layer, layerOptions, changedLayerOptionKeys)

      if (layer && typeof layer.setStyle === 'function') {
        layer.setStyle(getResolvedVisualStyle())
        refreshHighlightLayer()
        requestRender(container)
      }
    },

    patchStyle(stylePatch = {}) {
      const styleParts = splitStyle(stylePatch, {})
      const nextLayerOptions = mergeStyle(layerOptions, styleParts.layerOptions)
      const changedLayerOptionKeys = getChangedLayerOptionKeys(nextLayerOptions, layerOptions)
      const shouldRecreateLayer = hasLayerOptionsChanged(nextLayerOptions, layerOptions) &&
        !canPatchLayerOptions(changedLayerOptionKeys)
      layerOptions = nextLayerOptions
      visualStyle = patchVisualStyle(currentType, constructorName, visualStyle, styleParts.visualStyle)

      if (shouldRecreateLayer) {
        renderLocaLayer()
        return
      }

      applyRuntimeLayerOptions(layer, layerOptions, changedLayerOptionKeys)

      if (layer && typeof layer.setStyle === 'function') {
        layer.setStyle(getResolvedVisualStyle())
        refreshHighlightLayer()
        requestRender(container)
      }
    },

    show() {
      visible = true
      if (layer && typeof layer.show === 'function') {
        layer.show()
      }
      if (highlightLayer && typeof highlightLayer.show === 'function') {
        highlightLayer.show()
      }
      requestRender(container)
    },

    hide() {
      visible = false
      if (layer && typeof layer.hide === 'function') {
        layer.hide()
      }
      if (highlightLayer && typeof highlightLayer.hide === 'function') {
        highlightLayer.hide()
      }
      requestRender(container)
    },

    setCategoryVisible(category, nextVisible) {
      updateHiddenCategories(hiddenCategories, category, nextVisible)
      if (!updateSourceData()) {
        renderLocaLayer()
      } else {
        refreshHighlightLayer()
      }
    },

    setFeaturesVisible(featureIds, nextVisible) {
      updateHiddenFeatureIds(hiddenFeatureIds, featureIds, nextVisible)
      if (!updateSourceData()) {
        renderLocaLayer()
      } else {
        refreshHighlightLayer()
      }
    },

    setFeatureStyle(featureId, style = {}) {
      if (featureId == null) return false

      const key = String(featureId)
      if (hasFeatureStyle(style)) {
        featureStyleOverrides.set(key, style)
      } else {
        featureStyleOverrides.delete(key)
      }

      if (layer && typeof layer.setStyle === 'function') {
        layer.setStyle(getResolvedVisualStyle())
      }
      refreshHighlightLayer()

      return true
    },

    clearFeatureStyle(featureId) {
      if (featureId == null) return false

      const removed = featureStyleOverrides.delete(String(featureId))
      if (removed && layer && typeof layer.setStyle === 'function') {
        layer.setStyle(getResolvedVisualStyle())
      }
      if (removed) {
        refreshHighlightLayer()
      }

      return removed
    },

    clearFeatureStyles() {
      if (!featureStyleOverrides.size) return

      featureStyleOverrides.clear()
      if (layer && typeof layer.setStyle === 'function') {
        layer.setStyle(getResolvedVisualStyle())
      }
      refreshHighlightLayer()
    },

    fitView(options = {}) {
      if (!features.length || typeof map.setBounds !== 'function') return

      const bounds = getFeatureBounds(AMap, getVisibleFeatures())
      if (!bounds) return

      map.setBounds(bounds, true, normalizeFitPadding(options.padding))
    },

    destroy() {
      unbindMapEvents()
      clearLocaLayer()
      features = []
      visualStyle = {}
      layerOptions = {}
      layerEvents = {}
      hoverStyle = {}
      clickStyle = {}
      hoveredFeatureKey = ''
      clickedFeatureKey = ''
      hiddenCategories.clear()
      hiddenFeatureIds.clear()
      featureStyleOverrides.clear()
    },

    getType() {
      return currentType
    },

    getInfo() {
      return {
        visible,
        type: currentType,
        locaLayer: constructorName,
        featureCount: features.length,
        visibleFeatureCount: getVisibleFeatures().length,
        categories: getLayerCategories(features),
        hiddenCategories: Array.from(hiddenCategories),
        hiddenFeatureIds: Array.from(hiddenFeatureIds),
        styledFeatureIds: Array.from(featureStyleOverrides.keys()),
        eventTypes: getEventTypes(),
        hoveredFeatureId: hoveredFeatureKey || null,
        clickedFeatureId: clickedFeatureKey || null,
        geometryKinds: getLayerGeometryKinds(features),
        style: mergeStyle({}, visualStyle),
        styleSnapshot: mergeStyle({}, visualStyle),
        layerOptions: mergeStyle({}, layerOptions),
        featureIndex: createFeatureIndex(features)
      }
    }
  }
}
