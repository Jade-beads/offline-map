/**
 * MapController 的"自定义锚点"工具 mixin。
 * 通过 Object.assign(MapController.prototype, customMarkerMixin) 合并到主类。
 *
 * 依赖宿主类提供的字段/方法：
 *   - this.AMap / this.map / this.actions
 *   - this.customMarkers / this.customMarkerRecords / this.customMarkerSeq
 *   - this.activeCustomMarkerId / this.customMarkerContextMenuTargetId
 *   - this.closeMouseTool / this.clearRuler
 *   - this.createContextMenu / this.addContextMenuItem / this.closeContextMenu
 *   - this.warnToolUnavailable
 */
import { toLngLatArray } from '../utils/coord'
import { getPromptInput } from '../utils/dom'
import { createCustomMarkerContent } from '../utils/overlay'

const DEFAULT_CUSTOM_MARKER_NAME = '自定义锚点'

export const customMarkerMixin = {
  startCustomMarker() {
    this.closeMouseTool(false)
    this.clearRuler()
    this.clearCustomMarkerHandler()

    if (typeof this.AMap.Marker !== 'function') {
      this.warnToolUnavailable('AMap.Marker')
      return
    }

    this.customMarkerHandler = (event) => {
      const position = toLngLatArray(event.lnglat)
      if (!position) return

      const markerId = `custom-${Date.now()}-${this.customMarkerSeq += 1}`
      const name = DEFAULT_CUSTOM_MARKER_NAME
      const marker = new this.AMap.Marker({
        position: event.lnglat,
        content: createCustomMarkerContent(name),
        offset: new this.AMap.Pixel(-12, -24),
        title: name,
        label: {
          content: name,
          direction: 'bottom'
        },
        extData: {
          id: markerId,
          type: 'custom-marker',
          name,
          position
        }
      })
      const record = {
        id: markerId,
        type: 'custom-marker',
        name,
        marker,
        position,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        rightClickHandler: null
      }

      this.updateCustomMarkerVisual(record)
      this.map.add(marker)
      this.customMarkers.push(marker)
      this.customMarkerRecords.set(markerId, record)
      this.activeCustomMarkerId = markerId
      this.bindCustomMarkerContextMenu(record)
      this.syncCustomMarkerResult(record)
      this.clearCustomMarkerHandler()
      if (this.actions.setActiveTool) {
        this.actions.setActiveTool('')
      }
    }

    this.bindOneMapEvent('click', this.customMarkerHandler)
  },

  createCustomMarkerResult(record) {
    if (!record) return null

    return {
      id: record.id,
      type: 'custom-marker',
      name: record.name,
      position: record.position,
      lng: record.position[0],
      lat: record.position[1],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }
  },

  syncCustomMarkerResult(record) {
    if (!record || !this.actions.setCustomMarkerResult) return

    this.actions.setCustomMarkerResult(this.createCustomMarkerResult(record))
  },

  getCustomMarkerRecord(id) {
    const targetId = id == null || id === ''
      ? this.activeCustomMarkerId
      : String(id)

    if (targetId && this.customMarkerRecords.has(targetId)) {
      return this.customMarkerRecords.get(targetId)
    }

    const records = Array.from(this.customMarkerRecords.values())
    return records.length ? records[records.length - 1] : null
  },

  updateCustomMarkerVisual(record) {
    if (!record || !record.marker) return

    const extData = typeof record.marker.getExtData === 'function'
      ? record.marker.getExtData()
      : {}
    const nextExtData = {
      ...(extData || {}),
      id: record.id,
      type: 'custom-marker',
      name: record.name,
      position: record.position
    }

    if (typeof record.marker.setExtData === 'function') {
      record.marker.setExtData(nextExtData)
    }
    if (typeof record.marker.setTitle === 'function') {
      record.marker.setTitle(record.name)
    }
    if (typeof record.marker.setContent === 'function') {
      record.marker.setContent(createCustomMarkerContent(record.name))
    }
    if (typeof record.marker.setLabel === 'function') {
      record.marker.setLabel({
        content: record.name,
        direction: 'bottom'
      })
    }
  },

  updateCustomMarkerName(payload = {}) {
    const record = this.getCustomMarkerRecord(payload && payload.id)
    if (!record) return

    const rawName = payload && payload.name != null
      ? payload.name
      : getPromptInput('请输入锚点名称', record.name)

    if (rawName == null) return

    const name = String(rawName).trim()
    if (!name) return

    record.name = name
    record.updatedAt = Date.now()
    this.activeCustomMarkerId = record.id
    this.updateCustomMarkerVisual(record)
    this.syncCustomMarkerResult(record)
  },

  deleteCustomMarker(payload = {}) {
    const record = this.getCustomMarkerRecord(payload && payload.id)
    if (!record) return

    this.unbindCustomMarkerContextMenu(record)
    if (typeof this.map.remove === 'function') {
      this.map.remove(record.marker)
    } else if (record.marker && typeof record.marker.setMap === 'function') {
      record.marker.setMap(null)
    }

    this.customMarkers = this.customMarkers.filter((marker) => marker !== record.marker)
    this.customMarkerRecords.delete(record.id)

    if (this.activeCustomMarkerId === record.id) {
      const records = Array.from(this.customMarkerRecords.values())
      this.activeCustomMarkerId = records.length ? records[records.length - 1].id : ''
    }

    this.closeContextMenu('customMarkerContextMenu')

    if (this.actions.clearCustomMarkerResult) {
      this.actions.clearCustomMarkerResult()
    }
  },

  saveCustomMarker(payload = {}) {
    const record = this.getCustomMarkerRecord(payload && payload.id)
    if (!record || !this.actions.setCustomMarkerSaveRequest) return

    this.activeCustomMarkerId = record.id
    this.syncCustomMarkerResult(record)
    this.actions.setCustomMarkerSaveRequest({
      ...this.createCustomMarkerResult(record),
      requestedAt: Date.now()
    })
  },

  openCustomMarkerContextMenu(record, lnglat) {
    const menu = this.createContextMenu('customMarkerContextMenu')
    if (!menu) return

    this.addContextMenuItem(menu, 'customMarkerContextMenu', '修改名称', () => {
      this.updateCustomMarkerName({
        id: record.id
      })
    }, 0)
    this.addContextMenuItem(menu, 'customMarkerContextMenu', '保存锚点', () => {
      this.saveCustomMarker({
        id: record.id
      })
    }, 1)
    this.addContextMenuItem(menu, 'customMarkerContextMenu', '删除锚点', () => {
      this.deleteCustomMarker({
        id: record.id
      })
    }, 2)

    if (typeof menu.open === 'function') {
      menu.open(this.map, lnglat)
    }
  },

  bindCustomMarkerContextMenu(record) {
    if (!record || !record.marker || typeof record.marker.on !== 'function') return

    record.rightClickHandler = (event = {}) => {
      this.customMarkerContextMenuTargetId = record.id
      this.activeCustomMarkerId = record.id
      this.syncCustomMarkerResult(record)

      this.openCustomMarkerContextMenu(record, event.lnglat)

      const originEvent = event.originEvent || event.originalEvent
      if (originEvent && typeof originEvent.preventDefault === 'function') {
        originEvent.preventDefault()
      }
      if (originEvent && typeof originEvent.stopPropagation === 'function') {
        originEvent.stopPropagation()
      }
    }

    record.marker.on('rightclick', record.rightClickHandler)
  },

  unbindCustomMarkerContextMenu(record) {
    if (!record || !record.marker || !record.rightClickHandler || typeof record.marker.off !== 'function') return

    record.marker.off('rightclick', record.rightClickHandler)
    record.rightClickHandler = null
  },

  bindOneMapEvent(type, handler) {
    if (typeof this.map.once === 'function') {
      this.map.once(type, handler)
      return
    }

    const onceHandler = (event) => {
      if (typeof this.map.off === 'function') {
        this.map.off(type, onceHandler)
      }
      handler(event)
    }

    this.customMarkerHandler = onceHandler
    this.map.on(type, onceHandler)
  },

  clearCustomMarkerHandler() {
    if (this.customMarkerHandler) {
      if (typeof this.map.off === 'function') {
        this.map.off('click', this.customMarkerHandler)
      }
      this.customMarkerHandler = null
    }
  }
}
