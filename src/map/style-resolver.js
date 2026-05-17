const GEOMETRY_STYLE_KEYS = ['point', 'line', 'polygon', 'heatmap']

const DEFAULT_STYLES = {
  point: {
    renderer: 'pin',
    bubble: true,
    color: '#1F2D3D',
    size: 28,
    zIndex: 20
  },
  line: {
    bubble: true,
    strokeColor: '#1677ff',
    strokeOpacity: 0.9,
    strokeWeight: 3,
    strokeStyle: 'solid',
    zIndex: 10
  },
  polygon: {
    bubble: true,
    fillColor: '#1677ff',
    fillOpacity: 0.18,
    strokeColor: '#1677ff',
    strokeOpacity: 0.9,
    strokeWeight: 2,
    zIndex: 10
  },
  heatmap: {
    valueField: 'value',
    radius: 30,
    opacity: [0.2, 0.85],
    zIndex: 130,
    gradient: {
      0.2: '#22c55e',
      0.5: '#f59e0b',
      1: '#ef4444'
    }
  }
}

const DYNAMIC_FIELD_MAP = {
  colorBy: 'color',
  sizeBy: 'size',
  radiusBy: 'radius',
  fillColorBy: 'fillColor',
  fillOpacityBy: 'fillOpacity',
  strokeColorBy: 'strokeColor',
  strokeOpacityBy: 'strokeOpacity',
  strokeWeightBy: 'strokeWeight',
  opacityBy: 'opacity',
  zIndexBy: 'zIndex'
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneValue)
  }

  if (isPlainObject(value)) {
    return Object.keys(value).reduce((result, key) => {
      result[key] = cloneValue(value[key])
      return result
    }, {})
  }

  return value
}

export function mergeStyle(...items) {
  return items.reduce((result, item) => {
    if (!isPlainObject(item)) return result

    Object.keys(item).forEach((key) => {
      const value = item[key]
      if (value === undefined) return

      if (isPlainObject(value) && isPlainObject(result[key])) {
        result[key] = mergeStyle(result[key], value)
      } else {
        result[key] = cloneValue(value)
      }
    })

    return result
  }, {})
}

export function getFeatureProperties(feature) {
  return feature && feature.properties ? feature.properties : {}
}

export function getFeatureId(feature) {
  return feature && feature.id != null ? feature.id : getFeatureProperties(feature).id
}

export function getFeatureName(feature) {
  return getFeatureProperties(feature).name || getFeatureId(feature)
}

export function getFeatureCategory(feature) {
  const category = getFeatureProperties(feature).category
  return category == null ? null : String(category)
}

export function getGeometryKind(feature) {
  const type = feature && feature.geometry && feature.geometry.type

  if (type === 'Point' || type === 'MultiPoint') return 'point'
  if (type === 'LineString' || type === 'MultiLineString') return 'line'
  if (type === 'Polygon' || type === 'MultiPolygon') return 'polygon'

  return ''
}

export function getPropertyValue(properties, path) {
  if (!path) return undefined

  return String(path).split('.').reduce((value, key) => {
    if (value == null) return undefined
    return value[key]
  }, properties)
}

function hasGeometryStyleKey(style) {
  return GEOMETRY_STYLE_KEYS.some((key) => style && style[key] != null)
}

function getScopedStyle(style, kind) {
  if (!isPlainObject(style)) return {}
  if (hasGeometryStyleKey(style)) return style[kind] || {}
  return style
}

function matchRule(rule, context) {
  if (!isPlainObject(rule)) return false

  if (typeof rule.test === 'function') {
    return Boolean(rule.test(context))
  }

  const properties = context.properties

  if (rule.category != null && String(rule.category) !== String(properties.category)) {
    return false
  }

  if (isPlainObject(rule.when)) {
    return Object.keys(rule.when).every((field) => {
      const expected = rule.when[field]
      const actual = getPropertyValue(properties, field)
      return Array.isArray(expected) ? expected.includes(actual) : actual === expected
    })
  }

  if (rule.field) {
    const actual = getPropertyValue(properties, rule.field)

    if (rule.value !== undefined && actual !== rule.value) return false
    if (Array.isArray(rule.in) && !rule.in.includes(actual)) return false
    if (rule.min !== undefined && !(Number(actual) >= Number(rule.min))) return false
    if (rule.max !== undefined && !(Number(actual) <= Number(rule.max))) return false

    return true
  }

  return false
}

function resolveRules(rules, context, kind) {
  if (!Array.isArray(rules)) return {}

  return rules.reduce((result, rule) => {
    if (!matchRule(rule, context)) return result
    return mergeStyle(result, getScopedStyle(rule.style, kind))
  }, {})
}

export function evaluateFunctions(value, context) {
  if (typeof value === 'function') {
    return value(context)
  }

  if (Array.isArray(value)) {
    return value.map((item) => evaluateFunctions(item, context))
  }

  if (isPlainObject(value)) {
    return Object.keys(value).reduce((result, key) => {
      result[key] = evaluateFunctions(value[key], context)
      return result
    }, {})
  }

  return value
}

function normalizeStops(stops) {
  if (!Array.isArray(stops)) return []

  return stops
    .filter((item) => Array.isArray(item) && item.length >= 2)
    .map(([stop, value]) => [Number(stop), value])
    .filter(([stop]) => Number.isFinite(stop))
    .sort((a, b) => a[0] - b[0])
}

function interpolateNumber(left, right, rate) {
  return left + (right - left) * rate
}

export function resolveScaleValue(spec, context) {
  if (typeof spec === 'function') {
    return spec(context)
  }

  if (!isPlainObject(spec)) {
    return spec
  }

  const properties = context.properties || {}
  const value = Number(getPropertyValue(properties, spec.field))

  if (isPlainObject(spec.map)) {
    const key = getPropertyValue(properties, spec.field)
    return spec.map[key] !== undefined ? spec.map[key] : spec.default
  }

  const stops = normalizeStops(spec.stops)
  if (!stops.length || !Number.isFinite(value)) {
    return spec.default
  }

  if (value <= stops[0][0]) return stops[0][1]
  if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]

  for (let index = 1; index < stops.length; index += 1) {
    const left = stops[index - 1]
    const right = stops[index]

    if (value <= right[0]) {
      if (typeof left[1] === 'number' && typeof right[1] === 'number' && spec.interpolate !== false) {
        return interpolateNumber(left[1], right[1], (value - left[0]) / (right[0] - left[0]))
      }

      return left[1]
    }
  }

  return spec.default
}

function applyDynamicFields(style, context) {
  const nextStyle = { ...style }

  Object.keys(DYNAMIC_FIELD_MAP).forEach((sourceKey) => {
    if (nextStyle[sourceKey] === undefined) return

    const targetKey = DYNAMIC_FIELD_MAP[sourceKey]
    const resolvedValue = resolveScaleValue(nextStyle[sourceKey], context)

    if (resolvedValue !== undefined) {
      nextStyle[targetKey] = resolvedValue
    }

    delete nextStyle[sourceKey]
  })

  return nextStyle
}

export function resolveFeatureStyle(layerStyle = {}, feature, kind) {
  const properties = getFeatureProperties(feature)
  const category = getFeatureCategory(feature)
  const context = {
    feature,
    properties,
    geometry: feature && feature.geometry,
    kind
  }

  const categoryStyle = category && layerStyle.categories
    ? getScopedStyle(layerStyle.categories[category], kind)
    : {}
  const ruleStyle = resolveRules(layerStyle.rules, context, kind)
  const featureStyle = getScopedStyle(properties.mapStyle, kind)

  const merged = mergeStyle(
    DEFAULT_STYLES[kind] || {},
    layerStyle[kind] || {},
    categoryStyle,
    ruleStyle,
    featureStyle
  )

  return applyDynamicFields(evaluateFunctions(merged, context), context)
}

export function resolveHeatmapStyle(layerStyle = {}) {
  return mergeStyle(DEFAULT_STYLES.heatmap, layerStyle.heatmap || {})
}

export function isHeatmapStyle(layerStyle = {}) {
  return layerStyle.renderer === 'heatmap' || layerStyle.type === 'heatmap' || Boolean(layerStyle.heatmap)
}
