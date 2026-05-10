import { mapActions } from '../map/map-store'

export const EXAMPLE_REGION_LAYER_ID = 'example-region-boundary'
export const EXAMPLE_MIXED_LAYER_ID = 'example-mixed-overlays'
export const EXAMPLE_PREFIX_LAYER_ID = 'example-prefix-temporary'
export const EXAMPLE_CLUSTER_LAYER_ID = 'example-bank-cluster'

export const EXAMPLE_FEATURE_IDS = {
  point: 'example-point-001',
  line: 'example-line-001',
  polygon: 'example-polygon-001'
}

const regionBoundaryGeometry = {
  type: 'Polygon',
  coordinates: [
    [
      [117.17, 31.78],
      [117.29, 31.78],
      [117.29, 31.88],
      [117.17, 31.88],
      [117.17, 31.78]
    ]
  ]
}

const mixedGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: EXAMPLE_FEATURE_IDS.point,
      properties: {
        id: EXAMPLE_FEATURE_IDS.point,
        name: '示例点位',
        category: 'point',
        shortName: '点'
      },
      geometry: {
        type: 'Point',
        coordinates: [117.2272, 31.8206]
      }
    },
    {
      type: 'Feature',
      id: EXAMPLE_FEATURE_IDS.line,
      properties: {
        id: EXAMPLE_FEATURE_IDS.line,
        name: '示例线路',
        category: 'line'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [117.19, 31.805],
          [117.225, 31.826],
          [117.27, 31.852]
        ]
      }
    },
    {
      type: 'Feature',
      id: EXAMPLE_FEATURE_IDS.polygon,
      properties: {
        id: EXAMPLE_FEATURE_IDS.polygon,
        name: '示例面',
        category: 'polygon'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [117.235, 31.807],
            [117.265, 31.807],
            [117.265, 31.833],
            [117.235, 31.833],
            [117.235, 31.807]
          ]
        ]
      }
    }
  ]
}

const clusterGeoJSON = {
  type: 'FeatureCollection',
  features: Array.from({ length: 30 }, (_, index) => {
    const column = index % 6
    const row = Math.floor(index / 6)
    const category = index % 3 === 0 ? 'branch' : 'atm'

    return {
      type: 'Feature',
      id: `cluster-bank-${index}`,
      properties: {
        id: `cluster-bank-${index}`,
        name: `Cluster Bank ${index + 1}`,
        category,
        shortName: category === 'branch' ? 'B' : 'A'
      },
      geometry: {
        type: 'Point',
        coordinates: [
          117.18 + column * 0.018,
          31.79 + row * 0.016
        ]
      }
    }
  })
}

export function renderRegionBoundaryExample() {
  mapActions.renderGeoJSONLayer({
    layerId: EXAMPLE_REGION_LAYER_ID,
    visible: true,
    properties: {
      id: 'example-region-001',
      name: '示例行政区',
      category: 'region-boundary'
    },
    style: {
      polygon: {
        fillColor: '#1677ff',
        fillOpacity: 0.14,
        strokeColor: '#1677ff',
        strokeOpacity: 1,
        strokeWeight: 2,
        zIndex: 30
      }
    }
  }, regionBoundaryGeometry)

  mapActions.fitLayerView(EXAMPLE_REGION_LAYER_ID, {
    padding: [80, 80],
    maxZoom: 13
  })
}

export function clearRegionBoundaryExample() {
  mapActions.clearLayer(EXAMPLE_REGION_LAYER_ID)
}

export function updateRegionBoundaryStyleExample() {
  if (!mapActions.getLayerInfo(EXAMPLE_REGION_LAYER_ID)) {
    renderRegionBoundaryExample()
  }

  mapActions.setLayerStyle(EXAMPLE_REGION_LAYER_ID, {
    polygon: {
      fillColor: '#f97316',
      fillOpacity: 0.28,
      strokeColor: '#ea580c',
      strokeOpacity: 1,
      strokeWeight: 3,
      zIndex: 45
    }
  })
}

export function patchRegionBoundaryStyleExample() {
  if (!mapActions.getLayerInfo(EXAMPLE_REGION_LAYER_ID)) {
    renderRegionBoundaryExample()
  }

  mapActions.patchLayerStyle(EXAMPLE_REGION_LAYER_ID, {
    polygon: {
      fillOpacity: 0.36,
      strokeWeight: 5
    }
  })
}

export function renderMixedOverlayExample() {
  mapActions.renderGeoJSONLayer({
    layerId: EXAMPLE_MIXED_LAYER_ID,
    visible: true,
    style: {
      point: {
        renderer: 'pin',
        textField: 'shortName',
        color: '#2563eb',
        size: 30,
        zIndex: 40
      },
      line: {
        strokeColor: '#16a34a',
        strokeOpacity: 0.95,
        strokeWeight: 4,
        zIndex: 35
      },
      polygon: {
        fillColor: '#7c3aed',
        fillOpacity: 0.14,
        strokeColor: '#7c3aed',
        strokeOpacity: 0.95,
        strokeWeight: 2,
        zIndex: 32
      }
    }
  }, mixedGeoJSON)

  mapActions.fitLayerView(EXAMPLE_MIXED_LAYER_ID, {
    padding: [90, 80],
    maxZoom: 14
  })
}

export function patchMixedLayerStyleExample() {
  if (!mapActions.getLayerInfo(EXAMPLE_MIXED_LAYER_ID)) {
    renderMixedOverlayExample()
  }

  mapActions.patchLayerStyle(EXAMPLE_MIXED_LAYER_ID, {
    point: {
      color: '#f59e0b'
    },
    line: {
      strokeWeight: 6
    },
    polygon: {
      fillOpacity: 0.28,
      strokeColor: '#f59e0b'
    }
  })
}

export function clearMixedOverlayExample() {
  mapActions.clearLayer(EXAMPLE_MIXED_LAYER_ID)
}

export function setMixedLayerVisibleExample(visible) {
  if (!mapActions.getLayerInfo(EXAMPLE_MIXED_LAYER_ID)) {
    renderMixedOverlayExample()
  }

  mapActions.setLayerVisible(EXAMPLE_MIXED_LAYER_ID, visible)
}

export function setMixedCategoryVisibleExample(category, visible) {
  if (!mapActions.getLayerInfo(EXAMPLE_MIXED_LAYER_ID)) {
    renderMixedOverlayExample()
  }

  mapActions.setLayerCategoryVisible(EXAMPLE_MIXED_LAYER_ID, category, visible)
}

export function setMixedFeatureVisibleExample(featureId, visible) {
  if (!mapActions.getLayerInfo(EXAMPLE_MIXED_LAYER_ID)) {
    renderMixedOverlayExample()
  }

  mapActions.setFeaturesVisible(EXAMPLE_MIXED_LAYER_ID, featureId, visible)
}

export function highlightMixedFeatureExample(featureId) {
  if (!mapActions.getLayerInfo(EXAMPLE_MIXED_LAYER_ID)) {
    renderMixedOverlayExample()
  }

  mapActions.clearLayerFeatureStyles(EXAMPLE_MIXED_LAYER_ID)
  mapActions.highlightFeature(EXAMPLE_MIXED_LAYER_ID, featureId)
  mapActions.focusFeature(EXAMPLE_MIXED_LAYER_ID, featureId)
}

export function clearMixedHighlightExample() {
  mapActions.clearLayerFeatureStyles(EXAMPLE_MIXED_LAYER_ID)
}

export function clearSingleMixedHighlightExample(featureId) {
  mapActions.clearFeatureStyle(EXAMPLE_MIXED_LAYER_ID, featureId)
}

export function renderPrefixLayerExample() {
  mapActions.renderGeoJSONLayer({
    layerId: `${EXAMPLE_PREFIX_LAYER_ID}-001`,
    visible: true,
    category: 'temporary',
    style: {
      point: {
        renderer: 'circle',
        radius: 350,
        fillColor: '#06b6d4',
        fillOpacity: 0.24,
        strokeColor: '#0891b2',
        strokeWeight: 2
      }
    }
  }, {
    type: 'Point',
    coordinates: [117.205, 31.85]
  })
}

export function clearPrefixLayerExample() {
  mapActions.clearLayerByPrefix(EXAMPLE_PREFIX_LAYER_ID)
}

export function renderClusterLayerExample() {
  mapActions.renderGeoJSONClusterLayer({
    layerId: EXAMPLE_CLUSTER_LAYER_ID,
    visible: true,
    style: {
      gridSize: 70,
      maxZoom: 15,
      point: {
        renderer: 'pin',
        textField: 'shortName',
        color: '#2563eb',
        size: [30, 30],
        zIndex: 90
      },
      cluster: {
        color: '#1677ff',
        textColor: '#ffffff',
        borderColor: '#ffffff',
        size: [46, 46],
        zIndex: 140
      }
    },
    events: {
      click(feature, event) {
        console.log('[Cluster point click]', event.featureId, feature)
      },
      clusterClick(event) {
        console.log('[Cluster click]', event.count, event.clusterData)
      }
    }
  }, clusterGeoJSON)

  mapActions.fitLayerView(EXAMPLE_CLUSTER_LAYER_ID, {
    padding: [80, 80],
    maxZoom: 14
  })
}

export function patchClusterLayerStyleExample() {
  if (!mapActions.getLayerInfo(EXAMPLE_CLUSTER_LAYER_ID)) {
    renderClusterLayerExample()
  }

  mapActions.patchLayerStyle(EXAMPLE_CLUSTER_LAYER_ID, {
    point: {
      color: '#f59e0b'
    },
    cluster: {
      color: '#f97316',
      textColor: '#ffffff'
    }
  })
}

export function clearClusterLayerExample() {
  mapActions.clearLayer(EXAMPLE_CLUSTER_LAYER_ID)
}

export function clearAllMapLayersExample() {
  mapActions.clearAllLayers()
}

export function getMixedFeatureInfoExample(featureId) {
  return mapActions.getFeatureInfo(EXAMPLE_MIXED_LAYER_ID, featureId)
}

export function getLayerInfoExample() {
  return mapActions.getLayerList()
}
