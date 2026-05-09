/**
 * 坐标与几何工具
 * 处理 AMap LngLat / Bounds 与原始坐标数组的转换、路径规整等。
 */

export function toLngLatArray(lnglat) {
  if (!lnglat) return null
  if (typeof lnglat.toArray === 'function') return lnglat.toArray()
  if (typeof lnglat.getLng === 'function' && typeof lnglat.getLat === 'function') {
    return [lnglat.getLng(), lnglat.getLat()]
  }
  return Array.isArray(lnglat) ? lnglat : null
}

export function normalizePath(path) {
  if (!Array.isArray(path)) return []

  return path
    .map(toLngLatArray)
    .filter((position) => Array.isArray(position) && position.length >= 2)
}

export function closeRing(path) {
  if (!path.length) return path

  const first = path[0]
  const last = path[path.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) {
    return path
  }

  return [...path, first]
}

export function boundsToPlain(bounds) {
  if (!bounds) return null

  const southWest = typeof bounds.getSouthWest === 'function' ? toLngLatArray(bounds.getSouthWest()) : null
  const northEast = typeof bounds.getNorthEast === 'function' ? toLngLatArray(bounds.getNorthEast()) : null

  if (!southWest || !northEast) return null

  return {
    southWest,
    northEast
  }
}

export function getOverlayBounds(overlay) {
  if (!overlay || typeof overlay.getBounds !== 'function') return null

  try {
    return boundsToPlain(overlay.getBounds())
  } catch (error) {
    return null
  }
}

export function getPathFromBounds(bounds) {
  if (!bounds || !bounds.southWest || !bounds.northEast) return []

  const [west, south] = bounds.southWest
  const [east, north] = bounds.northEast

  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south]
  ]
}
