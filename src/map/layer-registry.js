import {
  getFeatureCategory,
  getFeatureId,
  getFeatureName,
  getFeatureProperties,
  getGeometryKind,
  getPropertyValue,
  isHeatmapStyle,
  mergeStyle,
  resolveFeatureStyle,
  resolveHeatmapStyle
} from './style-resolver'

const MARKER_OPTION_KEYS = [
  'anchor',
  'angle',
  'bubble',
  'clickable',
  'cursor',
  'draggable',
  'topWhenClick',
  'visible',
  'zIndex',
  'zooms'
]

const CIRCLE_OPTION_KEYS = [
  'bubble',
  'cursor',
  'draggable',
  'fillColor',
  'fillOpacity',
  'strokeColor',
  'strokeDasharray',
  'strokeOpacity',
  'strokeStyle',
  'strokeWeight',
  'visible',
  'zIndex',
  'zooms'
]

const LINE_OPTION_KEYS = [
  'borderWeight',
  'bubble',
  'cursor',
  'geodesic',
  'isOutline',
  'lineCap',
  'lineJoin',
  'outlineColor',
  'showDir',
  'strokeColor',
  'strokeDasharray',
  'strokeOpacity',
  'strokeStyle',
  'strokeWeight',
  'visible',
  'zIndex',
  'zooms'
]

const POLYGON_OPTION_KEYS = [
  'bubble',
  'cursor',
  'draggable',
  'extrusionHeight',
  'fillColor',
  'fillOpacity',
  'roofColor',
  'strokeColor',
  'strokeDasharray',
  'strokeOpacity',
  'strokeStyle',
  'strokeWeight',
  'visible',
  'wallColor',
  'zIndex',
  'zooms'
]

const HEATMAP_OPTION_KEYS = [
  'gradient',
  'opacity',
  'radius',
  'visible',
  'zIndex',
  'zooms',
  '3d'
]

const GEOMETRY_TYPES = [
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon'
]

const GEOMETRY_STYLE_KEYS = ['point', 'line', 'polygon', 'heatmap']

const OVERLAY_EVENT_TYPES = ['click', 'mouseover', 'mouseout']

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
    id: geometry.id || properties.id || `geometry-${index}`,
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
      id: feature.id || properties.id || `feature-${index}`,
      properties
    }
  }

  if (isGeometry(feature)) {
    return normalizeGeometryFeature(feature, index, defaultProperties)
  }

  return null
}

function getFeatures(geoJSON, defaultProperties = {}) {
  if (!geoJSON) {
    return []
  }

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

function pickDefined(source, keys) {
  return keys.reduce((result, key) => {
    if (source && source[key] !== undefined) {
      result[key] = source[key]
    }
    return result
  }, {})
}

function toNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizePair(value, fallback) {
  if (Array.isArray(value) && value.length >= 2) {
    return [toNumber(value[0], fallback[0]), toNumber(value[1], fallback[1])]
  }

  if (typeof value === 'number') {
    return [value, value]
  }

  return fallback
}

function createPixel(AMap, value) {
  if (!Array.isArray(value) || value.length < 2) return undefined

  const pixel = [toNumber(value[0], 0), toNumber(value[1], 0)]
  return typeof AMap.Pixel === 'function'
    ? new AMap.Pixel(pixel[0], pixel[1])
    : pixel
}

function createSize(AMap, value) {
  const size = normalizePair(value, [28, 28])
  return typeof AMap.Size === 'function'
    ? new AMap.Size(size[0], size[1])
    : size
}

function normalizePosition(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null

  const lng = Number(coordinates[0])
  const lat = Number(coordinates[1])
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null
}

function normalizeLine(coordinates) {
  if (!Array.isArray(coordinates)) return []

  return coordinates
    .map(normalizePosition)
    .filter(Boolean)
}

function normalizePolygon(coordinates) {
  if (!Array.isArray(coordinates)) return []

  return coordinates
    .map(normalizeLine)
    .filter((ring) => ring.length >= 3)
}

function getPointPositions(feature) {
  const geometry = feature && feature.geometry
  if (!geometry) return []

  if (geometry.type === 'Point') {
    const position = normalizePosition(geometry.coordinates)
    return position ? [position] : []
  }

  if (geometry.type === 'MultiPoint') {
    return Array.isArray(geometry.coordinates)
      ? geometry.coordinates.map(normalizePosition).filter(Boolean)
      : []
  }

  return []
}

function getLinePath(feature) {
  const geometry = feature && feature.geometry
  if (!geometry) return null

  if (geometry.type === 'LineString') {
    const path = normalizeLine(geometry.coordinates)
    return path.length >= 2 ? path : null
  }

  if (geometry.type === 'MultiLineString') {
    const path = Array.isArray(geometry.coordinates)
      ? geometry.coordinates.map(normalizeLine).filter((line) => line.length >= 2)
      : []
    return path.length ? path : null
  }

  return null
}

function getPolygonPath(feature) {
  const geometry = feature && feature.geometry
  if (!geometry) return null

  if (geometry.type === 'Polygon') {
    const path = normalizePolygon(geometry.coordinates)
    return path.length ? path : null
  }

  if (geometry.type === 'MultiPolygon') {
    const path = Array.isArray(geometry.coordinates)
      ? geometry.coordinates.map(normalizePolygon).filter((polygon) => polygon.length)
      : []
    return path.length ? path : null
  }

  return null
}

function createFeatureExtData(feature, extra = {}) {
  return {
    ...getFeatureProperties(feature),
    ...extra,
    id: getFeatureId(feature),
    category: getFeatureCategory(feature),
    feature
  }
}

function getOverlayCategory(overlay) {
  const extData = overlay.getExtData && overlay.getExtData()
  if (!extData || extData.category == null) {
    return null
  }

  return String(extData.category)
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

function shouldShowOverlay(overlay, visible, hiddenCategories, hiddenFeatureIds) {
  const category = getOverlayCategory(overlay)
  return visible &&
    !hiddenFeatureIds.has(getOverlayFeatureKey(overlay)) &&
    (category == null || !hiddenCategories.has(category))
}

function applyOverlayVisibility(overlays, visible, hiddenCategories, hiddenFeatureIds) {
  overlays.forEach((overlay) => {
    if (shouldShowOverlay(overlay, visible, hiddenCategories, hiddenFeatureIds)) {
      overlay.show()
    } else {
      overlay.hide()
    }
  })
}

function resolveAssetUrl(src) {
  if (!src) return ''

  return new URL(String(src), window.location.origin).toString()
}

function createMarkerLabel(AMap, style, feature) {
  const label = style.label
  if (!label || label.visible === false) return null

  const properties = getFeatureProperties(feature)
  const content = label.content != null
    ? label.content
    : getPropertyValue(properties, label.field)

  if (content == null || content === '') return null

  return {
    content: String(content),
    direction: label.direction || 'right',
    offset: createPixel(AMap, label.offset)
  }
}

function createImageIcon(AMap, image = {}) {
  const src = image.src || image.url
  if (!src) return null

  if (typeof AMap.Icon !== 'function') {
    return resolveAssetUrl(src)
  }

  const size = image.size ? createSize(AMap, image.size) : undefined
  const imageSize = image.imageSize || image.size

  return new AMap.Icon({
    image: resolveAssetUrl(src),
    size,
    imageSize: imageSize ? createSize(AMap, imageSize) : size,
    imageOffset: createPixel(AMap, image.offset)
  })
}

function createPinContent(feature, style) {
  const properties = getFeatureProperties(feature)
  const size = toNumber(style.size, 28)
  const textField = style.textField || style.labelField || 'category'
  const rawText = style.text != null ? style.text : getPropertyValue(properties, textField)
  const text = rawText == null || rawText === '' ? ' ' : String(rawText).slice(0, style.textLength || 1)
  const color = style.color || style.fillColor || '#2a72d4'
  const fontSize = toNumber(style.fontSize, Math.max(11, Math.round(size * 0.46)))

  return `
    <div
      class="geojson-map-marker"
      style="--marker-color: ${color}; width: ${size}px; height: ${size}px; font-size: ${fontSize}px;"
    >
      <span>${text}</span>
    </div>
  `
}

function createMarkerOptions(AMap, feature, position, style) {
  const size = normalizePair(style.size || (style.image && style.image.size), [28, 28])
  const renderer = style.renderer || 'pin'
  const centerOffset = [-size[0] / 2, -size[1] / 2]
  const options = {
    ...pickDefined(style, MARKER_OPTION_KEYS),
    position,
    title: style.title || getFeatureName(feature),
    label: createMarkerLabel(AMap, style, feature),
    extData: createFeatureExtData(feature, { position })
  }

  if (style.offset) {
    options.offset = createPixel(AMap, style.offset)
  } else if (style.anchor === 'center') {
    delete options.anchor
    options.offset = createPixel(AMap, centerOffset)
  } else if (renderer === 'pin' && !style.anchor) {
    options.offset = createPixel(AMap, [-size[0] / 2, -size[1]])
  } else if (renderer === 'image' || renderer === 'html') {
    options.offset = createPixel(AMap, centerOffset)
  }

  return options
}

function createHtmlMarkerContent(style) {
  const content = style.content || style.html
  if (!content) return ''

  const size = normalizePair(style.size, [28, 28])
  return `
    <div
      class="geojson-map-html-marker"
      style="width: ${size[0]}px; height: ${size[1]}px;"
    >
      ${content}
    </div>
  `
}

function applyMarkerStyle(AMap, overlay, feature, style) {
  if (!overlay) return

  const extData = overlay.getExtData && overlay.getExtData()
  const position = (extData && extData.position) ||
    (typeof overlay.getPosition === 'function' ? normalizeEventLngLat(overlay.getPosition()) : undefined)
  const options = createMarkerOptions(AMap, feature, position, style)

  if (typeof overlay.setOptions === 'function') {
    overlay.setOptions(options)
  }

  if (style.renderer === 'image' && typeof overlay.setIcon === 'function') {
    const icon = createImageIcon(AMap, style.image || style)
    if (icon) overlay.setIcon(icon)
  } else if (style.renderer === 'html' && typeof overlay.setContent === 'function') {
    const content = createHtmlMarkerContent(style)
    if (content) overlay.setContent(content)
  } else if (typeof overlay.setContent === 'function') {
    overlay.setContent(createPinContent(feature, style))
  }

  const label = createMarkerLabel(AMap, style, feature)
  if (label && typeof overlay.setLabel === 'function') {
    overlay.setLabel(label)
  }

  if (style.title && typeof overlay.setTitle === 'function') {
    overlay.setTitle(style.title)
  }

  if (options.offset && typeof overlay.setOffset === 'function') {
    overlay.setOffset(options.offset)
  }
}

function applyOverlayStyle(AMap, overlay, feature, kind, style) {
  if (!overlay || !style) return

  if (kind === 'point' && typeof overlay.setRadius !== 'function') {
    applyMarkerStyle(AMap, overlay, feature, style)
    return
  }

  const optionKeys = kind === 'point'
    ? CIRCLE_OPTION_KEYS
    : (kind === 'line' ? LINE_OPTION_KEYS : POLYGON_OPTION_KEYS)
  const options = pickDefined(style, optionKeys)

  if (kind === 'point') {
    const color = style.color || style.fillColor || style.strokeColor || '#2a72d4'
    options.fillColor = style.fillColor || color
    options.strokeColor = style.strokeColor || color
    if (style.radius != null && typeof overlay.setRadius === 'function') {
      overlay.setRadius(toNumber(style.radius, 500))
    }
  }

  if (typeof overlay.setOptions === 'function') {
    overlay.setOptions(options)
  }
}

function createImageMarker(AMap, feature, position, style) {
  const icon = createImageIcon(AMap, style.image || style)
  if (!icon) return createPinMarker(AMap, feature, position, { ...style, renderer: 'pin' })

  return new AMap.Marker({
    ...createMarkerOptions(AMap, feature, position, style),
    icon
  })
}

function createHtmlMarker(AMap, feature, position, style) {
  const content = createHtmlMarkerContent(style)
  if (!content) return createPinMarker(AMap, feature, position, { ...style, renderer: 'pin' })

  return new AMap.Marker({
    ...createMarkerOptions(AMap, feature, position, style),
    content
  })
}

function createPinMarker(AMap, feature, position, style) {
  return new AMap.Marker({
    ...createMarkerOptions(AMap, feature, position, { ...style, renderer: 'pin' }),
    content: createPinContent(feature, style)
  })
}

function createCircleOverlay(AMap, feature, position, style) {
  const color = style.color || style.fillColor || style.strokeColor || '#2a72d4'

  return new AMap.Circle({
    ...pickDefined(style, CIRCLE_OPTION_KEYS),
    center: position,
    radius: toNumber(style.radius, 500),
    fillColor: style.fillColor || color,
    strokeColor: style.strokeColor || color,
    extData: createFeatureExtData(feature, { position })
  })
}

function createPointOverlays(AMap, feature, style) {
  return getPointPositions(feature).map((position) => {
    if (style.renderer === 'image') return createImageMarker(AMap, feature, position, style)
    if (style.renderer === 'circle') return createCircleOverlay(AMap, feature, position, style)
    if (style.renderer === 'html') return createHtmlMarker(AMap, feature, position, style)
    return createPinMarker(AMap, feature, position, style)
  }).filter(Boolean)
}

function createLineOverlay(AMap, feature, style) {
  const path = getLinePath(feature)
  if (!path) return null

  return new AMap.Polyline({
    ...pickDefined(style, LINE_OPTION_KEYS),
    path,
    extData: createFeatureExtData(feature)
  })
}

function createPolygonOverlay(AMap, feature, style) {
  const path = getPolygonPath(feature)
  if (!path) return null

  return new AMap.Polygon({
    ...pickDefined(style, POLYGON_OPTION_KEYS),
    path,
    extData: createFeatureExtData(feature)
  })
}

function createOverlay(AMap, feature, style) {
  const kind = getGeometryKind(feature)

  if (kind === 'point') return createPointOverlays(AMap, feature, style)
  if (kind === 'line') return [createLineOverlay(AMap, feature, style)].filter(Boolean)
  if (kind === 'polygon') return [createPolygonOverlay(AMap, feature, style)].filter(Boolean)

  return []
}

function getScopedStyleOverride(style, kind) {
  if (!isPlainObject(style)) return {}
  if (GEOMETRY_STYLE_KEYS.some((key) => style[key] != null)) {
    return style[kind] || {}
  }
  return style
}

function getFeatureStyleKey(feature) {
  const id = getFeatureId(feature)
  return id == null ? '' : String(id)
}

function getOverlayFeatureKey(overlay) {
  const extData = overlay.getExtData && overlay.getExtData()
  const id = extData && extData.id
  return id == null ? '' : String(id)
}

function hasFeatureStyle(style) {
  return isPlainObject(style) && Object.keys(style).length > 0
}

function getHeatmapConstructor(AMap) {
  const constructor = AMap.HeatMap || AMap.Heatmap

  if (typeof constructor !== 'function') return null
  if (constructor.prototype && typeof constructor.prototype.setDataSet === 'function') {
    return constructor
  }

  return null
}

function createOfficialHeatmap(AMap, map, style, visible) {
  const Heatmap = getHeatmapConstructor(AMap)
  if (!Heatmap) return null

  const options = {
    ...pickDefined(style, HEATMAP_OPTION_KEYS),
    visible
  }

  const attempts = [
    () => new Heatmap(map, options),
    () => new Heatmap({
      ...options,
      map
    })
  ]

  for (let index = 0; index < attempts.length; index += 1) {
    try {
      const heatmap = attempts[index]()
      if (heatmap && typeof heatmap.setDataSet === 'function') {
        return heatmap
      }
    } catch (error) {
      // Try the next constructor signature; offline packages can differ by JSAPI build.
    }
  }

  return null
}

function createHeatmapData(features, style, hiddenCategories, hiddenFeatureIds) {
  const valueField = style.valueField || 'value'
  const data = []

  features.forEach((feature) => {
    if (hiddenFeatureIds.has(getFeatureStyleKey(feature))) return

    const category = getFeatureCategory(feature)
    if (category != null && hiddenCategories.has(category)) return

    const count = toNumber(getPropertyValue(getFeatureProperties(feature), valueField), 0)

    getPointPositions(feature).forEach((position) => {
      data.push({
        lng: position[0],
        lat: position[1],
        count
      })
    })
  })

  return data
}

function getHeatmapMax(data, style) {
  if (style.max != null) return Number(style.max)

  return data.reduce((max, item) => Math.max(max, Number(item.count) || 0), 0)
}

function collectCoordinates(coordinates, result) {
  if (!Array.isArray(coordinates)) return

  if (coordinates.length >= 2) {
    const lng = Number(coordinates[0])
    const lat = Number(coordinates[1])

    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      result.push([lng, lat])
      return
    }
  }

  coordinates.forEach((item) => collectCoordinates(item, result))
}

function createLngLat(AMap, position) {
  return typeof AMap.LngLat === 'function'
    ? new AMap.LngLat(position[0], position[1])
    : position
}

function getFeatureBounds(AMap, targetFeatures) {
  if (!AMap || typeof AMap.Bounds !== 'function') return null

  const positions = []
  targetFeatures.forEach((feature) => {
    const geometry = feature && feature.geometry
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

function focusOverlay(map, overlay) {
  const extData = overlay.getExtData && overlay.getExtData()

  if (extData && extData.position) {
    map.setZoomAndCenter(14, extData.position, true)
    return
  }

  map.setFitView([overlay], true, [80, 80, 80, 80])
}

function normalizeFitPadding(padding) {
  if (!Array.isArray(padding)) {
    return [80, 80, 80, 80]
  }

  if (padding.length === 2) {
    const vertical = toNumber(padding[0], 80)
    const horizontal = toNumber(padding[1], 80)
    return [vertical, horizontal, vertical, horizontal]
  }

  return [
    toNumber(padding[0], 80),
    toNumber(padding[1], 80),
    toNumber(padding[2], 80),
    toNumber(padding[3], 80)
  ]
}

function getFitOverlays(overlays, hiddenCategories, hiddenFeatureIds) {
  return overlays.filter((overlay) => {
    const category = getOverlayCategory(overlay)
    return !hiddenFeatureIds.has(getOverlayFeatureKey(overlay)) && (category == null || !hiddenCategories.has(category))
  })
}

function fitOverlays(map, overlays, options = {}) {
  if (!overlays.length || typeof map.setFitView !== 'function') return

  const immediately = true
  const padding = normalizeFitPadding(options.padding)

  if (options.maxZoom != null) {
    map.setFitView(overlays, immediately, padding, options.maxZoom)
    return
  }

  map.setFitView(overlays, immediately, padding)
}

function fitFeatures(AMap, map, targetFeatures, options = {}) {
  if (!targetFeatures.length || typeof map.setBounds !== 'function') return

  const bounds = getFeatureBounds(AMap, targetFeatures)
  if (!bounds) return

  map.setBounds(bounds, true, normalizeFitPadding(options.padding))
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

function getVisibleFeatures(features, hiddenCategories, hiddenFeatureIds) {
  return features.filter((feature) => {
    if (hiddenFeatureIds.has(getFeatureStyleKey(feature))) return false

    const category = getFeatureCategory(feature)
    return category == null || !hiddenCategories.has(category)
  })
}

function createFeatureIndex(features) {
  return features.reduce((result, feature) => {
    const key = getFeatureStyleKey(feature)
    if (!key) return result

    result[key] = {
      id: getFeatureId(feature),
      name: getFeatureName(feature),
      category: getFeatureCategory(feature),
      geometryKind: getGeometryKind(feature),
      properties: getFeatureProperties(feature)
    }

    return result
  }, {})
}

function makeGeoJSONLayer(layerId, context) {
  const { AMap, map } = context
  let features = []
  let layerStyle = {}
  let overlays = []
  let overlaysAdded = false
  let visible = false
  let heatmap = null
  let heatmapStyle = null
  let layerEvents = {}
  let hoverStyle = {}
  let clickStyle = {}
  let hoveredFeatureKey = ''
  let clickedFeatureKey = ''
  const hiddenCategories = new Set()
  const hiddenFeatureIds = new Set()
  const featureStyleOverrides = new Map()

  function removeOverlays() {
    if (overlays.length && overlaysAdded) {
      map.remove(overlays)
    }
    overlays = []
    overlaysAdded = false
  }

  function clearHeatmap() {
    if (!heatmap) return

    if (typeof heatmap.setMap === 'function') {
      heatmap.setMap(null)
    } else if (typeof heatmap.hide === 'function') {
      heatmap.hide()
    }

    heatmap = null
    heatmapStyle = null
  }

  function clear() {
    removeOverlays()
    clearHeatmap()
  }

  function addOverlays() {
    if (overlays.length && !overlaysAdded) {
      overlays.forEach((overlay) => {
        map.add(overlay)
      })
      overlaysAdded = true
    }
  }

  function refreshHeatmap() {
    if (!heatmap || !heatmapStyle) return

    const data = createHeatmapData(features, heatmapStyle, hiddenCategories, hiddenFeatureIds)
    heatmap.setDataSet({
      data,
      max: getHeatmapMax(data, heatmapStyle)
    })

    if (visible && typeof heatmap.show === 'function') {
      heatmap.show()
    } else if (!visible && typeof heatmap.hide === 'function') {
      heatmap.hide()
    }
  }

  function showOverlays() {
    addOverlays()
    applyOverlayVisibility(overlays, visible, hiddenCategories, hiddenFeatureIds)
  }

  function resolveOverlayStyle(feature, kind, options = {}) {
    const baseStyle = resolveFeatureStyle(layerStyle, feature, kind)
    const override = featureStyleOverrides.get(getFeatureStyleKey(feature))
    const featureKey = getFeatureStyleKey(feature)
    const includeClick = options.includeClick !== false
    const includeHover = options.includeHover !== false
    const styleChain = [baseStyle]

    if (override) {
      styleChain.push(getScopedStyleOverride(override, kind))
    }
    if (includeClick && clickedFeatureKey && clickedFeatureKey === featureKey) {
      styleChain.push(getScopedStyleOverride(clickStyle, kind))
    }
    if (includeHover && hoveredFeatureKey && hoveredFeatureKey === featureKey) {
      styleChain.push(getScopedStyleOverride(hoverStyle, kind))
    }

    return mergeStyle(...styleChain)
  }

  function getOverlayEventCallback(type) {
    if (!isPlainObject(layerEvents)) return null
    return layerEvents[type] || (type === 'mouseover' ? layerEvents.hover : null)
  }

  function createEventPayload(type, overlay, event) {
    const extData = overlay.getExtData && overlay.getExtData()
    const feature = extData && extData.feature

    return {
      type,
      layerId,
      feature,
      featureId: extData && extData.id,
      category: extData && extData.category,
      properties: feature ? getFeatureProperties(feature) : {},
      lnglat: event ? normalizeEventLngLat(event.lnglat) : null,
      pixel: event ? normalizeEventPixel(event.pixel) : null,
      overlay,
      rawEvent: event
    }
  }

  function applyFeatureInteractionStyle(featureKey) {
    if (!featureKey) return

    overlays.forEach((overlay) => {
      if (getOverlayFeatureKey(overlay) !== featureKey) return

      const extData = overlay.getExtData && overlay.getExtData()
      const feature = extData && extData.feature
      const kind = getGeometryKind(feature)
      if (!feature || !kind) return

      applyOverlayStyle(AMap, overlay, feature, kind, resolveOverlayStyle(feature, kind))
    })
  }

  function handleOverlayEvent(type, overlay, event) {
    const featureKey = getOverlayFeatureKey(overlay)

    if (type === 'mouseover' && hasFeatureStyle(hoverStyle)) {
      hoveredFeatureKey = featureKey
      applyFeatureInteractionStyle(featureKey)
    } else if (type === 'mouseout' && hoveredFeatureKey === featureKey) {
      hoveredFeatureKey = ''
      applyFeatureInteractionStyle(featureKey)
    } else if (type === 'click' && hasFeatureStyle(clickStyle)) {
      const previousFeatureKey = clickedFeatureKey
      clickedFeatureKey = featureKey
      if (previousFeatureKey && previousFeatureKey !== featureKey) {
        applyFeatureInteractionStyle(previousFeatureKey)
      }
      applyFeatureInteractionStyle(featureKey)
    }

    const callback = getOverlayEventCallback(type)
    if (typeof callback !== 'function') return

    const payload = createEventPayload(type, overlay, event)
    try {
      callback(payload.feature, payload)
    } catch (error) {
      console.error(`[AmapMap] ${layerId} ${type} event callback failed.`, error)
    }
  }

  function bindOverlayEvents(overlay) {
    if (!overlay || typeof overlay.on !== 'function') return

    OVERLAY_EVENT_TYPES.forEach((type) => {
      const hasCallback = typeof getOverlayEventCallback(type) === 'function'
      const hasStyle = (type === 'mouseover' || type === 'mouseout')
        ? hasFeatureStyle(hoverStyle)
        : hasFeatureStyle(clickStyle)

      if (!hasCallback && !hasStyle) return

      overlay.on(type, (event) => {
        handleOverlayEvent(type, overlay, event)
      })
    })
  }

  function renderVectorOverlays() {
    removeOverlays()
    overlays = features.flatMap((feature) => {
      const kind = getGeometryKind(feature)
      if (!kind) return []

      return createOverlay(AMap, feature, resolveOverlayStyle(feature, kind))
    })
    overlays.forEach(bindOverlayEvents)

    if (visible) {
      showOverlays()
    }
  }

  function hasFeature(featureId) {
    const key = String(featureId)
    return features.some((feature) => getFeatureStyleKey(feature) === key)
  }

  function refreshAfterFeatureStyleChange() {
    if (heatmap) {
      refreshHeatmap()
      return
    }

    renderVectorOverlays()
  }

  function getLayerCategories() {
    return Array.from(new Set(
      features
        .map(getFeatureCategory)
        .filter((category) => category != null)
    ))
  }

  function getLayerGeometryKinds() {
    return Array.from(new Set(
      features
        .map(getGeometryKind)
        .filter(Boolean)
    ))
  }

  return {
    setData(geoJSON, style = {}, options = {}) {
      clear()
      layerStyle = style || {}
      layerEvents = options.events || {}
      hoverStyle = options.hoverStyle || {}
      clickStyle = options.clickStyle || {}
      hoveredFeatureKey = ''
      clickedFeatureKey = ''
      features = getFeatures(geoJSON, options.defaultProperties)
      featureStyleOverrides.clear()

      if (isHeatmapStyle(layerStyle)) {
        heatmapStyle = resolveHeatmapStyle(layerStyle)
        heatmap = createOfficialHeatmap(AMap, map, heatmapStyle, visible)

        if (heatmap) {
          refreshHeatmap()
        } else {
          console.warn('[AmapMap] AMap.HeatMap is unavailable in the offline package.')
        }

        return
      }

      renderVectorOverlays()
    },

    show() {
      visible = true

      if (heatmap) {
        refreshHeatmap()
        return
      }

      showOverlays()
    },

    hide() {
      visible = false

      if (heatmap) {
        if (typeof heatmap.hide === 'function') {
          heatmap.hide()
        }
        return
      }

      overlays.forEach((overlay) => overlay.hide())
    },

    destroy() {
      clear()
      features = []
      layerStyle = {}
      layerEvents = {}
      hoverStyle = {}
      clickStyle = {}
      hoveredFeatureKey = ''
      clickedFeatureKey = ''
      featureStyleOverrides.clear()
      hiddenCategories.clear()
      hiddenFeatureIds.clear()
    },

    setStyle(style = {}) {
      layerStyle = style || {}
      featureStyleOverrides.clear()

      if (isHeatmapStyle(layerStyle)) {
        clear()
        heatmapStyle = resolveHeatmapStyle(layerStyle)
        heatmap = createOfficialHeatmap(AMap, map, heatmapStyle, visible)

        if (heatmap) {
          refreshHeatmap()
        } else {
          console.warn('[AmapMap] AMap.HeatMap is unavailable in the offline package.')
        }

        return
      }

      clearHeatmap()
      renderVectorOverlays()
    },

    setCategoryVisible(category, nextVisible) {
      updateHiddenCategories(hiddenCategories, category, nextVisible)

      if (heatmap) {
        refreshHeatmap()
        return
      }

      applyOverlayVisibility(overlays, visible, hiddenCategories, hiddenFeatureIds)
    },

    setFeaturesVisible(featureIds, nextVisible) {
      updateHiddenFeatureIds(hiddenFeatureIds, featureIds, nextVisible)

      if (heatmap) {
        refreshHeatmap()
        return
      }

      applyOverlayVisibility(overlays, visible, hiddenCategories, hiddenFeatureIds)
    },

    setFeatureStyle(featureId, style = {}) {
      if (featureId == null || !hasFeature(featureId)) return false

      const key = String(featureId)
      if (hasFeatureStyle(style)) {
        featureStyleOverrides.set(key, style)
      } else {
        featureStyleOverrides.delete(key)
      }

      refreshAfterFeatureStyleChange()
      return true
    },

    clearFeatureStyle(featureId) {
      if (featureId == null) return false

      const key = String(featureId)
      const removed = featureStyleOverrides.delete(key)
      const clearedInteraction = hoveredFeatureKey === key || clickedFeatureKey === key
      if (hoveredFeatureKey === key) hoveredFeatureKey = ''
      if (clickedFeatureKey === key) clickedFeatureKey = ''

      if (removed || clearedInteraction) {
        refreshAfterFeatureStyleChange()
      }

      return removed || clearedInteraction
    },

    clearFeatureStyles() {
      if (!featureStyleOverrides.size && !hoveredFeatureKey && !clickedFeatureKey) return

      featureStyleOverrides.clear()
      hoveredFeatureKey = ''
      clickedFeatureKey = ''
      refreshAfterFeatureStyleChange()
    },

    fitView(options = {}) {
      if (heatmap) {
        fitFeatures(AMap, map, getVisibleFeatures(features, hiddenCategories, hiddenFeatureIds), options)
        return
      }

      addOverlays()
      applyOverlayVisibility(overlays, visible, hiddenCategories, hiddenFeatureIds)
      fitOverlays(map, getFitOverlays(overlays, hiddenCategories, hiddenFeatureIds), options)
    },

    getInfo() {
      return {
        visible,
        featureCount: features.length,
        overlayCount: overlays.length,
        categories: getLayerCategories(),
        hiddenCategories: Array.from(hiddenCategories),
        hiddenFeatureIds: Array.from(hiddenFeatureIds),
        styledFeatureIds: Array.from(featureStyleOverrides.keys()),
        hoveredFeatureId: hoveredFeatureKey || null,
        clickedFeatureId: clickedFeatureKey || null,
        geometryKinds: getLayerGeometryKinds(),
        hasHeatmap: Boolean(heatmap),
        featureIndex: createFeatureIndex(features)
      }
    },

    focus(id) {
      const key = id == null ? '' : String(id)
      const overlay = overlays.find((item) => {
        return getOverlayFeatureKey(item) === key
      })

      if (overlay) {
        focusOverlay(map, overlay)
        if (shouldShowOverlay(overlay, visible, hiddenCategories, hiddenFeatureIds)) {
          overlay.show()
        }
        return
      }

      const feature = features.find((item) => getFeatureStyleKey(item) === key)
      const position = feature && getPointPositions(feature)[0]
      if (position) {
        map.setZoomAndCenter(14, position, true)
      }
    }
  }
}

export function createLayer(layerId, context) {
  return makeGeoJSONLayer(layerId, context)
}
