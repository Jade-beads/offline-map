import {
  getFeatureCategory,
  getFeatureId,
  getFeatureName,
  getFeatureProperties,
  getPropertyValue,
  mergeStyle,
  resolveFeatureStyle
} from './style-resolver'

const GEOMETRY_TYPES = ['Point', 'MultiPoint']

const DEFAULT_CLUSTER_STYLE = {
  gridSize: 80,
  maxZoom: 16,
  minClusterSize: 2,
  averageCenter: true,
  point: {
    renderer: 'pin',
    color: '#1677ff',
    size: [30, 30],
    zIndex: 90,
    textField: 'shortName'
  },
  cluster: {
    color: '#1677ff',
    textColor: '#ffffff',
    borderColor: '#ffffff',
    size: [44, 44],
    zIndex: 130
  }
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

function normalizePosition(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null

  const lng = Number(coordinates[0])
  const lat = Number(coordinates[1])
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null
}

function isPointGeometry(geoJSON) {
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
    id: geometry.id || properties.id || `cluster-geometry-${index}`,
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
      id: feature.id || properties.id || `cluster-feature-${index}`,
      properties
    }
  }

  if (isPointGeometry(feature)) {
    return normalizeGeometryFeature(feature, index, defaultProperties)
  }

  return null
}

export function getClusterFeatures(geoJSON, defaultProperties = {}) {
  if (!geoJSON) return []

  if (geoJSON.type === 'FeatureCollection' && Array.isArray(geoJSON.features)) {
    return geoJSON.features
      .map((feature, index) => normalizeFeature(feature, index, defaultProperties))
      .filter(Boolean)
      .filter((feature) => isPointGeometry(feature.geometry))
  }

  if (geoJSON.type === 'Feature' || isPointGeometry(geoJSON)) {
    return [normalizeFeature(geoJSON, 0, defaultProperties)]
      .filter(Boolean)
      .filter((feature) => isPointGeometry(feature.geometry))
  }

  if (Array.isArray(geoJSON)) {
    return geoJSON
      .map((feature, index) => normalizeFeature(feature, index, defaultProperties))
      .filter(Boolean)
      .filter((feature) => isPointGeometry(feature.geometry))
  }

  return []
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

function getFeatureStyleKey(feature) {
  const id = getFeatureId(feature)
  return id == null ? '' : String(id)
}

function getClusterCategory(item) {
  return item.category == null ? null : String(item.category)
}

function normalizeCategories(category) {
  return (Array.isArray(category) ? category : [category])
    .filter((item) => item != null)
    .map((item) => String(item))
}

function normalizeFeatureIds(featureIds) {
  return (Array.isArray(featureIds) ? featureIds : [featureIds])
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

function updateHiddenFeatureIds(hiddenFeatureIds, featureIds, visible) {
  normalizeFeatureIds(featureIds).forEach((item) => {
    if (visible) {
      hiddenFeatureIds.delete(item)
    } else {
      hiddenFeatureIds.add(item)
    }
  })
}

function resolveAssetUrl(src) {
  if (!src) return ''
  const value = String(src)
  if (/^(data:|https?:|\/\/)/.test(value)) return value

  return new URL(value, window.location.origin).toString()
}

function createLngLat(AMap, position) {
  return typeof AMap.LngLat === 'function'
    ? new AMap.LngLat(position[0], position[1])
    : position
}

function createBounds(AMap, positions) {
  if (!positions.length || typeof AMap.Bounds !== 'function') return null

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

function normalizeFitPadding(padding) {
  if (!Array.isArray(padding)) return [80, 80, 80, 80]
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

export function createClusterData(features = [], options = {}) {
  const weightField = options.weightField || 'weight'
  const result = []

  features.forEach((feature) => {
    const featureId = getFeatureStyleKey(feature)
    const properties = getFeatureProperties(feature)
    const category = getFeatureCategory(feature)
    const weight = Number(getPropertyValue(properties, weightField))

    getPointPositions(feature).forEach((position, index) => {
      result.push({
        lnglat: position,
        feature,
        featureId,
        category,
        properties,
        weight: Number.isFinite(weight) ? weight : undefined,
        pointIndex: index
      })
    })
  })

  return result
}

function createHtmlContent(content, size) {
  return `
    <div
      class="geojson-cluster-point-marker"
      style="width: ${size[0]}px; height: ${size[1]}px;"
    >
      ${content}
    </div>
  `
}

function createPinContent(item, style, size) {
  const properties = item.properties || {}
  const textField = style.textField || style.labelField || 'category'
  const rawText = style.text != null ? style.text : getPropertyValue(properties, textField)
  const text = rawText == null || rawText === '' ? ' ' : String(rawText).slice(0, style.textLength || 1)
  const color = style.color || style.fillColor || '#1677ff'
  const fontSize = toNumber(style.fontSize, Math.max(11, Math.round(size[0] * 0.46)))

  return `
    <div
      class="geojson-map-marker"
      style="--marker-color: ${color}; width: ${size[0]}px; height: ${size[1]}px; font-size: ${fontSize}px;"
    >
      <span>${text}</span>
    </div>
  `
}

function getResolvedPointStyle(layerStyle, item) {
  return resolveFeatureStyle(layerStyle, item.feature, 'point')
}

function renderPointMarker(AMap, marker, item, layerStyle, events, layerId) {
  if (!marker || !item) return

  const style = getResolvedPointStyle(layerStyle, item)
  const size = normalizePair(style.size || (style.image && style.image.size), [30, 30])
  const offset = style.offset || [-size[0] / 2, -size[1] / 2]

  if (typeof marker.setOffset === 'function') {
    marker.setOffset(createPixel(AMap, offset))
  }
  if (style.zIndex != null && typeof marker.setzIndex === 'function') {
    marker.setzIndex(style.zIndex)
  }
  if (typeof marker.setExtData === 'function') {
    marker.setExtData(item)
  }
  if (typeof marker.setTitle === 'function') {
    marker.setTitle(style.title || getFeatureName(item.feature))
  }

  if (style.renderer === 'image') {
    const src = style.image && (style.image.src || style.image.url)
    const imageUrl = src ? resolveAssetUrl(src) : ''
    if (imageUrl && typeof marker.setContent === 'function') {
      marker.setContent(createHtmlContent(`<img src="${imageUrl}" alt="" />`, size))
    }
  } else if (style.renderer === 'html') {
    const html = style.html || style.content
    if (html && typeof marker.setContent === 'function') {
      marker.setContent(createHtmlContent(html, size))
    }
  } else if (typeof marker.setContent === 'function') {
    marker.setContent(createPinContent(item, style, size))
  }

  if (typeof marker.on === 'function' && events && typeof events.click === 'function') {
    marker.on('click', (rawEvent) => {
      events.click(item.feature, {
        type: 'click',
        layerId,
        feature: item.feature,
        featureId: item.featureId,
        category: item.category,
        properties: item.properties,
        lnglat: item.lnglat,
        marker,
        rawEvent
      })
    })
  }
}

function renderClusterMarker(AMap, marker, count, clusterData, layerStyle) {
  if (!marker || typeof marker.setContent !== 'function') return

  const style = mergeStyle(DEFAULT_CLUSTER_STYLE.cluster, layerStyle.cluster)
  const baseSize = normalizePair(style.size, [44, 44])
  const sizeValue = Math.min(72, baseSize[0] + Math.max(0, String(count).length - 2) * 8)
  const size = [sizeValue, sizeValue]
  const color = style.color || '#1677ff'
  const textColor = style.textColor || '#ffffff'
  const borderColor = style.borderColor || '#ffffff'

  marker.setContent(`
    <div
      class="geojson-cluster-marker"
      style="width: ${size[0]}px; height: ${size[1]}px; line-height: ${size[1]}px; background: ${color}; color: ${textColor}; border-color: ${borderColor};"
    >
      ${count}
    </div>
  `)

  if (typeof marker.setOffset === 'function') {
    marker.setOffset(createPixel(AMap, [-size[0] / 2, -size[1] / 2]))
  }
  if (style.zIndex != null && typeof marker.setzIndex === 'function') {
    marker.setzIndex(style.zIndex)
  }
  if (typeof marker.setExtData === 'function') {
    marker.setExtData({
      type: 'cluster',
      count,
      clusterData
    })
  }
}

function createFeatureIndex(features) {
  return features.reduce((result, feature) => {
    const key = getFeatureStyleKey(feature)
    if (!key) return result

    result[key] = {
      id: getFeatureId(feature),
      name: getFeatureName(feature),
      category: getFeatureCategory(feature),
      geometryKind: 'point',
      properties: getFeatureProperties(feature)
    }

    return result
  }, {})
}

function getVisibleClusterData(clusterData, hiddenCategories, hiddenFeatureIds) {
  return clusterData.filter((item) => {
    if (hiddenFeatureIds.has(item.featureId)) return false

    const category = getClusterCategory(item)
    return category == null || !hiddenCategories.has(category)
  })
}

function makeClusterLayer(layerId, context) {
  const { AMap, map } = context
  let features = []
  let clusterData = []
  let layerStyle = mergeStyle(DEFAULT_CLUSTER_STYLE)
  let events = {}
  let cluster = null
  let visible = false
  const hiddenCategories = new Set()
  const hiddenFeatureIds = new Set()

  function getClusterConstructor() {
    return AMap && (AMap.MarkerCluster || AMap.MarkerClusterer)
  }

  function destroyCluster() {
    if (cluster && typeof cluster.setMap === 'function') {
      cluster.setMap(null)
    }
    cluster = null
  }

  function createCluster() {
    destroyCluster()

    const Cluster = getClusterConstructor()
    if (typeof Cluster !== 'function') {
      console.warn('[AmapMap] AMap.MarkerCluster is unavailable in the offline package.')
      return
    }

    const visibleData = getVisibleClusterData(clusterData, hiddenCategories, hiddenFeatureIds)
    const clusterOptions = {
      gridSize: toNumber(layerStyle.gridSize, DEFAULT_CLUSTER_STYLE.gridSize),
      maxZoom: toNumber(layerStyle.maxZoom, DEFAULT_CLUSTER_STYLE.maxZoom),
      minClusterSize: toNumber(layerStyle.minClusterSize, DEFAULT_CLUSTER_STYLE.minClusterSize),
      averageCenter: layerStyle.averageCenter !== false,
      renderMarker({ marker, data }) {
        const item = Array.isArray(data) ? data[0] : data
        renderPointMarker(AMap, marker, item, layerStyle, events, layerId)
      },
      renderClusterMarker({ marker, count, clusterData: items }) {
        renderClusterMarker(AMap, marker, count, items, layerStyle)
      }
    }

    cluster = new Cluster(visible ? map : null, visibleData, clusterOptions)
    if (cluster && typeof cluster.on === 'function' && typeof events.clusterClick === 'function') {
      cluster.on('click', (rawEvent) => {
        events.clusterClick({
          type: 'clusterClick',
          layerId,
          count: rawEvent && rawEvent.count,
          clusterData: rawEvent && rawEvent.clusterData,
          lnglat: rawEvent && rawEvent.lnglat,
          marker: rawEvent && rawEvent.marker,
          rawEvent
        })
      })
    }
  }

  function refreshData() {
    const visibleData = getVisibleClusterData(clusterData, hiddenCategories, hiddenFeatureIds)
    if (cluster && typeof cluster.setData === 'function') {
      cluster.setData(visibleData)
      return
    }

    createCluster()
  }

  function getVisiblePositions() {
    return getVisibleClusterData(clusterData, hiddenCategories, hiddenFeatureIds)
      .map((item) => item.lnglat)
      .filter(Boolean)
  }

  return {
    getType() {
      return 'cluster'
    },

    setData(geoJSON, style = {}, options = {}) {
      destroyCluster()
      layerStyle = mergeStyle(DEFAULT_CLUSTER_STYLE, style || {})
      events = options.events || {}
      features = getClusterFeatures(geoJSON, options.defaultProperties)
      clusterData = createClusterData(features, {
        weightField: layerStyle.weightField
      })
      createCluster()
    },

    show() {
      visible = true
      if (cluster && typeof cluster.setMap === 'function') {
        cluster.setMap(map)
        return
      }
      createCluster()
    },

    hide() {
      visible = false
      if (cluster && typeof cluster.setMap === 'function') {
        cluster.setMap(null)
      }
    },

    destroy() {
      destroyCluster()
      features = []
      clusterData = []
      hiddenCategories.clear()
      hiddenFeatureIds.clear()
    },

    setStyle(style = {}) {
      layerStyle = mergeStyle(DEFAULT_CLUSTER_STYLE, style || {})
      createCluster()
    },

    patchStyle(stylePatch = {}) {
      layerStyle = mergeStyle(layerStyle, stylePatch || {})
      createCluster()
    },

    setCategoryVisible(category, nextVisible) {
      updateHiddenCategories(hiddenCategories, category, nextVisible)
      refreshData()
    },

    setFeaturesVisible(featureIds, nextVisible) {
      updateHiddenFeatureIds(hiddenFeatureIds, featureIds, nextVisible)
      refreshData()
    },

    clearFeatureStyle() {
      return false
    },

    clearFeatureStyles() {},

    setFeatureStyle() {
      return false
    },

    fitView(options = {}) {
      const bounds = createBounds(AMap, getVisiblePositions())
      if (!bounds || typeof map.setBounds !== 'function') return

      map.setBounds(bounds, true, normalizeFitPadding(options.padding))
    },

    focus(id) {
      const key = id == null ? '' : String(id)
      const item = clusterData.find((entry) => entry.featureId === key)
      if (!item || !item.lnglat) return

      if (typeof map.setZoomAndCenter === 'function') {
        map.setZoomAndCenter(toNumber(layerStyle.focusZoom, 16), item.lnglat, true)
      }
    },

    getInfo() {
      return {
        type: 'cluster',
        visible,
        featureCount: features.length,
        overlayCount: clusterData.length,
        clusterCount: cluster && typeof cluster.getClustersCount === 'function'
          ? cluster.getClustersCount()
          : 0,
        categories: Array.from(new Set(clusterData.map((item) => item.category).filter((item) => item != null))),
        hiddenCategories: Array.from(hiddenCategories),
        hiddenFeatureIds: Array.from(hiddenFeatureIds),
        geometryKinds: ['point'],
        hasHeatmap: false,
        styleSnapshot: mergeStyle({}, layerStyle),
        featureIndex: createFeatureIndex(features)
      }
    }
  }
}

export function createClusterLayer(layerId, context) {
  return makeClusterLayer(layerId, context)
}
