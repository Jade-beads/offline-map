import { mapActions } from './map-store'

// Loca 分类点默认颜色，按二维数组第一层索引顺序循环使用。
const CATEGORY_COLORS = [
  '#1677ff',
  '#16a34a',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#64748b'
]

/**
 * 校验 Loca 点位入参，只在工具边界做一次严格校验。
 * 内部渲染链路可以默认拿到的是合法 GeoJSON Point。
 * @param {unknown} point
 * @param {number} categoryIndex
 * @param {number} pointIndex
 */
function assertLocaPoint(point, categoryIndex, pointIndex) {
  if (!point || typeof point !== 'object') {
    throw new Error(`第 ${categoryIndex} 组第 ${pointIndex} 个点位必须是对象`)
  }

  if (point.id == null || point.id === '') {
    throw new Error(`第 ${categoryIndex} 组第 ${pointIndex} 个点位缺少 id`)
  }

  const { geom } = point
  const coordinates = geom?.coordinates

  if (
    !geom ||
    geom.type !== 'Point' ||
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    coordinates.some((coordinate) => typeof coordinate !== 'number' || Number.isNaN(coordinate))
  ) {
    throw new Error(`第 ${categoryIndex} 组第 ${pointIndex} 个点位 geom 必须是 GeoJSON Point`)
  }
}

/**
 * 将“按分类分组的点位二维数组”转换成 Loca 点图层可直接使用的 FeatureCollection。
 *
 * 入参结构：
 * - 第一层数组：不同分类，同一分类共用固定颜色。
 * - 第二层数组：该分类下的点位列表。
 * - 点位对象：必须包含 `id` 和 `geom`，`geom` 必须是 GeoJSON Point。
 *
 * 输出结构：
 * - `geometry` 使用原始 `item.geom`。
 * - `properties.category` 写入 `category-${分类索引}`，用于分类显隐。
 * - `properties.color` 写入固定颜色，Loca 渲染时可在 `style.color` 中读取。
 *
 * @param {Array<Array<{ id: string | number, geom: { type: 'Point', coordinates: [number, number] }, [key: string]: any }>>} categoryPointGroups
 * @returns {{ type: 'FeatureCollection', features: Array<object> }}
 */
export function buildLocaCategorizedPointGeoJSON(categoryPointGroups) {
  if (!Array.isArray(categoryPointGroups)) {
    throw new Error('categoryPointGroups 必须是二维数组')
  }

  return {
    type: 'FeatureCollection',
    features: categoryPointGroups.flatMap((points, categoryIndex) => {
      if (!Array.isArray(points)) {
        throw new Error(`第 ${categoryIndex} 组点位必须是数组`)
      }

      const category = `category-${categoryIndex}`
      const color = CATEGORY_COLORS[categoryIndex % CATEGORY_COLORS.length]

      return points.map((point, pointIndex) => {
        assertLocaPoint(point, categoryIndex, pointIndex)

        const { geom, ...properties } = point
        const id = String(point.id)

        return {
          type: 'Feature',
          id,
          properties: {
            ...properties,
            id,
            category,
            color
          },
          geometry: geom
        }
      })
    })
  }
}

/**
 * 兼容按分类拆分渲染的旧用法：每个分类返回一份独立 GeoJSON 和固定颜色。
 * 新的 Loca 多分类点位优先使用 buildLocaCategorizedPointGeoJSON。
 * @param {Array<Array<object>>} categorizedPoints
 * @returns {Array<{ geoJSON: object, color: string }>}
 */
export function buildCategorizedPointLayers(categorizedPoints) {
  return categorizedPoints.map((points, index) => {
    const geoJSON = buildLocaCategorizedPointGeoJSON([points])
    geoJSON.features.forEach((feature) => {
      feature.properties.category = `category-${index}`
      feature.properties.color = CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    })

    return {
      geoJSON,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    }
  })
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 创建银行网点信息窗体内容生成器。
 * fields 只描述要展示的业务字段，空字符串、null、undefined 不生成行。
 * @param {Array<{ label: string, field: string }>} fields
 * @returns {(feature: object, properties: object) => string}
 */
export function createBankInfoWindowContent(fields) {
  return (feature, properties = {}) => {
    const title = properties.name || properties.title || feature?.properties?.name || '网点详情'
    const rows = fields
      .filter(({ field }) => properties[field] !== '' && properties[field] != null)
      .map(({ label, field }) => `
        <div class="iw-row">
          <span class="iw-label">${escapeHtml(label)}</span>
          <span class="iw-value">${escapeHtml(properties[field])}</span>
        </div>
      `)
      .join('')

    return `
      <div class="map-info-window">
        <div class="iw-title">${escapeHtml(title)}</div>
        ${rows}
      </div>
    `
  }
}

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
