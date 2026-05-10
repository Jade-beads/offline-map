import {
  getFeatureCategory,
  getFeatureProperties,
  getGeometryKind,
  isHeatmapStyle,
  mergeStyle,
  resolveFeatureStyle,
  resolveHeatmapStyle
} from './style-resolver'
import { normalizeEventPixel } from './utils/coord'
import {
  CIRCLE_OPTION_KEYS,
  LINE_OPTION_KEYS,
  POLYGON_OPTION_KEYS,
  applyOverlayVisibility,
  createFeatureIndex,
  getFeatures,
  getFeatureStyleKey,
  getOverlayFeatureKey,
  getScopedStyleOverride,
  getVisibleFeatures,
  hasFeatureStyle,
  isPlainObject,
  pickDefined,
  updateHiddenCategories,
  updateHiddenFeatureIds
} from './utils/feature'
import {
  fitFeatures,
  fitOverlays,
  focusOverlay,
  getFitOverlays
} from './utils/fit'
import { toNumber } from './utils/geometry'
import {
  applyMarkerStyle,
  createPointOverlays
} from './renderers/marker'
import { createLineOverlay, createPolygonOverlay } from './renderers/shape'
import {
  createHeatmapData,
  createOfficialHeatmap,
  getHeatmapMax
} from './renderers/heatmap'

const OVERLAY_EVENT_TYPES = ['click', 'mouseover', 'mouseout']

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

function createOverlay(AMap, feature, style) {
  const kind = getGeometryKind(feature)

  if (kind === 'point') return createPointOverlays(AMap, feature, style)
  if (kind === 'line') return [createLineOverlay(AMap, feature, style)].filter(Boolean)
  if (kind === 'polygon') return [createPolygonOverlay(AMap, feature, style)].filter(Boolean)

  return []
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
