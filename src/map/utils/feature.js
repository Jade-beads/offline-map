/**
 * GeoJSON Feature 规范化与图层可见性工具：
 * - 入参 GeoJSON 转规范 Feature 列表
 * - 类目/Feature 可见性集合管理
 * - Overlay extData 与 Feature key 工具
 */
import {
  getFeatureCategory,
  getFeatureId,
  getFeatureName,
  getFeatureProperties,
  getGeometryKind
} from '../style-resolver'

const GEOMETRY_TYPES = [
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon'
]

const GEOMETRY_STYLE_KEYS = ['point', 'line', 'polygon', 'heatmap']

export const MARKER_OPTION_KEYS = [
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

export const CIRCLE_OPTION_KEYS = [
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

export const LINE_OPTION_KEYS = [
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

export const POLYGON_OPTION_KEYS = [
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

export const HEATMAP_OPTION_KEYS = [
  'gradient',
  'opacity',
  'radius',
  'visible',
  'zIndex',
  'zooms',
  '3d'
]

export function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function isGeometry(geoJSON) {
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

export function normalizeFeature(feature, index = 0, defaultProperties = {}) {
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

export function getFeatures(geoJSON, defaultProperties = {}) {
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

export function pickDefined(source, keys) {
  return keys.reduce((result, key) => {
    if (source && source[key] !== undefined) {
      result[key] = source[key]
    }
    return result
  }, {})
}

export function resolveAssetUrl(src) {
  if (!src) return ''

  return new URL(String(src), window.location.origin).toString()
}

export function createFeatureExtData(feature, extra = {}) {
  return {
    ...getFeatureProperties(feature),
    ...extra,
    id: getFeatureId(feature),
    category: getFeatureCategory(feature),
    feature
  }
}

export function getOverlayCategory(overlay) {
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

export function updateHiddenCategories(hiddenCategories, category, visible) {
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

export function updateHiddenFeatureIds(hiddenFeatureIds, featureIds, visible) {
  normalizeFeatureIds(featureIds).forEach((item) => {
    if (visible) {
      hiddenFeatureIds.delete(item)
    } else {
      hiddenFeatureIds.add(item)
    }
  })
}

export function getFeatureStyleKey(feature) {
  const id = getFeatureId(feature)
  return id == null ? '' : String(id)
}

export function getOverlayFeatureKey(overlay) {
  const extData = overlay.getExtData && overlay.getExtData()
  const id = extData && extData.id
  return id == null ? '' : String(id)
}

export function hasFeatureStyle(style) {
  return isPlainObject(style) && Object.keys(style).length > 0
}

export function getScopedStyleOverride(style, kind) {
  if (!isPlainObject(style)) return {}
  if (GEOMETRY_STYLE_KEYS.some((key) => style[key] != null)) {
    return style[kind] || {}
  }
  return style
}

export function shouldShowOverlay(overlay, visible, hiddenCategories, hiddenFeatureIds) {
  const category = getOverlayCategory(overlay)
  return visible &&
    !hiddenFeatureIds.has(getOverlayFeatureKey(overlay)) &&
    (category == null || !hiddenCategories.has(category))
}

export function applyOverlayVisibility(overlays, visible, hiddenCategories, hiddenFeatureIds) {
  overlays.forEach((overlay) => {
    if (shouldShowOverlay(overlay, visible, hiddenCategories, hiddenFeatureIds)) {
      overlay.show()
    } else {
      overlay.hide()
    }
  })
}

export function getVisibleFeatures(features, hiddenCategories, hiddenFeatureIds) {
  return features.filter((feature) => {
    if (hiddenFeatureIds.has(getFeatureStyleKey(feature))) return false

    const category = getFeatureCategory(feature)
    return category == null || !hiddenCategories.has(category)
  })
}

export function createFeatureIndex(features) {
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
