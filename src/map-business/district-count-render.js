import { mapActions } from '../map/map-store'

export const DISTRICT_COUNT_LAYER_ID = 'business-district-count'
export const BUSINESS_POI_CLUSTER_LAYER_ID = 'business-poi-cluster'

function normalizeCoordinate(record) {
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

function getDistrictId(record, index) {
  if (record && record.id != null) return String(record.id)
  if (record && record.districtCode != null) return String(record.districtCode)
  if (record && record.districtName) return String(record.districtName)
  return `district-count-${index}`
}

function formatCount(value) {
  const count = Number(value)
  if (!Number.isFinite(count)) return '0'
  return count.toLocaleString('zh-CN')
}

function createDistrictCountFeature(record, index) {
  const coordinates = normalizeCoordinate(record)
  if (!coordinates) return null

  const id = getDistrictId(record, index)
  const num = Number(record && record.num)

  return {
    type: 'Feature',
    id,
    properties: {
      ...record,
      id,
      category: 'district-count',
      districtName: record && record.districtName ? String(record.districtName) : '',
      num: Number.isFinite(num) ? num : 0,
      formattedNum: formatCount(num)
    },
    geometry: {
      type: 'Point',
      coordinates
    }
  }
}

export function createDistrictCountGeoJSON(records = []) {
  return {
    type: 'FeatureCollection',
    features: records
      .map(createDistrictCountFeature)
      .filter(Boolean)
  }
}

function getPoiId(record, index) {
  if (record && record.id != null) return String(record.id)
  const coordinates = normalizeCoordinate(record)
  if (coordinates) return `poi-${coordinates.join(',')}`
  return `poi-${index}`
}

function getPoiCategory(record) {
  if (record && record.showTag) return String(record.showTag)
  if (record && record.level3Classification) return String(record.level3Classification)
  if (record && record.level2Classification) return String(record.level2Classification)
  if (record && record.level1Classification) return String(record.level1Classification)
  return 'poi'
}

function createPoiFeature(record, index) {
  const coordinates = normalizeCoordinate(record)
  if (!coordinates) return null

  const id = getPoiId(record, index)
  const category = getPoiCategory(record)

  return {
    type: 'Feature',
    id,
    properties: {
      ...record,
      id,
      category,
      poiCategory: category,
      districtCode: record && record.codeCoun != null ? String(record.codeCoun) : '',
      districtName: record && record.nameCoun ? String(record.nameCoun) : ''
    },
    geometry: {
      type: 'Point',
      coordinates
    }
  }
}

export function createPoiPointGeoJSON(records = []) {
  return {
    type: 'FeatureCollection',
    features: records
      .map(createPoiFeature)
      .filter(Boolean)
  }
}

function getDistrictGroupKey(record, index) {
  if (record && record.codeCoun != null) return String(record.codeCoun)
  if (record && record.nameCoun) return String(record.nameCoun)
  return `unknown-district-${index}`
}

export function createDistrictCountGeoJSONFromPoiRecords(records = []) {
  const groups = new Map()

  records.forEach((record, index) => {
    const coordinates = normalizeCoordinate(record)
    if (!coordinates) return

    const key = getDistrictGroupKey(record, index)
    const current = groups.get(key) || {
      id: key,
      codeCoun: record && record.codeCoun != null ? String(record.codeCoun) : '',
      districtName: record && record.nameCoun ? String(record.nameCoun) : key,
      lngTotal: 0,
      latTotal: 0,
      count: 0,
      records: []
    }

    current.lngTotal += coordinates[0]
    current.latTotal += coordinates[1]
    current.count += 1
    current.records.push(record)
    groups.set(key, current)
  })

  return createDistrictCountGeoJSON(Array.from(groups.values()).map((group) => ({
    id: group.id,
    districtCode: group.codeCoun,
    districtName: group.districtName,
    geom: [
      group.lngTotal / group.count,
      group.latTotal / group.count
    ],
    num: group.count,
    records: group.records
  })))
}

function createCountMarkerHtml({ properties }) {
  const label = properties.formattedNum || formatCount(properties.num)

  return `
    <div
      style="
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(22, 119, 255, 0.92);
        border: 3px solid #ffffff;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
      "
    >${label}</div>
  `
}

function createHoverCountMarkerHtml({ properties }) {
  const label = properties.formattedNum || formatCount(properties.num)

  return `
    <div
      style="
        width: 74px;
        height: 74px;
        border-radius: 50%;
        background: rgba(245, 158, 11, 0.96);
        border: 4px solid #ffffff;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.32);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 15px;
        font-weight: 800;
        line-height: 1;
        white-space: nowrap;
      "
    >${label}</div>
  `
}

export function renderDistrictCountPoints(records = [], options = {}) {
  const {
    layerId = DISTRICT_COUNT_LAYER_ID,
    visible = true,
    fitView = true,
    clearBeforeRender = true,
    onClick,
    events = {},
    style = {},
    hoverStyle = {}
  } = options

  const geoJSON = createDistrictCountGeoJSON(records)

  if (clearBeforeRender) {
    mapActions.clearLayer(layerId)
  }

  mapActions.renderGeoJSONLayer({
    layerId,
    visible,
    style: {
      ...style,
      point: {
        renderer: 'html',
        size: [64, 64],
        html: createCountMarkerHtml,
        zIndex: 90,
        ...(style.point || {})
      }
    },
    hoverStyle: {
      ...hoverStyle,
      point: {
        renderer: 'html',
        size: [74, 74],
        html: createHoverCountMarkerHtml,
        zIndex: 130,
        ...(hoverStyle.point || {})
      }
    },
    events: {
      ...events,
      click(feature, event) {
        if (typeof events.click === 'function') {
          events.click(feature, event)
        }

        if (typeof onClick === 'function') {
          onClick({
            feature,
            event,
            record: event.properties,
            id: event.featureId,
            districtName: event.properties.districtName,
            num: event.properties.num,
            lnglat: event.lnglat
          })
        }
      }
    }
  }, geoJSON)

  if (fitView && geoJSON.features.length) {
    mapActions.fitLayerView(layerId, {
      padding: [80, 80],
      maxZoom: 12
    })
  }

  return {
    layerId,
    geoJSON
  }
}

function createPoiClusterHtml({ count, style, size }) {
  const label = formatCount(count)
  const background = style.color || '#1677ff'
  const textColor = style.textColor || '#ffffff'

  return `
    <div
      style="
        width: ${size[0]}px;
        height: ${size[1]}px;
        border-radius: 50%;
        background: ${background};
        border: 3px solid #ffffff;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.26);
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${textColor};
        font-size: 14px;
        font-weight: 800;
        white-space: nowrap;
      "
    >${label}</div>
  `
}

export function renderPoiClusterLayer(records = [], options = {}) {
  const {
    layerId = BUSINESS_POI_CLUSTER_LAYER_ID,
    visible = true,
    fitView = true,
    clearBeforeRender = true,
    onClick,
    onClusterClick,
    events = {},
    style = {}
  } = options

  const geoJSON = createPoiPointGeoJSON(records)

  if (clearBeforeRender) {
    mapActions.clearLayer(layerId)
  }

  mapActions.renderGeoJSONClusterLayer({
    layerId,
    visible,
    style: {
      gridSize: 80,
      maxZoom: 16,
      minClusterSize: 2,
      averageCenter: true,
      point: {
        renderer: 'pin',
        color: '#1677ff',
        size: [30, 30],
        textField: 'showTag',
        textLength: 1,
        zIndex: 90
      },
      cluster: {
        renderer: 'html',
        size: [58, 58],
        color: '#1677ff',
        textColor: '#ffffff',
        html: createPoiClusterHtml,
        zIndex: 130
      },
      ...style,
      point: {
        renderer: 'pin',
        color: '#1677ff',
        size: [30, 30],
        textField: 'showTag',
        textLength: 1,
        zIndex: 90,
        ...(style.point || {})
      },
      cluster: {
        renderer: 'html',
        size: [58, 58],
        color: '#1677ff',
        textColor: '#ffffff',
        html: createPoiClusterHtml,
        zIndex: 130,
        ...(style.cluster || {})
      }
    },
    events: {
      ...events,
      click(feature, event) {
        if (typeof events.click === 'function') {
          events.click(feature, event)
        }

        if (typeof onClick === 'function') {
          onClick({
            feature,
            event,
            record: event.properties,
            id: event.featureId,
            districtName: event.properties.districtName,
            lnglat: event.lnglat
          })
        }
      },
      clusterClick(event) {
        if (typeof events.clusterClick === 'function') {
          events.clusterClick(event)
        }

        if (typeof onClusterClick === 'function') {
          onClusterClick(event)
        }
      }
    }
  }, geoJSON)

  if (fitView && geoJSON.features.length) {
    mapActions.fitLayerView(layerId, {
      padding: [80, 80],
      maxZoom: 15
    })
  }

  return {
    layerId,
    geoJSON
  }
}

export function renderPoiClusterOrDistrictCount(records = [], options = {}) {
  const {
    zoom,
    switchZoom = 11,
    clusterLayerId = BUSINESS_POI_CLUSTER_LAYER_ID,
    districtLayerId = DISTRICT_COUNT_LAYER_ID,
    fitView = false,
    clusterOptions = {},
    districtOptions = {}
  } = options

  const currentZoom = Number(zoom)
  const shouldShowDistrictCount = Number.isFinite(currentZoom) && currentZoom <= switchZoom

  if (shouldShowDistrictCount) {
    mapActions.clearLayer(clusterLayerId)
    const districtGeoJSON = createDistrictCountGeoJSONFromPoiRecords(records)
    mapActions.renderGeoJSONLayer({
      layerId: districtLayerId,
      visible: true,
      style: {
        point: {
          renderer: 'html',
          size: [64, 64],
          html: createCountMarkerHtml,
          zIndex: 90
        },
        ...(districtOptions.style || {}),
        point: {
          renderer: 'html',
          size: [64, 64],
          html: createCountMarkerHtml,
          zIndex: 90,
          ...((districtOptions.style && districtOptions.style.point) || {})
        }
      },
      hoverStyle: districtOptions.hoverStyle,
      events: {
        ...(districtOptions.events || {}),
        click(feature, event) {
          if (districtOptions.events && typeof districtOptions.events.click === 'function') {
            districtOptions.events.click(feature, event)
          }

          if (typeof districtOptions.onClick === 'function') {
            districtOptions.onClick({
              feature,
              event,
              record: event.properties,
              id: event.featureId,
              districtName: event.properties.districtName,
              num: event.properties.num,
              lnglat: event.lnglat
            })
          }
        }
      }
    }, districtGeoJSON)

    if (fitView && districtGeoJSON.features.length) {
      mapActions.fitLayerView(districtLayerId, {
        padding: [80, 80],
        maxZoom: 12
      })
    }

    return {
      mode: 'district-count',
      layerId: districtLayerId,
      geoJSON: districtGeoJSON
    }
  }

  mapActions.clearLayer(districtLayerId)
  const clusterResult = renderPoiClusterLayer(records, {
    ...clusterOptions,
    layerId: clusterLayerId,
    fitView
  })

  return {
    mode: 'cluster',
    ...clusterResult
  }
}

export function createPoiClusterDistrictZoomRenderer(records = [], options = {}) {
  let currentRecords = Array.isArray(records) ? records : []
  let currentMode = ''

  const {
    clusterLayerId = BUSINESS_POI_CLUSTER_LAYER_ID,
    districtLayerId = DISTRICT_COUNT_LAYER_ID
  } = options

  function renderByZoom(zoom, renderOptions = {}) {
    const switchZoom = renderOptions.switchZoom != null ? renderOptions.switchZoom : options.switchZoom
    const normalizedSwitchZoom = switchZoom == null ? 11 : Number(switchZoom)
    const currentZoom = Number(zoom)
    const nextMode = Number.isFinite(currentZoom) && currentZoom <= normalizedSwitchZoom
      ? 'district-count'
      : 'cluster'
    const force = renderOptions.force === true

    if (!force && nextMode === currentMode) {
      return {
        mode: currentMode,
        skipped: true
      }
    }

    const result = renderPoiClusterOrDistrictCount(currentRecords, {
      ...options,
      ...renderOptions,
      zoom,
      switchZoom: normalizedSwitchZoom,
      clusterLayerId,
      districtLayerId
    })
    currentMode = result.mode
    return result
  }

  function setRecords(nextRecords = [], renderOptions = {}) {
    currentRecords = Array.isArray(nextRecords) ? nextRecords : []
    return renderByZoom(renderOptions.zoom != null ? renderOptions.zoom : options.zoom, {
      ...renderOptions,
      force: true
    })
  }

  function destroy() {
    mapActions.clearLayer(clusterLayerId)
    mapActions.clearLayer(districtLayerId)
    currentMode = ''
  }

  return {
    renderByZoom,
    setRecords,
    destroy,
    getMode() {
      return currentMode
    }
  }
}
