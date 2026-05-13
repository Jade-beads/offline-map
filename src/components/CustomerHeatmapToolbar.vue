<template>
  <section class="customer-heatmap-toolbar">
    <div class="toolbar-title">{{ title }}</div>

    <div class="legend-row">
      <span class="legend-edge">低</span>
      <div class="legend-blocks">
        <div
          v-for="(stop, index) in normalizedStops"
          :key="index"
          class="legend-block"
          :style="{ background: stop.color }"
        />
      </div>
      <span class="legend-edge">高</span>
    </div>

    <div class="control-row">
      <span class="control-label">热力图展示</span>
      <el-switch
        v-model="localVisible"
        @change="handleVisibleChange"
      />
      <span class="control-label opacity-label">热力图透明度</span>
      <el-input-number
        v-model="localOpacity"
        :min="minOpacity"
        :max="maxOpacity"
        :step="step"
        controls-position="right"
        size="small"
        class="opacity-input"
        @change="handleOpacityChange"
      />
    </div>
  </section>
</template>

<script>
import { locaActions } from '../loca/loca-store'
import { mapActions } from '../map/map-store'

// 截图中的默认离散色块
const DEFAULT_STOPS = [
  { color: '#00cc00' },
  { color: '#ccff00' },
  { color: '#ffcc88' },
  { color: '#ffddbb' },
  { color: '#ccff88' },
  { color: '#ff66bb' },
  { color: '#cc00ff' },
  { color: '#ff0055' }
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export default {
  name: 'CustomerHeatmapToolbar',
  props: {
    layerId: {
      type: String,
      required: true
    },
    mode: {
      type: String,
      default: 'loca'
    },
    title: {
      type: String,
      default: '客群热力'
    },
    visible: {
      type: Boolean,
      default: true
    },
    opacity: {
      type: Number,
      default: 80
    },
    minOpacity: {
      type: Number,
      default: 10
    },
    maxOpacity: {
      type: Number,
      default: 100
    },
    step: {
      type: Number,
      default: 10
    },
    stops: {
      type: Array,
      default: () => DEFAULT_STOPS
    }
  },
  data() {
    return {
      localVisible: this.visible,
      localOpacity: clamp(this.opacity, this.minOpacity, this.maxOpacity)
    }
  },
  computed: {
    normalizedStops() {
      return this.stops.filter(s => s && s.color)
    },
    actionApi() {
      return this.mode === 'map' ? mapActions : locaActions
    }
  },
  watch: {
    visible(val) {
      this.localVisible = val
    },
    opacity(val) {
      this.localOpacity = clamp(val, this.minOpacity, this.maxOpacity)
    }
  },
  mounted() {
    this.applyOpacity()
    this.handleVisibleChange(this.localVisible)
  },
  methods: {
    handleVisibleChange(visible) {
      this.actionApi.setLayerVisible(this.layerId, visible)
      this.$emit('visible-change', visible)
    },
    handleOpacityChange(value) {
      this.localOpacity = clamp(value, this.minOpacity, this.maxOpacity)
      this.applyOpacity()
      this.$emit('opacity-change', this.localOpacity)
    },
    applyOpacity() {
      const opacityValue = this.localOpacity / 100
      if (this.mode === 'map') {
        this.actionApi.patchLayerStyle(this.layerId, {
          heatmap: { opacity: [0.15, opacityValue] }
        })
      } else {
        this.actionApi.patchLayerStyle(this.layerId, {
          layerOptions: { opacity: opacityValue }
        })
      }
    }
  }
}
</script>

<style scoped>
.customer-heatmap-toolbar {
  display: inline-flex;
  flex-direction: column;
  padding: 12px 16px 14px;
  border: 1px solid rgba(205, 215, 229, 0.78);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 4px 16px rgba(20, 45, 86, 0.12);
  color: #334155;
  min-width: 380px;
}

.toolbar-title {
  margin-bottom: 12px;
  color: #1e293b;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.legend-edge {
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

.legend-blocks {
  display: flex;
  flex: 1;
  height: 22px;
  border-radius: 3px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.legend-block {
  flex: 1;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-label {
  color: #475569;
  font-size: 13px;
  white-space: nowrap;
}

.opacity-label {
  margin-left: auto;
}

.opacity-input {
  width: 88px;
}
</style>
