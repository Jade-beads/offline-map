<template>
  <div class="workspace">
    <AmapMap class="map-stage" />

    <section class="map-search">
      <input
        v-model="keyword"
        type="text"
        placeholder="输入坐标，例如 117.2272,31.8206"
        @keyup.enter="actions.searchCoordinate(keyword)"
      >
      <button class="icon-button search-button" type="button" title="定位坐标" @click="actions.searchCoordinate(keyword)">
        <span class="icon search-icon"></span>
      </button>
      <button class="tool-button" :class="{ active: store.activeTool === 'coordinate-picker' }" type="button" title="拾取坐标" @click="actions.activateCoordinatePicker()">
        <span class="icon coordinate-icon"></span>
      </button>
      <button class="tool-button" :class="{ active: store.activeTool === 'ruler' }" type="button" title="测距" @click="actions.activateRuler()">
        <span class="icon ruler-icon"></span>
      </button>
      <el-dropdown class="draw-tool" placement="bottom-start" @command="handleDrawCommand">
        <button
          class="tool-button"
          :class="{ active: store.activeTool.indexOf('draw:') === 0 }"
          type="button"
          title="绘图"
        >
          <span class="icon draw-icon"></span>
        </button>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="rectangle">矩形</el-dropdown-item>
          <el-dropdown-item command="circle">圆形</el-dropdown-item>
          <el-dropdown-item command="polygon">多边形</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
      <button class="tool-button" :class="{ active: store.activeTool === 'custom-marker' }" type="button" title="自定义标点" @click="actions.activateCustomMarker()">
        <span class="icon marker-icon"></span>
      </button>
      <button class="tool-button" type="button" title="放大" @click="actions.zoomIn()">
        <span class="icon plus-icon"></span>
      </button>
      <button class="tool-button" type="button" title="缩小" @click="actions.zoomOut()">
        <span class="icon minus-icon"></span>
      </button>
    </section>

    <section v-if="store.activeTool === 'coordinate-picker'" class="tool-status">
      <span>坐标拾取中：点击地图获取坐标并复制。</span>
      <button type="button" @click="actions.setActiveTool('')">取消</button>
    </section>

    <section v-else-if="store.activeTool === 'ruler'" class="tool-status">
      <span>测距中：在地图上点击两个或多个点，双击或右键结束。</span>
      <button type="button" @click="actions.restartRuler()">重新选择</button>
      <button type="button" @click="actions.clearRuler()">删除</button>
    </section>

    <HeatmapToolbar
      v-if="heatmapToolbarVisible"
      :layer-id="heatmapToolbarLayerId"
      mode="loca"
      title="热力图"
      :visible="heatmapLayerVisible"
      :opacity="heatmapLayerOpacity"
      :stops="heatmapLegendStops"
      low-label="低"
      high-label="高"
      @visible-change="heatmapLayerVisible = $event"
      @opacity-change="heatmapLayerOpacity = $event"
    />

    <section class="example-panel">
      <div class="example-title">功能示例</div>
      <div class="example-actions">
        <el-button size="mini" @click="handlePatchMixedLayerStyle">Patch普通样式</el-button>
        <el-button size="mini" @click="handlePatchClusterLayerStyle">Patch聚合样式</el-button>
        <el-button size="mini" @click="handlePatchLocaStyle">PatchLoca样式</el-button>
        <el-button size="mini" @click="handleRenderMixedOverlays">渲染点线面</el-button>
        <el-button size="mini" @click="handleHideMixedPoint">隐藏点</el-button>
        <el-button size="mini" @click="handleShowMixedPoint">显示点</el-button>
        <el-button size="mini" @click="handleRenderRegionBoundary">渲染边界</el-button>
        <el-button size="mini" @click="handleUpdateRegionStyle">边界换色</el-button>
        <el-button size="mini" @click="handleClearRegionBoundary">清除边界</el-button>
        <el-button size="mini" @click="handleHighlightPoint">高亮点</el-button>
        <el-button size="mini" @click="handleHighlightLine">高亮线</el-button>
        <el-button size="mini" @click="handleHighlightPolygon">高亮面</el-button>
        <el-button size="mini" @click="handleClearHighlight">取消高亮</el-button>
        <el-button size="mini" @click="handleRenderPrefixLayer">前缀图层</el-button>
        <el-button size="mini" @click="handleClearPrefixLayer">清前缀</el-button>
        <el-button size="mini" @click="handleRenderClusterLayer">点聚合</el-button>
        <el-button size="mini" @click="handleClearClusterLayer">清聚合</el-button>
        <el-button size="mini" @click="handleRenderMvGridThinning">加载MVT</el-button>
        <el-button size="mini" @click="handleShowFeatureInfo">要素信息</el-button>
        <el-button size="mini" @click="handleShowLayerInfo">图层信息</el-button>
        <el-button size="mini" @click="handleClearAllMapLayers">清空地图</el-button>
        <el-button size="mini" @click="handleRenderLocaMassPoints">Loca海量点</el-button>
        <el-button size="mini" @click="handleUpdateLocaStyle">Loca换色</el-button>
        <el-button size="mini" @click="handleHighlightLocaPoint">Loca高亮</el-button>
        <el-button size="mini" @click="handleClearLocaHighlight">清Loca高亮</el-button>
        <el-button size="mini" @click="handleRenderLocaHeatmap">Loca热力</el-button>
        <el-button size="mini" @click="handleRenderLocaGrid">Loca网格</el-button>
        <el-button size="mini" @click="handleHideLocaBranch">隐藏网点</el-button>
        <el-button size="mini" @click="handleShowLocaBranch">显示网点</el-button>
        <el-button size="mini" @click="handleClearLocaExamples">清除Loca</el-button>
        <el-button size="mini" @click="handleShowLocaLayerInfo">Loca信息</el-button>
        <el-button size="mini" @click="handleClearAllLocaLayers">清空Loca</el-button>
      </div>
    </section>
  </div>
</template>

<script>
import AmapMap from './AmapMap.vue'
import HeatmapToolbar from './HeatmapToolbar.vue'
import { mapActions, mapStore } from '../map/map-store'
import {
  EXAMPLE_FEATURE_IDS,
  clearAllMapLayersExample,
  clearClusterLayerExample,
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
  setMixedFeatureVisibleExample,
  updateRegionBoundaryStyleExample
} from '../examples/map-feature-examples'
import {
  renderMvGridThinningVectorTileExample
} from '../examples/vector-tile-feature-examples'
import {
  clearAllLocaLayersExample,
  clearLocaFeatureStyleExample,
  clearLocaExamples,
  getLocaFeatureInfoExample,
  getLocaLayerInfoExample,
  highlightLocaFeatureExample,
  LOCA_EXAMPLE_HEAT_LAYER_ID,
  LOCA_EXAMPLE_HIGHLIGHT_FEATURE_ID,
  patchLocaMassPointStyleExample,
  renderLocaGridExample,
  renderLocaHeatmapExample,
  renderLocaMassPointExample,
  setLocaBranchCategoryVisible,
  updateLocaMassPointStyleExample
} from '../examples/loca-feature-examples'

export default {
  name: 'MapWorkspace',
  components: {
    AmapMap,
    HeatmapToolbar
  },
  data() {
    return {
      store: mapStore,
      actions: mapActions,
      keyword: '',
      heatmapToolbarVisible: false,
      heatmapToolbarLayerId: LOCA_EXAMPLE_HEAT_LAYER_ID,
      heatmapLayerVisible: true,
      heatmapLayerOpacity: 86,
      heatmapLegendStops: [
        { value: 0.2, color: '#6b5ea8', label: '913.5万' },
        { value: 0.45, color: '#84cc16', label: '1,748.7万' },
        { value: 0.7, color: '#facc15', label: '2,500.1万' },
        { value: 0.85, color: '#f97316', label: '2,998.8万' },
        { value: 1, color: '#ef4444', label: '10,834.8万' }
      ]
    }
  },
  watch: {
    'store.coordinatePickResult'(result) {
      if (!result || !result.coordinate) return

      this.keyword = result.coordinate
    }
  },
  methods: {
    handleDrawCommand(shape) {
      this.actions.activateDraw(shape)
    },
    handleRenderRegionBoundary() {
      renderRegionBoundaryExample()
    },
    handleUpdateRegionStyle() {
      updateRegionBoundaryStyleExample()
    },
    handlePatchMixedLayerStyle() {
      patchMixedLayerStyleExample()
    },
    handleClearRegionBoundary() {
      clearRegionBoundaryExample()
    },
    handleRenderMixedOverlays() {
      renderMixedOverlayExample()
    },
    handleHideMixedPoint() {
      setMixedFeatureVisibleExample(EXAMPLE_FEATURE_IDS.point, false)
    },
    handleShowMixedPoint() {
      setMixedFeatureVisibleExample(EXAMPLE_FEATURE_IDS.point, true)
    },
    handleHighlightPoint() {
      highlightMixedFeatureExample(EXAMPLE_FEATURE_IDS.point)
    },
    handleHighlightLine() {
      highlightMixedFeatureExample(EXAMPLE_FEATURE_IDS.line)
    },
    handleHighlightPolygon() {
      highlightMixedFeatureExample(EXAMPLE_FEATURE_IDS.polygon)
    },
    handleClearHighlight() {
      clearMixedHighlightExample()
    },
    handleRenderPrefixLayer() {
      renderPrefixLayerExample()
    },
    handleClearPrefixLayer() {
      clearPrefixLayerExample()
    },
    handleRenderClusterLayer() {
      renderClusterLayerExample()
    },
    handlePatchClusterLayerStyle() {
      patchClusterLayerStyleExample()
    },
    handleClearClusterLayer() {
      clearClusterLayerExample()
    },
    handleRenderMvGridThinning() {
      renderMvGridThinningVectorTileExample()
      this.showMessage('已触发 MVT 图层加载')
    },
    handleShowFeatureInfo() {
      const feature = getMixedFeatureInfoExample(EXAMPLE_FEATURE_IDS.point)
      console.log(feature)
      this.showMessage(feature ? '已输出要素信息到控制台。' : '请先渲染点线面示例。')
    },
    handleShowLayerInfo() {
      const layers = getLayerInfoExample()
      console.log(layers)
      this.showMessage(`当前共有 ${layers.length} 个普通图层，详情见控制台。`)
    },
    handleClearAllMapLayers() {
      clearAllMapLayersExample()
    },
    handleRenderLocaMassPoints() {
      renderLocaMassPointExample()
    },
    handleUpdateLocaStyle() {
      updateLocaMassPointStyleExample()
    },
    handlePatchLocaStyle() {
      patchLocaMassPointStyleExample()
    },
    handleHighlightLocaPoint() {
      highlightLocaFeatureExample(LOCA_EXAMPLE_HIGHLIGHT_FEATURE_ID)
    },
    handleClearLocaHighlight() {
      clearLocaFeatureStyleExample(LOCA_EXAMPLE_HIGHLIGHT_FEATURE_ID)
    },
    handleRenderLocaHeatmap() {
      renderLocaHeatmapExample()
      this.heatmapToolbarVisible = true
      this.heatmapLayerVisible = true
      this.heatmapLayerOpacity = 86
    },
    handleRenderLocaGrid() {
      renderLocaGridExample()
    },
    handleHideLocaBranch() {
      setLocaBranchCategoryVisible(false)
    },
    handleShowLocaBranch() {
      setLocaBranchCategoryVisible(true)
    },
    handleClearLocaExamples() {
      clearLocaExamples()
      this.heatmapToolbarVisible = false
    },
    handleShowLocaLayerInfo() {
      const layers = getLocaLayerInfoExample()
      const feature = getLocaFeatureInfoExample(LOCA_EXAMPLE_HIGHLIGHT_FEATURE_ID)
      console.log(layers, feature)
      this.showMessage(`当前共有 ${layers.length} 个 Loca 图层，详情见控制台。`)
    },
    handleClearAllLocaLayers() {
      clearAllLocaLayersExample()
      this.heatmapToolbarVisible = false
    },
    showMessage(message) {
      this.$message({
        message,
        type: 'success',
        duration: 1800
      })
    }
  }
}
</script>

<style scoped>
.workspace {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #dce6f2;
}

.map-stage {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.map-search {
  position: absolute;
  top: 16px;
  left: 50%;
  z-index: 15;
  display: flex;
  width: min(760px, 44vw);
  min-width: 620px;
  height: 44px;
  align-items: center;
  padding: 4px;
  transform: translateX(-50%);
  border: 1px solid rgba(207, 216, 228, 0.72);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 6px 18px rgba(20, 45, 86, 0.14);
  backdrop-filter: blur(4px);
}

.map-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  padding: 0 12px;
  outline: 0;
  background: transparent;
  color: #334155;
}

.map-search > button,
.map-search .draw-tool > button {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 6px;
  color: #4b5f76;
  background: transparent;
  cursor: pointer;
}

.icon-button,
.tool-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 2px;
}

.search-button {
  color: #2e6fd8;
  background: #edf5ff !important;
}

.tool-button.active,
.tool-button:hover,
.draw-tool:hover > .tool-button {
  color: #168eea;
  background: #edf5ff;
}

.icon {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 18px;
}

.search-icon::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  left: 1px;
  top: 1px;
  border: 3px solid currentColor;
  border-radius: 50%;
}

.search-icon::after {
  content: '';
  position: absolute;
  width: 9px;
  height: 3px;
  right: 0;
  bottom: 2px;
  background: currentColor;
  transform: rotate(45deg);
  transform-origin: center;
}

.coordinate-icon::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 3px;
  width: 10px;
  height: 10px;
  border: 2px solid currentColor;
  border-radius: 50%;
}

.coordinate-icon::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(currentColor, currentColor) center / 2px 18px no-repeat,
    linear-gradient(currentColor, currentColor) center / 18px 2px no-repeat;
}

.ruler-icon::before {
  content: '';
  position: absolute;
  inset: 3px 1px 5px;
  border: 2px solid currentColor;
  transform: rotate(-28deg);
}

.ruler-icon::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 5px;
  width: 2px;
  height: 8px;
  background: currentColor;
  box-shadow: 4px 0 0 currentColor;
  transform: rotate(-28deg);
}

.draw-icon::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 2px;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-radius: 2px;
}

.draw-icon::after {
  content: '';
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 8px;
  height: 2px;
  background: currentColor;
  transform: rotate(-45deg);
}

.marker-icon::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 10px;
  height: 10px;
  border: 2px solid currentColor;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
}

.marker-icon::after {
  content: '';
  position: absolute;
  left: 8px;
  top: 5px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
}

.plus-icon::before,
.minus-icon::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 8px;
  width: 12px;
  height: 2px;
  background: currentColor;
}

.plus-icon::after {
  content: '';
  position: absolute;
  left: 8px;
  top: 3px;
  width: 2px;
  height: 12px;
  background: currentColor;
}

.draw-tool {
  position: relative;
  display: flex;
}

.tool-status {
  position: absolute;
  top: 112px;
  left: 50%;
  z-index: 15;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  padding: 6px 10px;
  transform: translateX(-50%);
  color: #42566d;
  font-size: 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 24px rgba(20, 45, 86, 0.16);
}

.tool-status button {
  height: 24px;
  border: 1px solid #9dccff;
  border-radius: 4px;
  color: #168eea;
  background: #fff;
  cursor: pointer;
}

.example-panel {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 15;
  width: 336px;
  max-height: calc(100vh - 140px);
  overflow: auto;
  padding: 12px;
  border: 1px solid rgba(207, 216, 228, 0.72);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 24px rgba(20, 45, 86, 0.16);
}

.example-title {
  margin-bottom: 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.example-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.example-actions .el-button {
  margin: 0;
}

@media (max-width: 860px) {
  .map-search {
    top: 12px;
    width: calc(100vw - 24px);
    min-width: 0;
  }

  .example-panel {
    left: 12px;
    right: 12px;
    bottom: 12px;
    width: auto;
  }
}
</style>
