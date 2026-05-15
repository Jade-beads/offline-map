<template>
  <section class="map-root">
    <div ref="container" class="map-container"></div>
    <div v-if="errorMessage" class="map-message error">{{ errorMessage }}</div>
    <div v-else-if="loading" class="map-message">地图正在加载中...</div>
    <div v-if="coordinateCopyTip" class="map-copy-tip">{{ coordinateCopyTip }}</div>
  </section>
</template>

<script>
import { MapController } from '../map/map-controller'
import { mapActions, mapStore } from '../map/map-store'
import { LocaController } from '../loca/loca-controller'
import { locaActions, locaStore } from '../loca/loca-store'

function toLngLatArray(lnglat) {
  if (!lnglat) return null
  if (typeof lnglat.toArray === 'function') return lnglat.toArray()
  if (typeof lnglat.getLng === 'function' && typeof lnglat.getLat === 'function') {
    return [lnglat.getLng(), lnglat.getLat()]
  }
  return Array.isArray(lnglat) ? lnglat : null
}

const MAP_OPTIONS = {
  viewMode: '2D',
  features: [],
  showLabel: false,
  showIndoorMap: false,
  jogEnable: false,
  animateEnable: false
}

const SATELLITE_TILE_HOSTS = [
  'webst01.is.autonavi.com',
  'webst02.is.autonavi.com',
  'webst03.is.autonavi.com',
  'webst04.is.autonavi.com'
]
const SATELLITE_TILE_TEMPLATE = 'http://webst0{1,2,3,4}.is.autonavi.com/appmaptile?style=6&x=[x]&y=[y]&z=[z]'

function createSatelliteLayer(AMap) {
  if (!AMap || typeof AMap.TileLayer !== 'function') return null

  const LayerConstructor = typeof AMap.TileLayer.Satellite === 'function' ? AMap.TileLayer.Satellite : AMap.TileLayer
  const layer = new LayerConstructor({
    tileUrl: SATELLITE_TILE_TEMPLATE,
    getTileUrl: getSatelliteTileUrl,
    zIndex: 1,
    zooms: [3, 18],
    dataZooms: [3, 18]
  })

  if (typeof layer.setTileUrl === 'function') {
    layer.setTileUrl(SATELLITE_TILE_TEMPLATE)
  }

  return layer
}

function getSatelliteTileUrl(x, y, z) {
  const host = SATELLITE_TILE_HOSTS[Math.abs(x + y) % SATELLITE_TILE_HOSTS.length]
  return `http://${host}/appmaptile?style=6&x=${x}&y=${y}&z=${z}`
}

function patchAmapOfflineRuntime(AMap) {
  const config = typeof AMap.getConfig === 'function' ? AMap.getConfig() : null
  if (config) {
    config.tileVersion = config.tileVersion || 'offline'
    config.styleVersion = config.styleVersion || 'offline'
    config.iconVersion = config.iconVersion || 'offline'
  }

  const MapConstructor = AMap && AMap.Map
  const prototype = MapConstructor && MapConstructor.prototype
  if (!prototype) return

  // mapsplugin.js 依赖该 API，当前离线 AMap3.js 构建没有直接暴露。
  if (typeof prototype.getOutseaState !== 'function') {
    prototype.getOutseaState = function getOutseaState() {
      return this.YG
    }
  }
}

function observeMapComplete(map, timeout = 8000) {
  if (!map || typeof map.on !== 'function') return () => {}

  let settled = false
  let timer = null

  const cleanup = () => {
    if (timer) {
      window.clearTimeout(timer)
      timer = null
    }

    if (typeof map.off === 'function') {
      map.off('complete', handleComplete)
    }
  }

  const finish = (completed) => {
    if (settled) return

    settled = true
    cleanup()

    if (!completed) {
      console.warn('[AmapMap] Map complete event timed out; tools are already initialized.')
    }
  }

  const handleComplete = () => {
    finish(true)
  }

  map.on('complete', handleComplete)
  timer = window.setTimeout(() => {
    finish(false)
  }, timeout)

  return cleanup
}

export default {
  name: 'AmapMap',
  data() {
    return {
      store: mapStore,
      locaStore,
      map: null,
      controller: null,
      locaController: null,
      cleanupMapCompleteObserver: null,
      moveEndHandler: null,
      zoomEndHandler: null,
      coordinatePickHandler: null,
      coordinateCopyTip: '',
      coordinateCopyTipTimer: null,
      loading: true,
      errorMessage: '',
      lastHandledCommandSeq: 0,
      lastHandledLocaCommandSeq: 0
    }
  },
  watch: {
    'store.commandSeq'() {
      this.drainCommandQueue()
    },
    'locaStore.commandSeq'() {
      this.drainLocaCommandQueue()
    },
    'store.activeTool'(tool) {
      if (tool === 'coordinate-picker') {
        this.bindCoordinatePicker()
      } else {
        this.clearCoordinatePicker()
      }
    }
  },
  mounted() {
    try {
      const AMap = window.AMap
      if (!AMap || typeof AMap.Map !== 'function') {
        throw new Error('window.AMap is missing. Please check public/amap/AMap3.js.')
      }

      patchAmapOfflineRuntime(AMap)
      const satelliteLayer = createSatelliteLayer(AMap)
      const map = new AMap.Map(this.$refs.container, {
        ...MAP_OPTIONS,
        layers: satelliteLayer ? [satelliteLayer] : [],
        zoom: this.store.viewport.zoom,
        center: this.store.viewport.center
      })
      if (typeof map.setStatus === 'function') {
        map.setStatus({
          jogEnable: false,
          animateEnable: false
        })
      }

      this.map = map
      this.bindMapEvents(map)
      this.cleanupMapCompleteObserver = observeMapComplete(map)

      this.controller = new MapController({
        AMap,
        map,
        actions: mapActions
      })

      this.setupLocaController(AMap, map)
      this.drainCommandQueue()
      if (this.store.activeTool === 'coordinate-picker') {
        this.bindCoordinatePicker()
      }
    } catch (error) {
      const message = error && error.message ? error.message : '请检查 public/amap 离线资源包。'
      this.errorMessage = `高德地图加载失败：${message}`
      console.error(error)
    } finally {
      this.loading = false
    }
  },
  beforeDestroy() {
    if (this.cleanupMapCompleteObserver) {
      this.cleanupMapCompleteObserver()
      this.cleanupMapCompleteObserver = null
    }

    this.clearMapEvents()
    this.clearCoordinatePicker()
    this.clearCoordinateCopyTip()

    if (this.locaController) {
      this.locaController.destroy()
      this.locaController = null
    }

    if (this.controller) {
      this.controller.destroy()
      this.controller = null
      this.map = null
    } else if (this.map) {
      this.map.destroy()
      this.map = null
    }
  },
  methods: {
    bindMapEvents(map) {
      if (!map || typeof map.on !== 'function') return

      this.moveEndHandler = () => {
        mapActions.setViewport({
          center: typeof map.getCenter === 'function' ? toLngLatArray(map.getCenter()) : null,
          bounds: typeof map.getBounds === 'function' ? map.getBounds() : null
        })
      }

      this.zoomEndHandler = () => {
        mapActions.setViewport({
          zoom: typeof map.getZoom === 'function' ? map.getZoom() : this.store.viewport.zoom
        })
      }

      map.on('moveend', this.moveEndHandler)
      map.on('zoomend', this.zoomEndHandler)
    },
    clearMapEvents() {
      if (!this.map || typeof this.map.off !== 'function') return

      if (this.moveEndHandler) {
        this.map.off('moveend', this.moveEndHandler)
        this.moveEndHandler = null
      }

      if (this.zoomEndHandler) {
        this.map.off('zoomend', this.zoomEndHandler)
        this.zoomEndHandler = null
      }

      this.clearCoordinatePicker()
    },
    bindCoordinatePicker() {
      if (!this.map || typeof this.map.on !== 'function') return

      this.clearCoordinatePicker()
      this.coordinatePickHandler = (event) => {
        const lnglat = toLngLatArray(event && event.lnglat)
        if (!lnglat) return

        this.clearCoordinatePicker()
        const coordinate = lnglat.join(',')
        mapActions.setCoordinatePickResult({
          position: lnglat,
          lng: lnglat[0],
          lat: lnglat[1],
          coordinate,
          timestamp: Date.now()
        })
        this.copyTextToClipboard(coordinate).then((copied) => {
          if (copied) {
            this.showCoordinateCopyTip(`坐标已复制：${coordinate}`)
          }
        })
        mapActions.setActiveTool('')
      }

      this.map.on('click', this.coordinatePickHandler)
    },
    clearCoordinatePicker() {
      if (!this.map || !this.coordinatePickHandler || typeof this.map.off !== 'function') {
        this.coordinatePickHandler = null
        return
      }

      this.map.off('click', this.coordinatePickHandler)
      this.coordinatePickHandler = null
    },
    copyTextToClipboard(text) {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(text).then(() => true).catch((error) => {
          console.warn('[AmapMap] Failed to copy map coordinate.', error)
          return false
        })
      }

      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()

      try {
        return Promise.resolve(document.execCommand('copy'))
      } catch (error) {
        console.warn('[AmapMap] Failed to copy map coordinate.', error)
        return Promise.resolve(false)
      } finally {
        document.body.removeChild(textarea)
      }
    },
    showCoordinateCopyTip(message) {
      this.clearCoordinateCopyTip()
      this.coordinateCopyTip = message
      this.coordinateCopyTipTimer = window.setTimeout(() => {
        this.coordinateCopyTip = ''
        this.coordinateCopyTipTimer = null
      }, 1600)
    },
    clearCoordinateCopyTip() {
      if (this.coordinateCopyTipTimer) {
        window.clearTimeout(this.coordinateCopyTipTimer)
        this.coordinateCopyTipTimer = null
      }
      this.coordinateCopyTip = ''
    },
    setupLocaController(AMap, map) {
      const Loca = window.Loca
      if (!Loca) {
        console.warn('[AmapMap] window.Loca is missing. Please check public/amap/Loca.js.')
        return
      }

      try {
        this.locaController = new LocaController({
          Loca,
          AMap,
          map,
          actions: locaActions
        })

        this.drainLocaCommandQueue()
      } catch (error) {
        console.warn('[AmapMap] Failed to initialize Loca controller.', error)
      }
    },
    drainCommandQueue() {
      if (!this.controller) return

      const commands = this.store.commandQueue
        .filter((command) => command.seq > this.lastHandledCommandSeq)
        .sort((a, b) => a.seq - b.seq)

      commands.forEach((command) => {
        try {
          this.controller.handleCommand(command)
        } catch (error) {
          console.error('[AmapMap] Failed to handle map command.', command, error)
        }
        this.lastHandledCommandSeq = command.seq
      })

      if (commands.length) {
        mapActions.clearHandledCommands(this.lastHandledCommandSeq)
      }
    },
    drainLocaCommandQueue() {
      if (!this.locaController) return

      const commands = this.locaStore.commandQueue
        .filter((command) => command.seq > this.lastHandledLocaCommandSeq)
        .sort((a, b) => a.seq - b.seq)

      commands.forEach((command) => {
        try {
          this.locaController.handleCommand(command)
        } catch (error) {
          console.error('[AmapMap] Failed to handle Loca command.', command, error)
        }
        this.lastHandledLocaCommandSeq = command.seq
      })

      if (commands.length) {
        locaActions.clearHandledCommands(this.lastHandledLocaCommandSeq)
      }
    }
  }
}
</script>

<style scoped>
.map-root,
.map-container {
  width: 100%;
  height: 100%;
}

.map-root {
  position: relative;
}

.map-container {
  background: #e9eef3;
}

.map-message {
  position: absolute;
  top: 112px;
  left: 50%;
  z-index: 30;
  min-width: 320px;
  padding: 12px 16px;
  transform: translateX(-50%);
  text-align: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 24px rgba(20, 45, 86, 0.18);
}

.map-message.error {
  color: #d93026;
}

.map-copy-tip {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 30;
  max-width: min(360px, calc(100% - 32px));
  padding: 10px 14px;
  overflow: hidden;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgba(17, 24, 39, 0.88);
  box-shadow: 0 8px 24px rgba(20, 45, 86, 0.22);
  pointer-events: none;
}
</style>

<style>
.geojson-map-marker {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  border-radius: 50% 50% 50% 0;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  background: var(--marker-color);
  box-shadow: 0 3px 9px rgba(24, 47, 77, 0.3);
  transform: rotate(-45deg);
}

.geojson-map-marker span {
  transform: rotate(45deg);
}

.geojson-map-html-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  pointer-events: auto;
}

.geojson-map-html-marker > * {
  box-sizing: border-box;
  flex: 0 0 auto;
}

.geojson-cluster-point-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  pointer-events: auto;
}

.geojson-cluster-point-marker img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.geojson-cluster-marker {
  box-sizing: border-box;
  border: 3px solid #fff;
  border-radius: 999px;
  text-align: center;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(24, 47, 77, 0.28);
  cursor: pointer;
}

.geojson-cluster-custom-marker {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  pointer-events: auto;
  cursor: pointer;
}

.geojson-cluster-custom-marker img,
.geojson-cluster-custom-marker svg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.geojson-cluster-custom-marker span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  pointer-events: none;
}

.custom-map-marker {
  position: relative;
  width: 24px;
  height: 24px;
  border: 2px solid #fff;
  border-radius: 50% 50% 50% 0;
  background: #2563eb;
  box-shadow: 0 3px 9px rgba(24, 47, 77, 0.34);
  transform: rotate(-45deg);
}

.custom-map-marker span {
  position: absolute;
  left: 7px;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
}

.amap-marker-label {
  box-sizing: border-box;
  max-width: 180px;
  padding: 5px 9px !important;
  overflow: hidden;
  border: 1px solid rgba(37, 99, 235, 0.18) !important;
  border-radius: 6px;
  color: #1f2937;
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.96) !important;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(4px);
}

.amap-marker-label::before {
  content: '';
  position: absolute;
  left: 14px;
  bottom: -5px;
  width: 8px;
  height: 8px;
  border-right: 1px solid rgba(37, 99, 235, 0.18);
  border-bottom: 1px solid rgba(37, 99, 235, 0.18);
  background: rgba(255, 255, 255, 0.96);
  transform: rotate(45deg);
}
</style>
