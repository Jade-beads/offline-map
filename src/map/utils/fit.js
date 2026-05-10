/**
 * 聚焦与视野适配工具：
 * - 计算 Feature 集合的 AMap Bounds
 * - 单个 overlay 聚焦（focusOverlay）
 * - 多个 overlay / Feature 适配地图视野（fitOverlays / fitFeatures）
 */
import { getOverlayCategory, getOverlayFeatureKey } from './feature'
import { toNumber } from './geometry'

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

export function getFeatureBounds(AMap, targetFeatures) {
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

export function focusOverlay(map, overlay) {
  const extData = overlay.getExtData && overlay.getExtData()

  if (extData && extData.position) {
    map.setZoomAndCenter(14, extData.position, true)
    return
  }

  map.setFitView([overlay], true, [80, 80, 80, 80])
}

export function normalizeFitPadding(padding) {
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

export function getFitOverlays(overlays, hiddenCategories, hiddenFeatureIds) {
  return overlays.filter((overlay) => {
    const category = getOverlayCategory(overlay)
    return !hiddenFeatureIds.has(getOverlayFeatureKey(overlay)) && (category == null || !hiddenCategories.has(category))
  })
}

export function fitOverlays(map, overlays, options = {}) {
  if (!overlays.length || typeof map.setFitView !== 'function') return

  const immediately = true
  const padding = normalizeFitPadding(options.padding)

  if (options.maxZoom != null) {
    map.setFitView(overlays, immediately, padding, options.maxZoom)
    return
  }

  map.setFitView(overlays, immediately, padding)
}

export function fitFeatures(AMap, map, targetFeatures, options = {}) {
  if (!targetFeatures.length || typeof map.setBounds !== 'function') return

  const bounds = getFeatureBounds(AMap, targetFeatures)
  if (!bounds) return

  map.setBounds(bounds, true, normalizeFitPadding(options.padding))
}
