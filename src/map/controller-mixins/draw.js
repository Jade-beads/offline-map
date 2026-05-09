/**
 * MapController 的"绘制工具"mixin。
 * 通过 Object.assign(MapController.prototype, drawMixin) 合并到主类。
 *
 * 依赖宿主类提供的字段/方法：
 *   - this.AMap / this.map / this.actions
 *   - this.mouseTool / this.currentDrawShape / this.drawCompleteHandler
 *   - this.drawOverlays / this.drawOverlaySeq / this.activeDrawOverlayId
 *   - this.drawEditor / this.drawEditorOverlayId / this.drawEditorHandlers
 *   - this.drawContextMenu / this.drawContextMenuTargetId
 *   - this.clearCustomMarkerHandler  (来自 customMarker mixin)
 *   - this.clearRuler                (来自主类)
 *   - this.warnToolUnavailable       (来自主类)
 *   - this.createContextMenu / this.addContextMenuItem / this.closeContextMenu
 */
import { getOverlayBounds } from '../utils/coord'
import { scheduleTask } from '../utils/dom'
import { overlayToGeoJSON } from '../utils/overlay'

const DRAW_OPTIONS = {
  fillColor: '#5f97f0',
  fillOpacity: 0.24,
  strokeColor: '#168eea',
  strokeOpacity: 0.95,
  strokeWeight: 2
}

const DRAW_EDITOR_OPTIONS = {
  editOptions: {
    fillColor: '#5f97f0',
    fillOpacity: 0.2,
    strokeColor: '#f59e0b',
    strokeOpacity: 1,
    strokeWeight: 3
  }
}

const DRAW_EDITOR_EVENTS = ['end', 'adjust', 'move', 'addnode', 'removenode', 'change']

export const drawMixin = {
  startDraw(shape) {
    this.clearCustomMarkerHandler()
    this.clearRuler()
    this.stopEditDrawOverlay({
      keepActiveTool: true
    })

    const mouseTool = this.getMouseTool()
    if (!mouseTool) {
      this.warnToolUnavailable('AMap.MouseTool')
      return
    }

    this.currentDrawShape = shape
    this.bindDrawCompleteHandler(mouseTool)

    if (shape === 'rectangle') {
      mouseTool.rectangle(DRAW_OPTIONS)
      return
    }

    if (shape === 'circle') {
      mouseTool.circle(DRAW_OPTIONS)
      return
    }

    if (shape === 'polygon') {
      mouseTool.polygon(DRAW_OPTIONS)
    }
  },

  getMouseTool() {
    if (typeof this.AMap.MouseTool !== 'function') {
      return null
    }

    if (!this.mouseTool) {
      this.mouseTool = new this.AMap.MouseTool(this.map)
    }

    return this.mouseTool
  },

  bindDrawCompleteHandler(mouseTool) {
    if (!mouseTool || typeof mouseTool.on !== 'function') return

    if (this.drawCompleteHandler) return

    this.drawCompleteHandler = (event) => {
      this.handleDrawComplete(event)
    }
    mouseTool.on('draw', this.drawCompleteHandler)
  },

  clearDrawCompleteHandler() {
    if (!this.mouseTool || !this.drawCompleteHandler || typeof this.mouseTool.off !== 'function') return

    this.mouseTool.off('draw', this.drawCompleteHandler)
    this.drawCompleteHandler = null
  },

  handleDrawComplete(event = {}) {
    const overlay = event.obj
    const shape = this.currentDrawShape || 'unknown'
    const record = this.registerDrawOverlay(shape, overlay)
    const result = this.createDrawResult(record)

    if (!result) return

    this.activeDrawOverlayId = record.id
    this.updateDrawOverlayInfo(record)

    this.closeMouseTool(false)
    if (this.actions.setActiveTool) {
      this.actions.setActiveTool('')
    }

    scheduleTask(() => {
      const thumbnailResult = this.captureThumbnail()
      this.syncDrawResult(record, {
        ...result,
        ...thumbnailResult
      }, 'create')
    }, 80)
  },

  registerDrawOverlay(shape, overlay) {
    if (!overlay) return null

    const id = `draw-${Date.now()}-${this.drawOverlaySeq += 1}`
    const record = {
      id,
      shape,
      overlay,
      editing: false,
      rightClickHandler: null
    }

    if (typeof overlay.setExtData === 'function') {
      const oldExtData = typeof overlay.getExtData === 'function' ? overlay.getExtData() : {}
      overlay.setExtData({
        ...(oldExtData || {}),
        id,
        type: 'draw-overlay',
        shape
      })
    }

    this.bindDrawOverlayContextMenu(record)
    this.drawOverlays.set(id, record)
    return record
  },

  createDrawResult(record) {
    if (!record || !record.overlay) return null

    const bounds = getOverlayBounds(record.overlay)
    const geoJSON = overlayToGeoJSON(record.shape, record.overlay, bounds)
    const result = {
      id: record.id,
      shape: record.shape,
      geoJSON,
      bounds,
      thumbnail: '',
      thumbnailError: ''
    }

    return result
  },

  emitDrawOverlayAction(type, record = null, result = null, extra = {}) {
    if (!this.actions.setDrawOverlayAction) return

    this.actions.setDrawOverlayAction({
      type,
      id: record ? record.id : '',
      shape: record ? record.shape : '',
      result,
      overlayCount: this.drawOverlays.size,
      timestamp: Date.now(),
      ...extra
    })
  },

  syncDrawResult(record, result, actionType) {
    if (this.actions.setDrawResult) {
      this.actions.setDrawResult(result)
    }
    if (actionType) {
      this.emitDrawOverlayAction(actionType, record, result)
    }
  },

  updateDrawResultFromRecord(record, withThumbnail = false, actionType = 'update') {
    const result = this.createDrawResult(record)
    if (!result) return

    if (!withThumbnail) {
      this.syncDrawResult(record, result, actionType)
      return
    }

    scheduleTask(() => {
      const thumbnailResult = this.captureThumbnail()
      this.syncDrawResult(record, {
        ...result,
        ...thumbnailResult
      }, actionType)
    }, 80)
  },

  getDrawOverlayRecord(id) {
    const targetId = id == null || id === ''
      ? this.activeDrawOverlayId
      : String(id)

    if (targetId && this.drawOverlays.has(targetId)) {
      return this.drawOverlays.get(targetId)
    }

    const records = Array.from(this.drawOverlays.values())
    return records.length ? records[records.length - 1] : null
  },

  updateDrawOverlayInfo(record = this.getDrawOverlayRecord()) {
    if (!this.actions.setDrawOverlayInfo) return

    if (!record) {
      this.actions.setDrawOverlayInfo(null)
      return
    }

    this.actions.setDrawOverlayInfo({
      id: record.id,
      shape: record.shape,
      editing: Boolean(record.editing),
      overlayCount: this.drawOverlays.size
    })
  },

  getDrawEditorConstructor(shape) {
    if (shape === 'circle') {
      return typeof this.AMap.CircleEditor === 'function' ? this.AMap.CircleEditor : null
    }

    if (shape === 'rectangle' && typeof this.AMap.RectangleEditor === 'function') {
      return this.AMap.RectangleEditor
    }

    if ((shape === 'rectangle' || shape === 'polygon') && typeof this.AMap.PolygonEditor === 'function') {
      return this.AMap.PolygonEditor
    }

    return null
  },

  startEditDrawOverlay(payload = {}) {
    const record = this.getDrawOverlayRecord(payload && payload.id)
    if (!record) return

    if (this.drawEditor && this.drawEditorOverlayId === record.id) {
      return
    }

    this.stopEditDrawOverlay({
      keepActiveTool: true
    })

    const Editor = this.getDrawEditorConstructor(record.shape)
    if (!Editor) {
      this.warnToolUnavailable(record.shape === 'circle' ? 'AMap.CircleEditor' : 'AMap.PolygonEditor')
      return
    }

    this.activeDrawOverlayId = record.id
    this.drawEditorOverlayId = record.id
    this.drawEditor = new Editor(this.map, record.overlay, DRAW_EDITOR_OPTIONS)

    if (this.drawEditor && typeof this.drawEditor.setTarget === 'function') {
      this.drawEditor.setTarget(record.overlay)
    }

    this.bindDrawEditorEvents(record)

    if (this.drawEditor && typeof this.drawEditor.open === 'function') {
      this.drawEditor.open()
    }

    record.editing = true
    this.updateDrawOverlayInfo(record)
    this.emitDrawOverlayAction('edit-start', record, this.createDrawResult(record))
  },

  bindDrawEditorEvents(record) {
    if (!this.drawEditor || typeof this.drawEditor.on !== 'function') return

    this.drawEditorHandlers = DRAW_EDITOR_EVENTS.map((eventName) => {
      const handler = () => {
        this.updateDrawResultFromRecord(record)
      }
      this.drawEditor.on(eventName, handler)
      return {
        eventName,
        handler
      }
    })
  },

  clearDrawEditorEvents() {
    if (!this.drawEditor || typeof this.drawEditor.off !== 'function') {
      this.drawEditorHandlers = []
      return
    }

    this.drawEditorHandlers.forEach(({ eventName, handler }) => {
      this.drawEditor.off(eventName, handler)
    })
    this.drawEditorHandlers = []
  },

  stopEditDrawOverlay(options = {}) {
    if (!this.drawEditor) return

    const record = this.getDrawOverlayRecord(this.drawEditorOverlayId)
    if (typeof this.drawEditor.close === 'function') {
      this.drawEditor.close()
    }

    this.clearDrawEditorEvents()

    if (typeof this.drawEditor.destroy === 'function') {
      this.drawEditor.destroy()
    }

    this.drawEditor = null
    this.drawEditorOverlayId = ''

    if (record) {
      record.editing = false
      if (!options.skipResultUpdate) {
        this.updateDrawResultFromRecord(record, true, 'edit-stop')
      }
      this.updateDrawOverlayInfo(record)
    }

    if (!options.keepActiveTool && this.actions.setActiveTool) {
      this.actions.setActiveTool('')
    }
  },

  deleteDrawOverlay(payload = {}) {
    const record = this.getDrawOverlayRecord(payload && payload.id)
    if (!record) return
    const deletedResult = this.createDrawResult(record)

    if (this.drawEditorOverlayId === record.id) {
      this.stopEditDrawOverlay({
        keepActiveTool: true,
        skipResultUpdate: true
      })
    }

    this.unbindDrawOverlayContextMenu(record)
    if (typeof this.map.remove === 'function') {
      this.map.remove(record.overlay)
    } else if (record.overlay && typeof record.overlay.setMap === 'function') {
      record.overlay.setMap(null)
    }

    this.drawOverlays.delete(record.id)
    if (this.activeDrawOverlayId === record.id) {
      const records = Array.from(this.drawOverlays.values())
      this.activeDrawOverlayId = records.length ? records[records.length - 1].id : ''
    }

    this.closeContextMenu('drawContextMenu')

    if (this.actions.clearDrawResult) {
      this.actions.clearDrawResult()
    }

    this.updateDrawOverlayInfo()
    this.emitDrawOverlayAction('delete', record, deletedResult)
  },

  clearDrawOverlays(options = {}) {
    const records = Array.from(this.drawOverlays.values())
    const clearedRecords = records.map((record) => ({
      id: record.id,
      shape: record.shape,
      result: this.createDrawResult(record)
    }))

    this.stopEditDrawOverlay({
      keepActiveTool: true,
      skipResultUpdate: true
    })

    this.closeContextMenu('drawContextMenu')

    const overlays = records.map((record) => {
      this.unbindDrawOverlayContextMenu(record)
      return record.overlay
    }).filter(Boolean)

    if (overlays.length && typeof this.map.remove === 'function') {
      this.map.remove(overlays)
    } else {
      overlays.forEach((overlay) => {
        if (overlay && typeof overlay.setMap === 'function') {
          overlay.setMap(null)
        }
      })
    }

    this.drawOverlays.clear()
    this.activeDrawOverlayId = ''
    this.drawContextMenuTargetId = ''

    if (!options.keepResult && this.actions.clearDrawResult) {
      this.actions.clearDrawResult()
    }

    this.updateDrawOverlayInfo(null)
    if (!options.keepResult && clearedRecords.length) {
      this.emitDrawOverlayAction('clear', null, null, {
        id: '',
        shape: '',
        records: clearedRecords,
        ids: clearedRecords.map((record) => record.id),
        overlayCount: 0
      })
    }
  },

  openDrawContextMenu(record, lnglat) {
    const menu = this.createContextMenu('drawContextMenu')
    if (!menu) return

    let index = 0
    const isEditingCurrentOverlay = this.drawEditorOverlayId === record.id && record.editing
    const canEdit = isEditingCurrentOverlay || Boolean(this.getDrawEditorConstructor(record.shape))

    if (isEditingCurrentOverlay) {
      this.addContextMenuItem(menu, 'drawContextMenu', '完成编辑', () => {
        this.stopEditDrawOverlay()
      }, index)
      index += 1
    } else if (canEdit) {
      this.addContextMenuItem(menu, 'drawContextMenu', '编辑图形', () => {
        this.startEditDrawOverlay({
          id: record.id
        })
      }, index)
      index += 1
    }

    this.addContextMenuItem(menu, 'drawContextMenu', '删除图形', () => {
      this.deleteDrawOverlay({
        id: record.id
      })
    }, index)
    index += 1

    if (this.drawOverlays.size > 1) {
      this.addContextMenuItem(menu, 'drawContextMenu', '清空绘图', () => {
        this.clearDrawOverlays()
      }, index)
    }

    if (typeof menu.open === 'function') {
      menu.open(this.map, lnglat)
    }
  },

  bindDrawOverlayContextMenu(record) {
    if (!record || !record.overlay || typeof record.overlay.on !== 'function') return

    record.rightClickHandler = (event = {}) => {
      this.drawContextMenuTargetId = record.id
      this.activeDrawOverlayId = record.id
      this.updateDrawOverlayInfo(record)

      this.openDrawContextMenu(record, event.lnglat)

      const originEvent = event.originEvent || event.originalEvent
      if (originEvent && typeof originEvent.preventDefault === 'function') {
        originEvent.preventDefault()
      }
      if (originEvent && typeof originEvent.stopPropagation === 'function') {
        originEvent.stopPropagation()
      }
    }

    record.overlay.on('rightclick', record.rightClickHandler)
  },

  unbindDrawOverlayContextMenu(record) {
    if (!record || !record.overlay || !record.rightClickHandler || typeof record.overlay.off !== 'function') return

    record.overlay.off('rightclick', record.rightClickHandler)
    record.rightClickHandler = null
  },

  captureThumbnail() {
    const container = typeof this.map.getContainer === 'function'
      ? this.map.getContainer()
      : (typeof this.map.getMapsContainer === 'function' ? this.map.getMapsContainer() : null)
    const canvas = container && container.querySelector ? container.querySelector('canvas') : null

    if (!canvas || typeof canvas.toDataURL !== 'function') {
      return {
        thumbnail: '',
        thumbnailError: 'Map canvas is unavailable.'
      }
    }

    try {
      return {
        thumbnail: canvas.toDataURL('image/png'),
        thumbnailError: ''
      }
    } catch (error) {
      return {
        thumbnail: '',
        thumbnailError: error && error.message ? error.message : 'Failed to capture map canvas.'
      }
    }
  },

  closeMouseTool(ifClear) {
    if (this.mouseTool) {
      this.mouseTool.close(Boolean(ifClear))
    }
  }
}
