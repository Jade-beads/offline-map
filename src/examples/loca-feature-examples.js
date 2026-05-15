import { locaActions } from '../loca/loca-store'

export const LOCA_EXAMPLE_POINT_LAYER_ID = 'loca-example-mass-points'
export const LOCA_EXAMPLE_HEAT_LAYER_ID = 'loca-example-heatmap'
export const LOCA_EXAMPLE_GRID_LAYER_ID = 'loca-example-grid'
export const LOCA_EXAMPLE_HIGHLIGHT_FEATURE_ID = 'loca-point-600'

const CATEGORY_COLORS = {
  branch: '#1677ff',
  atm: '#16a34a',
  selfService: '#f97316'
}

function createMassPointGeoJSON(count = 1200) {
  const center = [117.2272, 31.8206]
  const categories = ['branch', 'atm', 'selfService']
  const features = []
  const columns = 48

  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / columns)
    const column = index % columns
    const category = categories[index % categories.length]
    const wave = Math.sin(index * 1.37) * 0.006
    const lng = center[0] + (column - columns / 2) * 0.0026 + wave
    const lat = center[1] + (row - count / columns / 2) * 0.0023 + Math.cos(index * 0.73) * 0.004
    const value = 10 + ((index * 17) % 90)

    features.push({
      type: 'Feature',
      id: `loca-point-${index}`,
      properties: {
        id: `loca-point-${index}`,
        name: `Loca海量点${index}`,
        category,
        value
      },
      geometry: {
        type: 'Point',
        coordinates: [Number(lng.toFixed(6)), Number(lat.toFixed(6))]
      }
    })
  }

  return {
    type: 'FeatureCollection',
    features
  }
}

const massPointGeoJSON = createMassPointGeoJSON()

export function renderLocaMassPointExample() {
  locaActions.renderGeoJSONLayer({
    layerId: LOCA_EXAMPLE_POINT_LAYER_ID,
    type: 'point',
    visible: true,
    layerOptions: {
      zIndex: 12,
      opacity: 0.92,
      blend: 'lighter'
    },
    style: {
      radius: (index, feature) => (feature.properties.category === 'branch' ? 5.8 : 4.2),
      color: (index, feature) => CATEGORY_COLORS[feature.properties.category] || '#1677ff',
      borderWidth: 0,
      blurWidth: 0.65
    }
  }, massPointGeoJSON)

  locaActions.fitLayerView(LOCA_EXAMPLE_POINT_LAYER_ID, {
    padding: [80, 80]
  })
}

export function renderLocaHeatmapExample() {
  locaActions.renderGeoJSONLayer({
    layerId: LOCA_EXAMPLE_HEAT_LAYER_ID,
    type: 'heatmap',
    visible: true,
    layerOptions: {
      zIndex: 8,
      opacity: 1
    },
    style: {
      radius: 32,
      unit: 'px',
      height: 0,
      value: (index, feature) => feature.properties.value,
      gradient: {
        0.2: '#22d3ee',
        0.45: '#84cc16',
        0.7: '#facc15',
        1: '#ef4444'
      }
    }
  }, massPointGeoJSON)

  locaActions.fitLayerView(LOCA_EXAMPLE_HEAT_LAYER_ID, {
    padding: [80, 80]
  })
}

export function renderLocaGridExample() {
  locaActions.renderGeoJSONLayer({
    layerId: LOCA_EXAMPLE_GRID_LAYER_ID,
    type: 'grid',
    visible: true,
    layerOptions: {
      zIndex: 10,
      opacity: 0.78,
      hasSide: false
    },
    style: {
      unit: 'meter',
      radius: 150,
      gap: 0,
      height: 0,
      color: (index, feature) => {
        const value = feature.properties.value
        if (value > 75) return '#ef4444'
        if (value > 45) return '#f59e0b'
        return '#14b8a6'
      }
    }
  }, massPointGeoJSON)

  locaActions.fitLayerView(LOCA_EXAMPLE_GRID_LAYER_ID, {
    padding: [80, 80]
  })
}

export function setLocaBranchCategoryVisible(visible) {
  locaActions.setLayerCategoryVisible(LOCA_EXAMPLE_POINT_LAYER_ID, 'branch', visible)
}

export function setLocaMassPointLayerVisible(visible) {
  if (!locaActions.getLayerInfo(LOCA_EXAMPLE_POINT_LAYER_ID)) {
    renderLocaMassPointExample()
  }

  locaActions.setLayerVisible(LOCA_EXAMPLE_POINT_LAYER_ID, visible)
}

export function updateLocaMassPointStyleExample() {
  if (!locaActions.getLayerInfo(LOCA_EXAMPLE_POINT_LAYER_ID)) {
    renderLocaMassPointExample()
  }

  locaActions.setLayerStyle(LOCA_EXAMPLE_POINT_LAYER_ID, {
    radius: (index, feature) => (feature.properties.category === 'branch' ? 7.5 : 5),
    color: (index, feature) => CATEGORY_COLORS[feature.properties.category] || '#1677ff',
    borderWidth: 0,
    blurWidth: 0.8
  })
}

export function patchLocaMassPointStyleExample() {
  if (!locaActions.getLayerInfo(LOCA_EXAMPLE_POINT_LAYER_ID)) {
    renderLocaMassPointExample()
  }

  locaActions.patchLayerStyle(LOCA_EXAMPLE_POINT_LAYER_ID, {
    radius: 8.5,
    blurWidth: 0.35,
    layerOptions: {
      opacity: 0.72
    }
  })
}

export function patchLocaHeatmapOpacityExample(opacity = 0.58) {
  if (!locaActions.getLayerInfo(LOCA_EXAMPLE_HEAT_LAYER_ID)) {
    renderLocaHeatmapExample()
  }

  locaActions.patchLayerStyle(LOCA_EXAMPLE_HEAT_LAYER_ID, {
    layerOptions: {
      opacity
    }
  })
}

export function setLocaFeatureVisibleExample(featureId, visible) {
  if (!locaActions.getLayerInfo(LOCA_EXAMPLE_POINT_LAYER_ID)) {
    renderLocaMassPointExample()
  }

  locaActions.setFeaturesVisible(LOCA_EXAMPLE_POINT_LAYER_ID, featureId, visible)
}

export function highlightLocaFeatureExample(featureId = LOCA_EXAMPLE_HIGHLIGHT_FEATURE_ID) {
  if (!locaActions.getLayerInfo(LOCA_EXAMPLE_POINT_LAYER_ID)) {
    renderLocaMassPointExample()
  }

  locaActions.highlightFeature(LOCA_EXAMPLE_POINT_LAYER_ID, featureId)
}

export function clearLocaFeatureStyleExample(featureId = LOCA_EXAMPLE_HIGHLIGHT_FEATURE_ID) {
  locaActions.clearFeatureStyle(LOCA_EXAMPLE_POINT_LAYER_ID, featureId)
}

export function clearLocaFeatureStylesExample() {
  locaActions.clearLayerFeatureStyles(LOCA_EXAMPLE_POINT_LAYER_ID)
}

export function getLocaFeatureInfoExample(featureId = LOCA_EXAMPLE_HIGHLIGHT_FEATURE_ID) {
  return locaActions.getFeatureInfo(LOCA_EXAMPLE_POINT_LAYER_ID, featureId)
}

export function clearLocaExamples() {
  locaActions.clearLayer(LOCA_EXAMPLE_POINT_LAYER_ID)
  locaActions.clearLayer(LOCA_EXAMPLE_HEAT_LAYER_ID)
  locaActions.clearLayer(LOCA_EXAMPLE_GRID_LAYER_ID)
}

export function clearAllLocaLayersExample() {
  locaActions.clearAllLayers()
}

export function getLocaLayerInfoExample() {
  return locaActions.getLayerList()
}
