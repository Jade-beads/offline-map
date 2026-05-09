/**
 * 覆盖物相关辅助：
 * - 将 AMap 覆盖物（圆/多边形/矩形等）转换为 GeoJSON Feature
 * - 自定义 marker 的 HTML 内容生成
 */
import { closeRing, getPathFromBounds, normalizePath, toLngLatArray } from './coord'
import { escapeHtml } from './dom'

export function createCustomMarkerContent(name) {
  return `<div class="custom-map-marker" title="${escapeHtml(name)}"><span></span></div>`
}

export function overlayToGeoJSON(shape, overlay, bounds) {
  if (!overlay) return null

  if (shape === 'circle' && typeof overlay.getCenter === 'function') {
    const center = toLngLatArray(overlay.getCenter())
    const radius = typeof overlay.getRadius === 'function' ? overlay.getRadius() : undefined

    return {
      type: 'Feature',
      properties: {
        shape,
        radius
      },
      geometry: {
        type: 'Point',
        coordinates: center
      }
    }
  }

  const path = typeof overlay.getPath === 'function'
    ? closeRing(normalizePath(overlay.getPath()))
    : getPathFromBounds(bounds)

  if (!path.length) return null

  return {
    type: 'Feature',
    properties: {
      shape
    },
    geometry: {
      type: 'Polygon',
      coordinates: [path]
    }
  }
}
