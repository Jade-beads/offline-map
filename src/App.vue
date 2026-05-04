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
</style>
