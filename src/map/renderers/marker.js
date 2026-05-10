/**
 * Marker（点要素）渲染器
 *
 * 4 种 renderer：
 *   - pin    （HTML 圆点 + 文字，默认）
 *   - image  （图标，AMap.Icon）
 *   - html   （自定义 HTML 内容）
 *   - circle （AMap.Circle 圆形覆盖物）
 *
 * 由 createPointOverlays 按 style.renderer 分发到对应 createXxxMarker。
 */
import {
  getFeatureName,
  getFeatureProperties,
  getPropertyValue
} from '../style-resolver'
import { toLngLatArray } from '../utils/coord'
import {
  CIRCLE_OPTION_KEYS,
  MARKER_OPTION_KEYS,
  createFeatureExtData,
  pickDefined,
  resolveAssetUrl
} from '../utils/feature'
import {
  createPixel,
  createSize,
  getPointPositions,
  normalizePair,
  toNumber
} from '../utils/geometry'

function createMarkerLabel(AMap, style, feature) {
  const label = style.label
  if (!label || label.visible === false) return null

  const properties = getFeatureProperties(feature)
  const content = label.content != null
    ? label.content
    : getPropertyValue(properties, label.field)

  if (content == null || content === '') return null

  return {
    content: String(content),
    direction: label.direction || 'right',
    offset: createPixel(AMap, label.offset)
  }
}

function createImageIcon(AMap, image = {}) {
  const src = image.src || image.url
  if (!src) return null

  if (typeof AMap.Icon !== 'function') {
    return resolveAssetUrl(src)
  }

  const size = image.size ? createSize(AMap, image.size) : undefined
  const imageSize = image.imageSize || image.size

  return new AMap.Icon({
    image: resolveAssetUrl(src),
    size,
    imageSize: imageSize ? createSize(AMap, imageSize) : size,
    imageOffset: createPixel(AMap, image.offset)
  })
}

function createPinContent(feature, style) {
  const properties = getFeatureProperties(feature)
  const size = toNumber(style.size, 28)
  const textField = style.textField || style.labelField || 'category'
  const rawText = style.text != null ? style.text : getPropertyValue(properties, textField)
  const text = rawText == null || rawText === '' ? ' ' : String(rawText).slice(0, style.textLength || 1)
  const color = style.color || style.fillColor || '#2a72d4'
  const fontSize = toNumber(style.fontSize, Math.max(11, Math.round(size * 0.46)))

  return `
    <div
      class="geojson-map-marker"
      style="--marker-color: ${color}; width: ${size}px; height: ${size}px; font-size: ${fontSize}px;"
    >
      <span>${text}</span>
    </div>
  `
}

function createMarkerOptions(AMap, feature, position, style) {
  const size = normalizePair(style.size || (style.image && style.image.size), [28, 28])
  const renderer = style.renderer || 'pin'
  const centerOffset = [-size[0] / 2, -size[1] / 2]
  const options = {
    ...pickDefined(style, MARKER_OPTION_KEYS),
    position,
    title: style.title || getFeatureName(feature),
    label: createMarkerLabel(AMap, style, feature),
    extData: createFeatureExtData(feature, { position })
  }

  if (style.offset) {
    options.offset = createPixel(AMap, style.offset)
  } else if (style.anchor === 'center') {
    delete options.anchor
    options.offset = createPixel(AMap, centerOffset)
  } else if (renderer === 'pin' && !style.anchor) {
    options.offset = createPixel(AMap, [-size[0] / 2, -size[1]])
  } else if (renderer === 'image' || renderer === 'html') {
    options.offset = createPixel(AMap, centerOffset)
  }

  return options
}

function createHtmlMarkerContent(style) {
  const content = style.content || style.html
  if (!content) return ''

  const size = normalizePair(style.size, [28, 28])
  return `
    <div
      class="geojson-map-html-marker"
      style="width: ${size[0]}px; height: ${size[1]}px;"
    >
      ${content}
    </div>
  `
}

export function applyMarkerStyle(AMap, overlay, feature, style) {
  if (!overlay) return

  const extData = overlay.getExtData && overlay.getExtData()
  const position = (extData && extData.position) ||
    (typeof overlay.getPosition === 'function' ? toLngLatArray(overlay.getPosition()) : undefined)
  const options = createMarkerOptions(AMap, feature, position, style)

  if (typeof overlay.setOptions === 'function') {
    overlay.setOptions(options)
  }

  if (style.renderer === 'image' && typeof overlay.setIcon === 'function') {
    const icon = createImageIcon(AMap, style.image || style)
    if (icon) overlay.setIcon(icon)
  } else if (style.renderer === 'html' && typeof overlay.setContent === 'function') {
    const content = createHtmlMarkerContent(style)
    if (content) overlay.setContent(content)
  } else if (typeof overlay.setContent === 'function') {
    overlay.setContent(createPinContent(feature, style))
  }

  const label = createMarkerLabel(AMap, style, feature)
  if (label && typeof overlay.setLabel === 'function') {
    overlay.setLabel(label)
  }

  if (style.title && typeof overlay.setTitle === 'function') {
    overlay.setTitle(style.title)
  }

  if (options.offset && typeof overlay.setOffset === 'function') {
    overlay.setOffset(options.offset)
  }
}

function createImageMarker(AMap, feature, position, style) {
  const icon = createImageIcon(AMap, style.image || style)
  if (!icon) return createPinMarker(AMap, feature, position, { ...style, renderer: 'pin' })

  return new AMap.Marker({
    ...createMarkerOptions(AMap, feature, position, style),
    icon
  })
}

function createHtmlMarker(AMap, feature, position, style) {
  const content = createHtmlMarkerContent(style)
  if (!content) return createPinMarker(AMap, feature, position, { ...style, renderer: 'pin' })

  return new AMap.Marker({
    ...createMarkerOptions(AMap, feature, position, style),
    content
  })
}

function createPinMarker(AMap, feature, position, style) {
  return new AMap.Marker({
    ...createMarkerOptions(AMap, feature, position, { ...style, renderer: 'pin' }),
    content: createPinContent(feature, style)
  })
}

function createCircleOverlay(AMap, feature, position, style) {
  const color = style.color || style.fillColor || style.strokeColor || '#2a72d4'

  return new AMap.Circle({
    ...pickDefined(style, CIRCLE_OPTION_KEYS),
    center: position,
    radius: toNumber(style.radius, 500),
    fillColor: style.fillColor || color,
    strokeColor: style.strokeColor || color,
    extData: createFeatureExtData(feature, { position })
  })
}

export function createPointOverlays(AMap, feature, style) {
  return getPointPositions(feature).map((position) => {
    if (style.renderer === 'image') return createImageMarker(AMap, feature, position, style)
    if (style.renderer === 'circle') return createCircleOverlay(AMap, feature, position, style)
    if (style.renderer === 'html') return createHtmlMarker(AMap, feature, position, style)
    return createPinMarker(AMap, feature, position, style)
  }).filter(Boolean)
}
