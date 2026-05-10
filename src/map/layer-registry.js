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
import { normalizeEventPixel, toLngLatArray } from './utils/coord'
import {
  applyOverlayVisibility,
  createFeatureExtData,
  createFeatureIndex,
  getFeatures,
  getFeatureStyleKey,
  getOverlayCategory,
  getOverlayFeatureKey,
  getScopedStyleOverride,
  getVisibleFeatures,
  hasFeatureStyle,
  isPlainObject,
  pickDefined,
  resolveAssetUrl,
  updateHiddenCategories,
  updateHiddenFeatureIds
} from './utils/feature'
import {
  fitFeatures,
  fitOverlays,
  focusOverlay,
  getFitOverlays
} from './utils/fit'
import {
  createPixel,
  createSize,
  getLinePath,
  getPointPositions,
  getPolygonPath,
  normalizeLine,
  normalizePair,
  normalizePolygon,
  normalizePosition,
  toNumber
} from './utils/geometry'

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

const OVERLAY_EVENT_TYPES = ['click', 'mouseover', 'mouseout']

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
    (typeof overlay.getPosition === 'function' ? toLngLatArray(overlay.getPosition()) : undefined)
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
      lnglat: event ? toLngLatArray(event.lnglat) : null,
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

    patchStyle(stylePatch = {}) {
      layerStyle = mergeStyle(layerStyle, stylePatch || {})

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
        styleSnapshot: mergeStyle({}, layerStyle),
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
