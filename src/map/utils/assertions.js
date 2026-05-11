const GEOMETRY_TYPES = [
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon'
]

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function createContractError(scope, message) {
  return new Error(`${scope}: ${message}`)
}

function assertCoordinatePair(value, scope, path) {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    !Number.isFinite(Number(value[0])) ||
    !Number.isFinite(Number(value[1]))
  ) {
    throw createContractError(scope, `${path} 必须是 [lng, lat] 数字坐标`)
  }
}

function assertLineCoordinates(value, scope, path) {
  if (!Array.isArray(value) || value.length < 2) {
    throw createContractError(scope, `${path} 至少需要 2 个坐标点`)
  }

  value.forEach((position, index) => {
    assertCoordinatePair(position, scope, `${path}[${index}]`)
  })
}

function assertPolygonCoordinates(value, scope, path) {
  if (!Array.isArray(value) || !value.length) {
    throw createContractError(scope, `${path} 至少需要 1 个 ring`)
  }

  value.forEach((ring, ringIndex) => {
    if (!Array.isArray(ring) || ring.length < 4) {
      throw createContractError(scope, `${path}[${ringIndex}] 至少需要 4 个坐标点`)
    }

    ring.forEach((position, positionIndex) => {
      assertCoordinatePair(position, scope, `${path}[${ringIndex}][${positionIndex}]`)
    })
  })
}

function assertGeometry(geometry, scope, path) {
  if (!isPlainObject(geometry)) {
    throw createContractError(scope, `${path} 必须是 GeoJSON Geometry 对象`)
  }

  if (!GEOMETRY_TYPES.includes(geometry.type)) {
    throw createContractError(scope, `${path}.type 不支持：${geometry.type || '空'}`)
  }

  if (geometry.type === 'Point') {
    assertCoordinatePair(geometry.coordinates, scope, `${path}.coordinates`)
  } else if (geometry.type === 'MultiPoint' || geometry.type === 'LineString') {
    assertLineCoordinates(geometry.coordinates, scope, `${path}.coordinates`)
  } else if (geometry.type === 'MultiLineString' || geometry.type === 'Polygon') {
    assertPolygonCoordinates(geometry.coordinates, scope, `${path}.coordinates`)
  } else if (geometry.type === 'MultiPolygon') {
    if (!Array.isArray(geometry.coordinates) || !geometry.coordinates.length) {
      throw createContractError(scope, `${path}.coordinates 至少需要 1 个 polygon`)
    }

    geometry.coordinates.forEach((polygon, index) => {
      assertPolygonCoordinates(polygon, scope, `${path}.coordinates[${index}]`)
    })
  }
}

function assertFeature(feature, scope, path) {
  if (!isPlainObject(feature) || feature.type !== 'Feature') {
    throw createContractError(scope, `${path} 必须是 GeoJSON Feature`)
  }

  assertGeometry(feature.geometry, scope, `${path}.geometry`)
}

export function assertGeoJSONInput(geoJSON, scope) {
  if (!geoJSON) {
    throw createContractError(scope, 'geoJSON 不能为空')
  }

  if (Array.isArray(geoJSON)) {
    if (!geoJSON.length) {
      throw createContractError(scope, 'geoJSON 数组不能为空')
    }

    geoJSON.forEach((item, index) => {
      if (isPlainObject(item) && item.type === 'Feature') {
        assertFeature(item, scope, `geoJSON[${index}]`)
      } else {
        assertGeometry(item, scope, `geoJSON[${index}]`)
      }
    })
    return
  }

  if (!isPlainObject(geoJSON)) {
    throw createContractError(scope, 'geoJSON 必须是对象、Feature 数组或 Geometry 数组')
  }

  if (geoJSON.type === 'FeatureCollection') {
    if (!Array.isArray(geoJSON.features)) {
      throw createContractError(scope, 'FeatureCollection.features 必须是数组')
    }

    geoJSON.features.forEach((feature, index) => {
      assertFeature(feature, scope, `features[${index}]`)
    })
    return
  }

  if (geoJSON.type === 'Feature') {
    assertFeature(geoJSON, scope, 'geoJSON')
    return
  }

  assertGeometry(geoJSON, scope, 'geoJSON')
}

export function assertRequiredString(value, scope, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createContractError(scope, `${field} 不能为空`)
  }
}

export function assertPointRendererStyle(style = {}, scope) {
  if (!isPlainObject(style)) return

  const pointStyle = isPlainObject(style.point) ? style.point : style
  if (pointStyle.renderer === 'image') {
    const image = isPlainObject(pointStyle.image) ? pointStyle.image : pointStyle
    if (!image.src && !image.url) {
      throw createContractError(scope, "renderer 为 'image' 时必须提供 image.src 或 image.url")
    }
  }

  if (pointStyle.renderer === 'html' && !pointStyle.html && !pointStyle.content) {
    throw createContractError(scope, "renderer 为 'html' 时必须提供 html 或 content")
  }
}
