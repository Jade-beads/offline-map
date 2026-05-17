import {
  buildLocaCategorizedPointGeoJSON,
  createBankInfoWindowContent,
  createToggleHighlight,
  renderArrowLines
} from '../../../../../src/map/layer-helpers'

jest.mock('../../../../../src/map/map-store', () => ({
  mapActions: {
    setFeatureStyle: jest.fn(),
    clearFeatureStyle: jest.fn(),
    clearLayerFeatureStyles: jest.fn(),
    renderGeoJSONLayer: jest.fn()
  }
}))

const { mapActions } = require('../../../../../src/map/map-store')

const LAYER_ID = 'test-layer'
const HIGHLIGHT_STYLE = { point: { color: '#f97316', size: 40 } }

function makeFeature(id) {
  return { id, properties: { name: `网点-${id}` } }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('buildLocaCategorizedPointGeoJSON', () => {
  it('把二维分类点位数组转换为 Loca 可用的 FeatureCollection', () => {
    const geoJSON = buildLocaCategorizedPointGeoJSON([
      [
        {
          id: 1001,
          name: '一类点',
          geom: {
            type: 'Point',
            coordinates: [117.225, 31.863]
          }
        }
      ],
      [
        {
          id: '2001',
          name: '二类点',
          geom: {
            type: 'Point',
            coordinates: [117.231, 31.858]
          }
        }
      ]
    ])

    expect(geoJSON.type).toBe('FeatureCollection')
    expect(geoJSON.features).toHaveLength(2)
    expect(geoJSON.features[0]).toEqual({
      type: 'Feature',
      id: '1001',
      properties: {
        id: '1001',
        name: '一类点',
        category: 'category-0',
        color: '#1677ff'
      },
      geometry: {
        type: 'Point',
        coordinates: [117.225, 31.863]
      }
    })
    expect(geoJSON.features[1].properties.category).toBe('category-1')
    expect(geoJSON.features[1].properties.color).toBe('#16a34a')
  })

  it('输入结构不合法时抛出明确错误', () => {
    expect(() => buildLocaCategorizedPointGeoJSON({})).toThrow('categoryPointGroups 必须是二维数组')
    expect(() => buildLocaCategorizedPointGeoJSON([[{ id: 'p1' }]])).toThrow('geom 必须是 GeoJSON Point')
  })
})

describe('createBankInfoWindowContent', () => {
  it('输出标题和非空字段行', () => {
    const content = createBankInfoWindowContent([
      { label: '地址', field: 'address' },
      { label: '电话', field: 'phone' }
    ])({}, {
      name: '中国银行人民广场支行',
      address: '人民广场',
      phone: '021-63508888'
    })

    expect(content).toContain('map-info-window')
    expect(content).toContain('iw-title')
    expect(content).toContain('中国银行人民广场支行')
    expect(content).toContain('地址')
    expect(content).toContain('人民广场')
    expect(content).toContain('电话')
    expect(content).toContain('021-63508888')
  })

  it('空字段不生成信息行', () => {
    const content = createBankInfoWindowContent([
      { label: '地址', field: 'address' },
      { label: '电话', field: 'phone' }
    ])({}, {
      title: '网点详情',
      address: '',
      phone: null
    })

    expect(content).toContain('网点详情')
    expect(content).not.toContain('地址')
    expect(content).not.toContain('电话')
    expect(content).not.toContain('iw-row')
  })
})

describe('renderArrowLines', () => {
  beforeEach(() => jest.clearAllMocks())

  const FROM = [121.4, 31.2]
  const TO = [121.5, 31.3]

  it('单条连线：生成一个 LineString feature，携带 showDir: true', () => {
    renderArrowLines('arrow-layer', [FROM, TO])

    expect(mapActions.renderGeoJSONLayer).toHaveBeenCalledTimes(1)
    const [params, geoJSON] = mapActions.renderGeoJSONLayer.mock.calls[0]

    expect(params.layerId).toBe('arrow-layer')
    expect(params.style.line.showDir).toBe(true)
    expect(geoJSON.features).toHaveLength(1)
    expect(geoJSON.features[0].geometry.coordinates).toEqual([FROM, TO])
  })

  it('多条连线：每对坐标生成一个 LineString feature', () => {
    const lines = [[FROM, TO], [TO, FROM]]
    renderArrowLines('arrow-layer', lines)

    const [, geoJSON] = mapActions.renderGeoJSONLayer.mock.calls[0]
    expect(geoJSON.features).toHaveLength(2)
    expect(geoJSON.features[0].geometry.coordinates).toEqual([FROM, TO])
    expect(geoJSON.features[1].geometry.coordinates).toEqual([TO, FROM])
  })

  it('自定义样式参数透传到 line style', () => {
    renderArrowLines('arrow-layer', [FROM, TO], {
      strokeColor: '#ff0000',
      strokeWeight: 5,
      zIndex: 100
    })

    const [params] = mapActions.renderGeoJSONLayer.mock.calls[0]
    expect(params.style.line.strokeColor).toBe('#ff0000')
    expect(params.style.line.strokeWeight).toBe(5)
    expect(params.style.line.zIndex).toBe(100)
  })

  it('过滤掉格式不合法的 pair', () => {
    const lines = [[FROM, TO], null, [FROM]]
    renderArrowLines('arrow-layer', lines)

    const [, geoJSON] = mapActions.renderGeoJSONLayer.mock.calls[0]
    expect(geoJSON.features).toHaveLength(1)
  })

  it('默认 visible 为 true', () => {
    renderArrowLines('arrow-layer', [FROM, TO])

    const [params] = mapActions.renderGeoJSONLayer.mock.calls[0]
    expect(params.visible).toBe(true)
  })
})

describe('createToggleHighlight', () => {
  it('返回包含 events.click 的配置对象', () => {
    const result = createToggleHighlight(LAYER_ID, HIGHLIGHT_STYLE)
    expect(typeof result.events.click).toBe('function')
  })

  it('点击要素 → 调用 setFeatureStyle 高亮，触发 onSelect', () => {
    const onSelect = jest.fn()
    const { events } = createToggleHighlight(LAYER_ID, HIGHLIGHT_STYLE, { onSelect })
    const feature = makeFeature('bank-001')

    events.click(feature)

    expect(mapActions.setFeatureStyle).toHaveBeenCalledWith(LAYER_ID, 'bank-001', HIGHLIGHT_STYLE)
    expect(onSelect).toHaveBeenCalledWith(feature)
    expect(mapActions.clearLayerFeatureStyles).not.toHaveBeenCalled()
  })

  it('再次点击同一要素 → 取消高亮，触发 onDeselect', () => {
    const onDeselect = jest.fn()
    const { events } = createToggleHighlight(LAYER_ID, HIGHLIGHT_STYLE, { onDeselect })
    const feature = makeFeature('bank-001')

    events.click(feature)
    jest.clearAllMocks()

    events.click(feature)

    expect(mapActions.clearLayerFeatureStyles).toHaveBeenCalledWith(LAYER_ID)
    expect(mapActions.setFeatureStyle).not.toHaveBeenCalled()
    expect(onDeselect).toHaveBeenCalled()
  })

  it('选中 A 后点击 B → 清除 A 的高亮，高亮 B，触发 onSelect', () => {
    const onSelect = jest.fn()
    const { events } = createToggleHighlight(LAYER_ID, HIGHLIGHT_STYLE, { onSelect })
    const featureA = makeFeature('bank-001')
    const featureB = makeFeature('bank-002')

    events.click(featureA)
    jest.clearAllMocks()

    events.click(featureB)

    expect(mapActions.clearFeatureStyle).toHaveBeenCalledWith(LAYER_ID, 'bank-001')
    expect(mapActions.setFeatureStyle).toHaveBeenCalledWith(LAYER_ID, 'bank-002', HIGHLIGHT_STYLE)
    expect(onSelect).toHaveBeenCalledWith(featureB)
  })

  it('取消后再次点击同一要素 → 重新高亮', () => {
    const { events } = createToggleHighlight(LAYER_ID, HIGHLIGHT_STYLE)
    const feature = makeFeature('bank-001')

    events.click(feature)  // 选中
    events.click(feature)  // 取消
    jest.clearAllMocks()
    events.click(feature)  // 再次选中

    expect(mapActions.setFeatureStyle).toHaveBeenCalledWith(LAYER_ID, 'bank-001', HIGHLIGHT_STYLE)
    expect(mapActions.clearLayerFeatureStyles).not.toHaveBeenCalled()
  })

  it('不传 callbacks 不抛错', () => {
    const { events } = createToggleHighlight(LAYER_ID, HIGHLIGHT_STYLE)
    const feature = makeFeature('bank-001')

    expect(() => events.click(feature)).not.toThrow()
    expect(() => events.click(feature)).not.toThrow()
  })

  it('feature 为 null 时不调用 setFeatureStyle', () => {
    const { events } = createToggleHighlight(LAYER_ID, HIGHLIGHT_STYLE)

    events.click(null)

    expect(mapActions.setFeatureStyle).not.toHaveBeenCalled()
  })

  it('多个 createToggleHighlight 实例状态互不干扰', () => {
    const { events: eventsA } = createToggleHighlight('layer-a', HIGHLIGHT_STYLE)
    const { events: eventsB } = createToggleHighlight('layer-b', HIGHLIGHT_STYLE)

    eventsA.click(makeFeature('f1'))
    eventsB.click(makeFeature('f2'))
    jest.clearAllMocks()

    // 再次点击 A 的要素应取消，B 的要素不受影响
    eventsA.click(makeFeature('f1'))

    expect(mapActions.clearLayerFeatureStyles).toHaveBeenCalledWith('layer-a')
    expect(mapActions.clearLayerFeatureStyles).not.toHaveBeenCalledWith('layer-b')
  })
})
