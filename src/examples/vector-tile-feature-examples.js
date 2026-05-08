import { mapActions } from '../map/map-store'

export const EXAMPLE_VECTOR_TILE_LAYER_ID = 'example-avg-price-vector-tile'
export const MV_GRID_THINNING_LAYER_ID = 'mv-grid-thinning-vector-tile'
export const MV_GRID_THINNING_URL = 'http://192.168.100.109:3000/mv_grid_thinning/{z}/{x}/{y}.pbf'

export function getVectorTileExampleUrl(baseUrl = 'http://localhost:18080/tiles/avg-price-grid') {
  return `${baseUrl}/[z]/[x]/[y].pbf`
}

export function createAvgPricePolygonStyle() {
  return {
    polygon: {
      sourceLayer: 'avg_price_grid',
      color: 'rgba(132, 204, 22, 0.72)',
      borderColor: 'rgba(255,255,255,0.75)',
      borderWidth: 0.5,
      visible: true
    }
  }
}

export function createMvGridThinningStyle(sourceLayer = 'mv_grid_thinning') {
  return {
    polygon: {
      sourceLayer,
      color: 'rgba(249, 115, 22, 0.68)',
      borderColor: 'rgba(255,255,255,0.65)',
      borderWidth: 0.4,
      visible: true
    }
  }
}

export function renderMvGridThinningVectorTileExample(options = {}) {
  const layerId = options.layerId || MV_GRID_THINNING_LAYER_ID

  mapActions.renderVectorTileLayer({
    layerId,
    url: options.url || MV_GRID_THINNING_URL,
    visible: options.visible !== false,
    opacity: options.opacity == null ? 0.82 : options.opacity,
    zIndex: options.zIndex == null ? 64 : options.zIndex,
    zooms: options.zooms || [8, 18],
    dataZooms: options.dataZooms || [8, 14],
    tileSize: options.tileSize || 256,
    styles: options.styles || createMvGridThinningStyle(options.sourceLayer),
    events: {
      click(features, event) {
        if (typeof options.onClick === 'function') {
          options.onClick(features, event)
        }
      },
      mousemove(features, event) {
        if (typeof options.onMouseMove === 'function') {
          options.onMouseMove(features, event)
        }
      }
    },
    eventOptions: {
      click: {
        featType: 'polygon',
        buffer: 4
      },
      mousemove: {
        featType: 'polygon',
        buffer: 4
      }
    }
  })

  return layerId
}

export function renderAvgPriceVectorTileExample(options = {}) {
  const layerId = options.layerId || EXAMPLE_VECTOR_TILE_LAYER_ID

  mapActions.renderVectorTileLayer({
    layerId,
    url: options.url || getVectorTileExampleUrl(options.baseUrl),
    visible: options.visible !== false,
    opacity: options.opacity == null ? 0.86 : options.opacity,
    zIndex: options.zIndex == null ? 62 : options.zIndex,
    zooms: options.zooms || [8, 18],
    dataZooms: options.dataZooms || [8, 14],
    tileSize: options.tileSize || 256,
    styles: options.styles || createAvgPricePolygonStyle(),
    events: {
      click(features, event) {
        if (typeof options.onClick === 'function') {
          options.onClick(features, event)
        }
      },
      mousemove(features, event) {
        if (typeof options.onMouseMove === 'function') {
          options.onMouseMove(features, event)
        }
      }
    },
    eventOptions: {
      click: {
        featType: 'polygon',
        buffer: 4
      },
      mousemove: {
        featType: 'polygon',
        buffer: 4
      }
    }
  })

  return layerId
}

export function patchAvgPriceVectorTileStyleExample(layerId = EXAMPLE_VECTOR_TILE_LAYER_ID) {
  mapActions.patchLayerStyle(layerId, {
    opacity: 0.68,
    polygon: {
      borderColor: 'rgba(17,24,39,0.8)',
      borderWidth: 1
    }
  })
}

export function setAvgPriceVectorTileVisibleExample(visible, layerId = EXAMPLE_VECTOR_TILE_LAYER_ID) {
  mapActions.setLayerVisible(layerId, visible)
}

export function clearAvgPriceVectorTileExample(layerId = EXAMPLE_VECTOR_TILE_LAYER_ID) {
  mapActions.clearLayer(layerId)
}
