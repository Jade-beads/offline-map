/**
 * 热力图渲染器
 *
 * 适配 AMap.HeatMap / AMap.Heatmap 两种命名以及不同的构造签名（offline JSAPI 包之间存在差异）。
 */
import {
  getFeatureCategory,
  getFeatureProperties,
  getPropertyValue
} from '../style-resolver'
import {
  HEATMAP_OPTION_KEYS,
  getFeatureStyleKey,
  pickDefined
} from '../utils/feature'
import { getPointPositions, toNumber } from '../utils/geometry'

function getHeatmapConstructor(AMap) {
  const constructor = AMap.HeatMap || AMap.Heatmap

  if (typeof constructor !== 'function') return null
  if (constructor.prototype && typeof constructor.prototype.setDataSet === 'function') {
    return constructor
  }

  return null
}

export function createOfficialHeatmap(AMap, map, style, visible) {
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

export function createHeatmapData(features, style, hiddenCategories, hiddenFeatureIds) {
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

export function getHeatmapMax(data, style) {
  if (style.max != null) return Number(style.max)

  return data.reduce((max, item) => Math.max(max, Number(item.count) || 0), 0)
}
