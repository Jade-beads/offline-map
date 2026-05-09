/**
 * 统一坐标提取：支持 geom 为数组 [lng, lat]、geom.coordinates、或 pointX/pointY 字段
 */
export function normalizeCoordinate(record) {
  const geom = record && record.geom
  const coordinates = Array.isArray(geom)
    ? geom
    : geom && Array.isArray(geom.coordinates)
      ? geom.coordinates
      : null

  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const lng = Number(coordinates[0])
    const lat = Number(coordinates[1])
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return [lng, lat]
    }
  }

  const pointX = Number(record && record.pointX)
  const pointY = Number(record && record.pointY)
  return Number.isFinite(pointX) && Number.isFinite(pointY) ? [pointX, pointY] : null
}
