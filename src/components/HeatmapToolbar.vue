<template>
  <section class="heatmap-toolbar">
    <header class="toolbar-header">
      <div class="toolbar-title">{{ title }}</div>
      <el-switch
        v-model="localVisible"
        class="visibility-switch"
        @change="handleVisibleChange"
      />
    </header>

    <div class="legend-row">
      <span class="legend-edge">{{ lowLabel }}</span>
      <div class="legend-body">
        <div class="legend-gradient" :style="{ background: gradientCss }"></div>
        <div class="legend-labels">
          <span
            v-for="stop in normalizedStops"
            :key="stop.value"
            class="legend-label"
          >
            {{ stop.label }}
          </span>
        </div>
      </div>
      <span class="legend-edge">{{ highLabel }}</span>
    </div>

    <div class="opacity-row">
      <span class="setting-label">透明度</span>
      <el-input-number
        v-model="localOpacity"
        :min="minOpacity"
        :max="maxOpacity"
        :step="step"
        size="small"
        controls-position="right"
        class="opacity-input"
        @change="updateOpacity"
      />
      <span class="opacity-unit">%</span>
      <el-slider
        v-model="localOpacity"
        :min="minOpacity"
        :max="maxOpacity"
        :step="step"
        :show-tooltip="false"
        class="opacity-slider"
        @change="updateOpacity"
      />
    </div>
  </section>
</template>

<script>
import { locaActions } from '../loca/loca-store'
import { mapActions } from '../map/map-store'

const DEFAULT_STOPS = [
  { value: 0.2, color: '#6b5ea8', label: '低' },
  { value: 0.45, color: '#84cc16', label: '30' },
  { value: 0.7, color: '#facc15', label: '60' },
  { value: 1, color: '#ef4444', label: '高' }
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizePercent(value, fallback) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function toPercent(value) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return null

  return numberValue <= 1 ? Math.round(numberValue * 100) : Math.round(numberValue)
}

function getHeatmapOpacity(styleSnapshot) {
  const heatmapStyle = styleSnapshot && styleSnapshot.heatmap
  const opacity = heatmapStyle && heatmapStyle.opacity
  if (Array.isArray(opacity)) {
    return opacity.length ? opacity[opacity.length - 1] : null
  }

  return opacity
}

function getLayerOpacity(info, mode) {
  if (!info) return null

  if (mode === 'map') {
    const heatmapOpacity = getHeatmapOpacity(info.styleSnapshot)
    return toPercent(heatmapOpacity == null ? info.opacity : heatmapOpacity)
  }

  const layerOptionsOpacity = info.layerOptions && info.layerOptions.opacity
  if (layerOptionsOpacity != null) return toPercent(layerOptionsOpacity)
  if (info.opacity != null) return toPercent(info.opacity)

  const heatmapOpacity = getHeatmapOpacity(info.styleSnapshot)
  if (heatmapOpacity != null) return toPercent(heatmapOpacity)

  const styleOpacity = info.style && info.style.opacity
  return toPercent(styleOpacity)
}

export default {
  name: 'HeatmapToolbar',
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
      default: '热力图'
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
      default: 5
    },
    lowLabel: {
      type: String,
      default: '低'
    },
    highLabel: {
      type: String,
      default: '高'
    },
    stops: {
      type: Array,
      default: () => DEFAULT_STOPS
    }
  },
  data() {
    return {
      localVisible: this.visible,
      localOpacity: clamp(normalizePercent(this.opacity, 80), this.minOpacity, this.maxOpacity)
    }
  },
  computed: {
    normalizedStops() {
      return this.stops
        .filter((stop) => stop && stop.color)
        .map((stop, index) => ({
          value: stop.value == null ? index : stop.value,
          color: stop.color,
          label: stop.label == null ? '' : String(stop.label)
        }))
    },
    gradientCss() {
      const stops = this.normalizedStops
      if (!stops.length) return ''

      return `linear-gradient(90deg, ${stops.map((stop, index) => {
        const percent = stops.length === 1 ? 100 : Math.round((index / (stops.length - 1)) * 100)
        return `${stop.color} ${percent}%`
      }).join(', ')})`
    },
    actionApi() {
      return this.mode === 'map' ? mapActions : locaActions
    },
    layerInfo() {
      return this.actionApi.getLayerInfo(this.layerId)
    }
  },
  watch: {
    layerInfo() {
      this.syncLayerState()
    },
    visible(nextVisible) {
      this.localVisible = nextVisible
    },
    opacity(nextOpacity) {
      this.localOpacity = clamp(normalizePercent(nextOpacity, this.localOpacity), this.minOpacity, this.maxOpacity)
    }
  },
  mounted() {
    this.syncLayerState()
  },
  methods: {
    syncLayerState() {
      const info = this.layerInfo
      if (!info) return

      if (typeof info.visible === 'boolean') {
        this.localVisible = info.visible
      }

      const opacity = getLayerOpacity(info, this.mode)
      if (opacity != null) {
        this.localOpacity = clamp(opacity, this.minOpacity, this.maxOpacity)
      }
    },
    handleVisibleChange(visible) {
      this.actionApi.setLayerVisible(this.layerId, visible)
      this.$emit('visible-change', visible)
    },
    updateOpacity(value) {
      this.localOpacity = clamp(value, this.minOpacity, this.maxOpacity)
      this.applyOpacity()
      this.$emit('opacity-change', this.localOpacity)
    },
    applyOpacity() {
      const opacityValue = this.localOpacity / 100

      if (this.mode === 'map') {
        this.actionApi.patchLayerStyle(this.layerId, {
          heatmap: {
            opacity: [0.15, opacityValue]
          }
        })
        return
      }

      this.actionApi.patchLayerStyle(this.layerId, {
        layerOptions: {
          opacity: opacityValue
        }
      })
    }
  }
}
</script>

<style scoped>
.heatmap-toolbar {
  position: absolute;
  left: 380px;
  bottom: 16px;
  z-index: 16;
  width: min(520px, calc(100vw - 420px));
  min-width: 420px;
  padding: 12px 14px 14px;
  border: 1px solid rgba(205, 215, 229, 0.78);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 8px 24px rgba(20, 45, 86, 0.15);
  color: #334155;
}

.toolbar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.toolbar-title {
  display: inline-flex;
  align-items: center;
  height: 24px;
  color: #B6002A;
  font-size: 15px;
  font-weight: 600;
}

.legend-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 24px;
  align-items: start;
  gap: 10px;
  margin-bottom: 14px;
}

.legend-edge {
  padding-top: 17px;
  color: #475569;
  font-size: 12px;
  white-space: nowrap;
}

.legend-body {
  min-width: 0;
}

.legend-gradient {
  height: 12px;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 7px;
  color: #475569;
  font-size: 12px;
}

.legend-label {
  min-width: 0;
  text-align: center;
  white-space: nowrap;
}

.opacity-row {
  display: grid;
  grid-template-columns: auto 104px 18px minmax(120px, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 32px;
}

.setting-label {
  color: #475569;
  font-size: 14px;
  white-space: nowrap;
}

.visibility-switch {
  flex: 0 0 auto;
}

.opacity-input {
  width: 104px;
}

.opacity-unit {
  color: #475569;
  font-size: 13px;
}

.opacity-slider {
  min-width: 120px;
}

@media (max-width: 980px) {
  .heatmap-toolbar {
    left: 12px;
    right: 12px;
    bottom: 12px;
    width: auto;
    min-width: 0;
  }

  .opacity-row {
    grid-template-columns: auto 104px 18px;
  }

  .opacity-slider {
    grid-column: 1 / -1;
  }
}
</style>
