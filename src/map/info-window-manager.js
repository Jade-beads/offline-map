function toLngLatArray(lnglat) {
  if (!lnglat) return null
  if (typeof lnglat.toArray === 'function') return lnglat.toArray()
  if (typeof lnglat.getLng === 'function' && typeof lnglat.getLat === 'function') {
    return [lnglat.getLng(), lnglat.getLat()]
  }
  return Array.isArray(lnglat) ? lnglat : null
}

function detachOverlayFromMap(map, overlay) {
  if (!overlay) return

  if (typeof overlay.setMap === 'function') {
    overlay.setMap(null)
    return
  }

  if (map && typeof map.remove === 'function') {
    map.remove(overlay)
  }
}

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function getFeatureProperties(feature, event = {}) {
  return isPlainObject(event.properties)
    ? event.properties
    : ((feature && feature.properties) || {})
}

function getFeatureId(feature, properties = {}, event = {}) {
  if (event.featureId != null) return event.featureId
  if (feature && feature.id != null) return feature.id
  return properties.id
}

function getInfoWindowActions(infoWindow = {}) {
  return Array.isArray(infoWindow.actions)
    ? infoWindow.actions.filter((action) => action && action.key != null)
    : []
}

function resolveInfoWindowTitle(infoWindow = {}, feature, properties, event) {
  const title = infoWindow.title

  if (typeof title === 'function') {
    return title(feature, properties, event)
  }

  if (title != null && title !== '') {
    return properties[title] != null ? properties[title] : title
  }

  return properties.name || properties.title || '详情'
}

function createInfoWindowFieldRows(fields = [], properties = {}) {
  if (!Array.isArray(fields)) return ''

  return fields
    .filter(({ field }) => properties[field] !== '' && properties[field] != null)
    .map(({ label, field }) => `
      <div class="iw-row">
        <span class="iw-label">${escapeHtml(label || field)}</span>
        <span class="iw-value">${escapeHtml(properties[field])}</span>
      </div>
    `)
    .join('')
}

function createDefaultInfoWindowContent(infoWindow = {}, feature, properties, event) {
  const title = resolveInfoWindowTitle(infoWindow, feature, properties, event)
  const rows = createInfoWindowFieldRows(infoWindow.fields, properties)

  return `
    <div class="map-info-window">
      <div class="iw-title">${escapeHtml(title)}</div>
      ${rows}
    </div>
  `
}

function createInfoWindowContent(infoWindow = {}, feature, event = {}) {
  const properties = getFeatureProperties(feature, event)

  if (typeof infoWindow.content === 'function') {
    return String(infoWindow.content(feature, properties, event) || '')
  }

  if (infoWindow.content != null) {
    return String(infoWindow.content)
  }

  return createDefaultInfoWindowContent(infoWindow, feature, properties, event)
}

function normalizeInfoWindowActionType(type) {
  return String(type || 'default').replace(/[^a-zA-Z0-9_-]/g, '') || 'default'
}

function createInfoWindowActionsHtml(actions = []) {
  if (!actions.length) return ''

  const buttons = actions.map((action) => {
    const type = normalizeInfoWindowActionType(action.type)
    return `
      <button
        type="button"
        class="map-info-window-action map-info-window-action--${type}"
        data-map-info-action="${escapeHtml(action.key)}"
      >
        ${escapeHtml(action.label || action.key)}
      </button>
    `
  }).join('')

  return `<div class="map-info-window-actions">${buttons}</div>`
}

function findInfoWindowActionButton(target) {
  if (!target) return null
  if (typeof target.closest === 'function') {
    return target.closest('[data-map-info-action]')
  }

  let node = target
  while (node && typeof node.getAttribute === 'function') {
    if (node.getAttribute('data-map-info-action') != null) return node
    node = node.parentNode
  }

  return null
}

function getInfoWindowPosition(event = {}) {
  const lnglat = toLngLatArray(event.lnglat)
  if (lnglat) return lnglat

  const rawLngLat = event.rawEvent ? toLngLatArray(event.rawEvent.lnglat) : null
  if (rawLngLat) return rawLngLat

  const overlay = event.overlay
  if (overlay && typeof overlay.getPosition === 'function') {
    return toLngLatArray(overlay.getPosition())
  }

  return null
}

function createInfoWindowActionContext(layerId, feature, event = {}, close) {
  const properties = getFeatureProperties(feature, event)

  return {
    layerId,
    feature,
    featureId: getFeatureId(feature, properties, event),
    category: event.category != null ? event.category : properties.category,
    properties,
    lnglat: getInfoWindowPosition(event),
    overlay: event.overlay,
    rawEvent: event.rawEvent || event,
    close
  }
}

function createInfoWindowHost(content, actions, onAction, context) {
  if (!actions.length || typeof onAction !== 'function') {
    return {
      content,
      dispose: null
    }
  }

  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return {
      content: `<div class="map-info-window-host">${content}${createInfoWindowActionsHtml(actions)}</div>`,
      dispose: null
    }
  }

  const host = document.createElement('div')
  host.className = 'map-info-window-host'
  host.innerHTML = `${content}${createInfoWindowActionsHtml(actions)}`

  const handleClick = (domEvent) => {
    const button = findInfoWindowActionButton(domEvent.target)
    if (!button) return

    const actionKey = button.getAttribute('data-map-info-action')
    const action = actions.find((item) => String(item.key) === actionKey)
    if (!action) return

    domEvent.preventDefault()
    domEvent.stopPropagation()
    onAction(action, context)
  }

  host.addEventListener('click', handleClick)

  return {
    content: host,
    dispose: () => host.removeEventListener('click', handleClick)
  }
}

export class InfoWindowManager {
  constructor({ AMap, map }) {
    this.AMap = AMap
    this.map = map
    this.infoWindow = null
    this.infoWindowMarker = null
    this.infoWindowActionDisposer = null
  }

  open(layerId, infoWindow, feature, event = {}) {
    const position = getInfoWindowPosition(event)
    if (!position) return

    const actions = getInfoWindowActions(infoWindow)
    const content = createInfoWindowContent(infoWindow, feature, event)
    const context = createInfoWindowActionContext(layerId, feature, event, () => {
      this.close()
    })
    const host = createInfoWindowHost(content, actions, infoWindow.onAction, context)

    this.disposeActionHandler()
    this.infoWindowActionDisposer = host.dispose

    if (this.AMap && typeof this.AMap.InfoWindow === 'function') {
      this.closeMarker()
      this.openNative(host.content, position, infoWindow)
      return
    }

    this.openMarker(host.content, position, infoWindow)
  }

  openNative(content, position, infoWindow = {}) {
    if (!this.infoWindow) {
      this.infoWindow = new this.AMap.InfoWindow({
        isCustom: true,
        autoMove: true,
        closeWhenClickMap: false,
        ...(infoWindow.options || {})
      })
    }

    if (typeof this.infoWindow.setContent === 'function') {
      this.infoWindow.setContent(content)
    }

    if (typeof this.infoWindow.open === 'function') {
      this.infoWindow.open(this.map, position)
    }
  }

  openMarker(content, position, infoWindow = {}) {
    if (!this.AMap || typeof this.AMap.Marker !== 'function') return

    this.closeMarker()

    const markerContent = typeof content === 'string'
      ? `<div class="map-info-window-host">${content}</div>`
      : content
    const offset = typeof this.AMap.Pixel === 'function'
      ? new this.AMap.Pixel(0, 0)
      : [0, 0]

    this.infoWindowMarker = new this.AMap.Marker({
      position,
      content: markerContent,
      offset,
      zIndex: infoWindow.zIndex || 300
    })

    if (this.map && typeof this.map.add === 'function') {
      this.map.add(this.infoWindowMarker)
    } else if (typeof this.infoWindowMarker.setMap === 'function') {
      this.infoWindowMarker.setMap(this.map)
    }
  }

  close() {
    this.disposeActionHandler()

    if (this.infoWindow && typeof this.infoWindow.close === 'function') {
      this.infoWindow.close()
    }

    this.closeMarker()
  }

  closeMarker() {
    if (!this.infoWindowMarker) return

    detachOverlayFromMap(this.map, this.infoWindowMarker)
    this.infoWindowMarker = null
  }

  disposeActionHandler() {
    if (typeof this.infoWindowActionDisposer === 'function') {
      this.infoWindowActionDisposer()
    }
    this.infoWindowActionDisposer = null
  }

  destroy() {
    this.close()
    this.infoWindow = null
    this.map = null
  }
}
