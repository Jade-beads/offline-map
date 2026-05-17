<template>
  <MapWorkspace />
</template>

<script>
import MapWorkspace from './components/MapWorkspace.vue'

export default {
  name: 'App',
  components: {
    MapWorkspace
  }
}
</script>

<style>
* {
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  font-family: Arial, 'Microsoft YaHei', sans-serif;
  color: #1f2d3d;
}

button,
input,
select {
  font: inherit;
}

.amap-marker-label {
  border: none !important;
  background: rgba(31, 45, 61, 0.88) !important;
  color: #e4e8f1 !important;
  border-radius: 3px !important;
  padding: 2px 8px !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  letter-spacing: 0.3px !important;
  white-space: nowrap !important;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.35) !important;
}

.amap-marker-label::before,
.amap-marker-label::after {
  display: none !important;
}

</style>
