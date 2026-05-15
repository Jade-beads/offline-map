import { mapActions } from '../map/map-store'
import { createToggleHighlight } from '../map/layer-helpers'

const DEFAULT_ICON_MAP = {
  默认: '/logo/default-bank.png'
}

export const BANK_POINT_LAYER_ID = 'business-bank-points'
export const BANK_RADIUS_LAYER_ID = 'business-bank-radius'

const CHINA_BANK_NAME = '中国银行'



function normalizeCoordinate(record) {
  const coordinates = record && record.geom && record.geom.coordinates
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const lng = Number(coordinates[0])
    const lat = Number(coordinates[1])
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return [lng, lat]
    }
  }

  const lng = Number(record && record.pointX)
  const lat = Number(record && record.pointY)
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null
}

function getBankType(record) {
  return record && record.level3Classification ? String(record.level3Classification) : '默认'
}

function isChinaBank(record) {
  return getBankType(record) === CHINA_BANK_NAME
}

function createBankFeature(record) {
  const coordinates = normalizeCoordinate(record)
  if (!coordinates) return null

  const bankType = getBankType(record)
  const id = record.id == null ? `${bankType}-${coordinates.join(',')}` : String(record.id)

  return {
    type: 'Feature',
    id,
    properties: {
      ...record,
      id,
      category: bankType,
      bankType
    },
    geometry: {
      type: 'Point',
      coordinates
    }
  }
}

export function createBankPointGeoJSON(records = []) {
  return {
    type: 'FeatureCollection',
    features: records
      .map(createBankFeature)
      .filter(Boolean)
  }
}

export function createBankRadiusGeoJSON(records = [], options = {}) {
  const radius = Number(options.radius || 800)

  return {
    type: 'FeatureCollection',
    features: records
      .filter(isChinaBank)
      .map(createBankFeature)
      .filter(Boolean)
      .map((feature) => ({
        ...feature,
        id: `${feature.id}-radius`,
        properties: {
          ...feature.properties,
          id: `${feature.id}-radius`,
          sourceFeatureId: feature.id,
          radius
        }
      }))
  }
}

export function renderBankPointsWithChinaBankRadius(records = [], options = {}) {
  const {
    iconMap = DEFAULT_ICON_MAP,
    pointLayerId = BANK_POINT_LAYER_ID,
    radiusLayerId = BANK_RADIUS_LAYER_ID,
    radius = 800,
    fitView = true,
    onSelect,
    onDeselect
  } = options

  const bankGeoJSON = createBankPointGeoJSON(records)
  const radiusGeoJSON = createBankRadiusGeoJSON(records, { radius })

  mapActions.clearLayer(radiusLayerId)
  mapActions.clearLayer(pointLayerId)

  mapActions.renderGeoJSONLayer({
    layerId: radiusLayerId,
    visible: true,
    style: {
      point: {
        renderer: 'circle',
        radiusBy: {
          field: 'radius',
          default: radius
        },
        fillColor: '#1677ff',
        fillOpacity: 0.14,
        strokeColor: '#1677ff',
        strokeOpacity: 0.85,
        strokeWeight: 2,
        zIndex: 20
      }
    }
  }, radiusGeoJSON)

  const highlightStyle = {
    point: {
      size: [42, 42],
      image: {
        size: [42, 42],
        imageSize: [42, 42],
        src: ({ properties }) => iconMap[properties.bankType] || iconMap[properties.category] || iconMap.默认
      },
      zIndex: 150
    }
  }

  mapActions.renderGeoJSONLayer({
    layerId: pointLayerId,
    visible: true,
    style: {
      point: {
        renderer: 'image',
        size: [32, 32],
        image: {
          size: [32, 32],
          imageSize: [32, 32],
          src: ({ properties }) => `/logo/${properties.bankType}.png`
        },
        zIndex: 80
      }
    },
    hoverStyle: {
      point: {
        size: [40, 40],
        image: {
          size: [40, 40],
          imageSize: [40, 40],
          src: ({ properties }) => iconMap[properties.bankType] || iconMap[properties.category] || iconMap.默认
        },
        zIndex: 120
      }
    },
    ...createToggleHighlight(pointLayerId, highlightStyle, { onSelect, onDeselect })
  }, bankGeoJSON)

  if (fitView) {
    mapActions.fitLayerView(pointLayerId, {
      padding: [80, 80],
      maxZoom: 15
    })
  }

  return {
    pointLayerId,
    radiusLayerId,
    bankGeoJSON,
    radiusGeoJSON
  }
}
