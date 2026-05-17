<template>
  <div class="quadrant-legend">
    <div class="legend-items">
      <div v-for="item in items" :key="item.label" class="legend-item">
        <span class="dot" :style="{ background: item.color }"></span>
        <span class="item-label">{{ item.label }}</span>
      </div>
    </div>
    <div class="divider"></div>
    <div class="toggle-area">
      <span class="toggle-label">网点名称</span>
      <el-switch :value="showLabel" @change="$emit('update:showLabel', $event)" />
    </div>
  </div>
</template>

<script>
const DEFAULT_ITEMS = [
  { color: '#16a34a', label: '第一象限' },
  { color: '#1677ff', label: '第二象限' },
  { color: '#facc15', label: '第三象限' },
  { color: '#ef4444', label: '第四象限' }
]

export default {
  name: 'QuadrantLegend',
  model: {
    prop: 'showLabel',
    event: 'update:showLabel'
  },
  props: {
    items: {
      type: Array,
      default: () => DEFAULT_ITEMS
    },
    showLabel: {
      type: Boolean,
      default: true
    }
  }
}
</script>

<style scoped>
.quadrant-legend {
  position: fixed;
  left: 380px;
  bottom: 16px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border: 1px solid rgba(205, 215, 229, 0.78);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 4px 16px rgba(20, 45, 86, 0.12);
  color: #334155;
}

.legend-items {
  display: flex;
  align-items: center;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.item-label {
  color: #475569;
  font-size: 13px;
  white-space: nowrap;
}

.divider {
  width: 1px;
  height: 18px;
  background: rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.toggle-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-label {
  color: #475569;
  font-size: 13px;
  white-space: nowrap;
}
</style>
