<template>
  <section class="heatmap-toolbar">
    <div class="toolbar-title">{{ title }}</div>

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

    <div class="setting-row">
      <span class="setting-name">热力设置</span>
      <span class="setting-label">显示</span>
      <el-switch
        v-model="localVisible"
        class="visibility-switch"
        @change="handleVisibleChange"
      />
      <span class="setting-label opacity-label">热力程度</span>
      <el-button
        class="step-button"
        type="primary"
        size="mini"
        icon="el-icon-minus"
        @click="decreaseOpacity"
      />
      <span class="opacity-value">{{ localOpacity }}%</span>
      <el-button
        class="step-button"
        type="primary"
        size="mini"
        icon="el-icon-plus"
        @click="increaseOpacity"
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
      default: 10
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
    }
  },
  watch: {
    visible(nextVisible) {
      this.localVisible = nextVisible
    },
    opacity(nextOpacity) {
      this.localOpacity = clamp(normalizePercent(nextOpacity, this.localOpacity), this.minOpacity, this.maxOpacity)
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
    increaseOpacity() {
      this.updateOpacity(this.localOpacity + this.step)
    },
    decreaseOpacity() {
      this.updateOpacity(this.localOpacity - this.step)
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
  width: min(720px, calc(100vw - 420px));
  min-width: 520px;
  padding: 14px 18px 16px;
  border: 1px solid rgba(205, 215, 229, 0.78);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 8px 24px rgba(20, 45, 86, 0.15);
  color: #334155;
}

.toolbar-title {
  display: inline-flex;
  align-items: center;
  height: 28px;
  margin-bottom: 14px;
  color: #2563eb;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 3px solid #2563eb;
}

.legend-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 28px;
  align-items: start;
  gap: 12px;
  margin-bottom: 20px;
}

.legend-edge {
  padding-top: 21px;
  color: #475569;
  font-size: 13px;
  white-space: nowrap;
}

.legend-body {
  min-width: 0;
}

.legend-gradient {
  height: 16px;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 9px;
  color: #475569;
  font-size: 13px;
}

.legend-label {
  min-width: 0;
  text-align: center;
  white-space: nowrap;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 34px;
}

.setting-name {
  margin-right: 18px;
  color: #475569;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.setting-label {
  color: #475569;
  font-size: 14px;
  white-space: nowrap;
}

.visibility-switch {
  margin-right: 34px;
}

.opacity-label {
  margin-left: auto;
}

.step-button {
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 5px;
}

.opacity-value {
  width: 44px;
  text-align: center;
  color: #475569;
  font-size: 15px;
}

@media (max-width: 980px) {
  .heatmap-toolbar {
    left: 12px;
    right: 12px;
    bottom: 12px;
    width: auto;
    min-width: 0;
  }

  .setting-row {
    flex-wrap: wrap;
  }

  .opacity-label {
    margin-left: 0;
  }
}
</style>
