/**
 * GeoJSON 几何坐标工具：
 * - 数值/像素/尺寸转换
 * - 坐标规整（Position / Line / Polygon）
 * - Feature.geometry 提取（Point / Line / Polygon）
 *
 * 与 utils/coord.js 区分：coord.js 处理 AMap LngLat 实例与 bounds，
 * 这里处理 GeoJSON 原始数组坐标。
 */

export function toNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function normalizePair(value, fallback) {
  if (Array.isArray(value) && value.length >= 2) {
    return [toNumber(value[0], fallback[0]), toNumber(value[1], fallback[1])]
  }

  if (typeof value === 'number') {
    return [value, value]
  }

  return fallback
}

export function createPixel(AMap, value) {
  if (!Array.isArray(value) || value.length < 2) return undefined

  const pixel = [toNumber(value[0], 0), toNumber(value[1], 0)]
  return typeof AMap.Pixel === 'function'
    ? new AMap.Pixel(pixel[0], pixel[1])
    : pixel
}

export function createSize(AMap, value) {
  const size = normalizePair(value, [28, 28])
  return typeof AMap.Size === 'function'
    ? new AMap.Size(size[0], size[1])
    : size
}

export function normalizePosition(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null

  const lng = Number(coordinates[0])
  const lat = Number(coordinates[1])
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null
}

export function normalizeLine(coordinates) {
  if (!Array.isArray(coordinates)) return []

  return coordinates
    .map(normalizePosition)
    .filter(Boolean)
}

export function normalizePolygon(coordinates) {
  if (!Array.isArray(coordinates)) return []

  return coordinates
    .map(normalizeLine)
    .filter((ring) => ring.length >= 3)
}

export function getPointPositions(feature) {
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

export function getLinePath(feature) {
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

export function getPolygonPath(feature) {
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
