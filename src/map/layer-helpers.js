import { mapActions } from './map-store'

/**
 * 创建点击 toggle 高亮的 events 配置片段，spread 进 renderGeoJSONLayer 参数即可。
 * 点击未选中要素 → 高亮；点击已选中要素 → 取消高亮。
 * 不使用内置 clickStyle 机制，避免 events.click 回调触发时 clickedFeatureId 已更新的时序问题。
 * @param {string} layerId
 * @param {object} highlightStyle  传给 setFeatureStyle 的样式对象
 * @param {{ onSelect?: (feature) => void, onDeselect?: () => void }} callbacks
 * @returns {{ events: { click: Function } }}
 */
/**
 * 渲染带箭头的连线图层。
 * lines 支持单条 [from, to] 或多条 [[from, to], [from, to], ...]，坐标格式为 [lng, lat]。
 * @param {string} layerId
 * @param {[number, number][] | [number, number][][]} lines
 * @param {{ strokeColor?, strokeWeight?, strokeOpacity?, zIndex?, visible? }} options
 */
export function renderArrowLines(layerId, lines, options = {}) {
  const {
    strokeColor = '#1677ff',
    strokeWeight = 3,
    strokeOpacity = 1,
    zIndex = 50,
    visible = true
  } = options

  // 兼容单条 [from, to] 和多条 [[from, to], ...]
  const pairs = Array.isArray(lines[0]?.[0]) ? lines : [lines]

  const geoJSON = {
    type: 'FeatureCollection',
    features: pairs
      .filter((pair) => Array.isArray(pair) && pair.length === 2)
      .map((pair, index) => ({
        type: 'Feature',
        id: `${layerId}-arrow-${index}`,
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: pair
        }
      }))
  }

  mapActions.renderGeoJSONLayer({
    layerId,
    visible,
    style: {
      line: {
        showDir: true,
        strokeColor,
        strokeWeight,
        strokeOpacity,
        zIndex
      }
    }
  }, geoJSON)
}

export function createToggleHighlight(layerId, highlightStyle, callbacks = {}) {
  let selectedId = null

  return {
    events: {
      click(feature) {
        const clickedId = feature?.id == null ? null : String(feature.id)

        if (selectedId !== null && selectedId === clickedId) {
          selectedId = null
          mapActions.clearLayerFeatureStyles(layerId)
          callbacks.onDeselect?.()
        } else {
          if (selectedId !== null) {
            mapActions.clearFeatureStyle(layerId, selectedId)
          }
          selectedId = clickedId
          if (clickedId !== null) {
            mapActions.setFeatureStyle(layerId, clickedId, highlightStyle)
          }
          callbacks.onSelect?.(feature)
        }
      }
    }
  }
}
