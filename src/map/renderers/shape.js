/**
 * 线 / 多边形 渲染器
 */
import {
  LINE_OPTION_KEYS,
  POLYGON_OPTION_KEYS,
  createFeatureExtData,
  pickDefined
} from '../utils/feature'
import { getLinePath, getPolygonPath } from '../utils/geometry'

export function createLineOverlay(AMap, feature, style) {
  const path = getLinePath(feature)
  if (!path) return null

  return new AMap.Polyline({
    ...pickDefined(style, LINE_OPTION_KEYS),
    path,
    extData: createFeatureExtData(feature)
  })
}

export function createPolygonOverlay(AMap, feature, style) {
  const path = getPolygonPath(feature)
  if (!path) return null

  return new AMap.Polygon({
    ...pickDefined(style, POLYGON_OPTION_KEYS),
    path,
    extData: createFeatureExtData(feature)
  })
}
