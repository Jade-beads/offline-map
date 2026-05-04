import { mapActions } from '../map/map-store'
import { locaActions } from '../loca/loca-store'
import {
  EXAMPLE_FEATURE_IDS,
  EXAMPLE_MIXED_LAYER_ID,
  EXAMPLE_REGION_LAYER_ID,
  clearAllMapLayersExample,
  clearMixedHighlightExample,
  clearPrefixLayerExample,
  clearRegionBoundaryExample,
  getLayerInfoExample,
  getMixedFeatureInfoExample,
  highlightMixedFeatureExample,
  patchClusterLayerStyleExample,
  patchMixedLayerStyleExample,
  renderClusterLayerExample,
  renderMixedOverlayExample,
  renderPrefixLayerExample,
  renderRegionBoundaryExample,
  setMixedCategoryVisibleExample,
  setMixedFeatureVisibleExample,
  setMixedLayerVisibleExample,
  updateRegionBoundaryStyleExample
} from './map-feature-examples'
import {
  LOCA_EXAMPLE_POINT_LAYER_ID,
  clearAllLocaLayersExample,
  clearLocaFeatureStyleExample,
  clearLocaFeatureStylesExample,
  clearLocaExamples,
  getLocaFeatureInfoExample,
  getLocaLayerInfoExample,
  highlightLocaFeatureExample,
  patchLocaMassPointStyleExample,
  renderLocaMassPointExample,
  setLocaFeatureVisibleExample,
  setLocaMassPointLayerVisible,
  setLocaBranchCategoryVisible,
  updateLocaMassPointStyleExample
} from './loca-feature-examples'

export const mapMethodDemos = {
  setActiveTool: () => mapActions.setActiveTool('demo-tool'),
  dispatchMapCommand: () => mapActions.dispatchMapCommand('zoom:in'),
  clearHandledCommands: () => mapActions.clearHandledCommands(0),
  setDrawResult: () => mapActions.setDrawResult(null),
  clearDrawResult: () => mapActions.clearDrawResult(),
  setLayerInfo: () => mapActions.setLayerInfo('demo-info', { visible: true, featureCount: 0 }),
  removeLayerInfo: () => mapActions.removeLayerInfo('demo-info'),
  clearLayerInfo: () => mapActions.clearLayerInfo(),
  getLayerList: () => getLayerInfoExample(),
  getLayerInfo: () => mapActions.getLayerInfo(EXAMPLE_MIXED_LAYER_ID),
  getFeatureInfo: () => getMixedFeatureInfoExample(EXAMPLE_FEATURE_IDS.point),
  activateRuler: () => mapActions.activateRuler(),
  clearRuler: () => mapActions.clearRuler(),
  restartRuler: () => mapActions.restartRuler(),
  activateDraw: () => mapActions.activateDraw('polygon'),
  activateCustomMarker: () => mapActions.activateCustomMarker(),
  zoomIn: () => mapActions.zoomIn(),
  zoomOut: () => mapActions.zoomOut(),
  searchCoordinate: () => mapActions.searchCoordinate('117.2272,31.8206'),
  renderGeoJSONLayer: () => renderMixedOverlayExample(),
  renderGeoJSONClusterLayer: () => renderClusterLayerExample(),
  setLayerVisible: () => setMixedLayerVisibleExample(false),
  setLayerStyle: () => updateRegionBoundaryStyleExample(),
  patchLayerStyle: () => patchMixedLayerStyleExample(),
  patchGeoJSONClusterLayerStyle: () => patchClusterLayerStyleExample(),
  setLayerCategoryVisible: () => setMixedCategoryVisibleExample('point', false),
  setFeaturesVisible: () => setMixedFeatureVisibleExample(EXAMPLE_FEATURE_IDS.point, false),
  clearLayer: () => clearRegionBoundaryExample(),
  clearAllLayers: () => clearAllMapLayersExample(),
  clearLayerByPrefix: () => {
    renderPrefixLayerExample()
    clearPrefixLayerExample()
  },
  setFeatureStyle: () => mapActions.setFeatureStyle(EXAMPLE_REGION_LAYER_ID, 'example-region-001', {
    polygon: {
      fillColor: '#f59e0b',
      fillOpacity: 0.3,
      strokeColor: '#f59e0b',
      strokeWeight: 4
    }
  }),
  highlightFeature: () => highlightMixedFeatureExample(EXAMPLE_FEATURE_IDS.point),
  clearFeatureStyle: () => mapActions.clearFeatureStyle(EXAMPLE_MIXED_LAYER_ID, EXAMPLE_FEATURE_IDS.point),
  clearLayerFeatureStyles: () => clearMixedHighlightExample(),
  focusFeature: () => mapActions.focusFeature(EXAMPLE_MIXED_LAYER_ID, EXAMPLE_FEATURE_IDS.point),
  fitLayerView: () => mapActions.fitLayerView(EXAMPLE_MIXED_LAYER_ID, { padding: [80, 80] }),
  setViewport: () => mapActions.setViewport({ center: [117.2272, 31.8206], zoom: 11 })
}

export const locaMethodDemos = {
  dispatchLocaCommand: () => locaActions.dispatchLocaCommand('loca:layer:visible', {
    layerId: LOCA_EXAMPLE_POINT_LAYER_ID,
    visible: true
  }),
  clearHandledCommands: () => locaActions.clearHandledCommands(0),
  setLayerInfo: () => locaActions.setLayerInfo('loca-demo-info', { visible: true, featureCount: 0 }),
  removeLayerInfo: () => locaActions.removeLayerInfo('loca-demo-info'),
  clearLayerInfo: () => locaActions.clearLayerInfo(),
  getLayerList: () => getLocaLayerInfoExample(),
  getLayerInfo: () => locaActions.getLayerInfo(LOCA_EXAMPLE_POINT_LAYER_ID),
  getFeatureInfo: () => getLocaFeatureInfoExample('loca-point-0'),
  renderGeoJSONLayer: () => renderLocaMassPointExample(),
  setLayerVisible: () => setLocaMassPointLayerVisible(false),
  setLayerCategoryVisible: () => setLocaBranchCategoryVisible(false),
  setFeaturesVisible: () => setLocaFeatureVisibleExample('loca-point-0', false),
  setLayerStyle: () => updateLocaMassPointStyleExample(),
  patchLayerStyle: () => patchLocaMassPointStyleExample(),
  setFeatureStyle: () => locaActions.setFeatureStyle(LOCA_EXAMPLE_POINT_LAYER_ID, 'loca-point-0', {
    radius: 14,
    color: '#f59e0b',
    borderWidth: 1,
    blurWidth: 0.2
  }),
  highlightFeature: () => highlightLocaFeatureExample('loca-point-0'),
  clearFeatureStyle: () => clearLocaFeatureStyleExample('loca-point-0'),
  clearLayerFeatureStyles: () => clearLocaFeatureStylesExample(),
  fitLayerView: () => locaActions.fitLayerView(LOCA_EXAMPLE_POINT_LAYER_ID, { padding: [80, 80] }),
  clearLayer: () => clearLocaExamples(),
  clearAllLayers: () => clearAllLocaLayersExample()
}
