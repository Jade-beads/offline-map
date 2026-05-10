# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run serve          # Start Vue CLI dev server
npm run build          # Build production bundle

# Testing
npm test               # Run Jest unit tests
npm run test:coverage  # Run Jest with coverage report

# Run a single test file
npx jest test/map-unit.test.js
```

Use `bun` as the package manager (not npm install for adding packages).

## Architecture

This is an **offline map SDK** built on Vue 2 + Amap JSAPI (高德地图). All Amap resources are bundled locally in `public/amap/` — no CDN, no external network requests.

### Core Data Flow

```
Business Code
  → mapActions / locaActions     (command creators in map-store / loca-store)
  → Vue.observable() state        (commandQueue array in *-store.js)
  → AmapMap.vue                   (drains commandQueue in lifecycle hooks)
  → MapController / LocaController (executes AMap API calls)
  → AMap overlays / Loca layers   (actual rendering)
```

Every command carries a monotonically-increasing `seq` number. `AmapMap.vue` drains in sequence order and clears processed commands to prevent memory leaks.

### Two Rendering Pipelines

| Pipeline | Entry Point | Use Case |
|----------|-------------|----------|
| Standard GeoJSON | `mapActions.renderGeoJSONLayer()` | Markers, polygons, polylines |
| Mass Data (Loca) | `locaActions.renderGeoJSONLayer()` | Heatmaps, scatter, 100k+ points |

### Key Files

- [`src/map/map-store.js`](src/map/map-store.js) — Vue observable state + command dispatch (no business data caching)
- [`src/map/map-controller.js`](src/map/map-controller.js) — AMap operation entry point; orchestrates all overlay CRUD
- [`src/map/layer-registry.js`](src/map/layer-registry.js) — GeoJSON → AMap overlay conversion
- [`src/map/style-resolver.js`](src/map/style-resolver.js) — Style protocol parser (priority: layer < feature `properties.mapStyle` < category rules < dynamic rules)
- [`src/map/vector-tile-layer-registry.js`](src/map/vector-tile-layer-registry.js) — Vector tile layer support
- [`src/map/wms-layer-registry.js`](src/map/wms-layer-registry.js) — WMS layer support
- [`src/loca/loca-store.js`](src/loca/loca-store.js) — Loca state + command dispatch
- [`src/loca/loca-controller.js`](src/loca/loca-controller.js) — Loca container & layer lifecycle
- [`src/loca/loca-layer-registry.js`](src/loca/loca-layer-registry.js) — GeoJSON → Loca layer conversion
- [`src/components/AmapMap.vue`](src/components/AmapMap.vue) — Map initialization and command queue drain

### GeoJSON as the Contract

All business data must be converted to GeoJSON `FeatureCollection` before being passed to map commands. The map layer never directly adapts backend field names. Style is embedded in GeoJSON via `feature.properties.mapStyle` or a layer-level style spec.

### State Management (NOT Vuex)

`mapStore` and `locaStore` are plain `Vue.observable()` objects — direct property mutation triggers reactivity. Simpler than Vuex for this map-centric use case.

### Offline AMap JSAPI

- `public/amap/AMap3.js` — Modified offline build (init.js removed to prevent external requests, analytics disabled)
- `public/amap/plugin.js` — Plugin registry (WebGLRender, etc.)
- `public/amap/Loca.js` — Mass visualization library (telemetry disabled)
- AMap is available globally as `window.AMap` and `window.Loca` — no dynamic loader

**Available classes are documented in [`docs/amap-available-classes.md`](docs/amap-available-classes.md)** — the truth is "what's on `window.AMap` at runtime", not "what AMap v2 documents". Anything in that list is guaranteed present; **do not write capability guards** like `if (typeof AMap.MouseTool === 'function')` — just call it. If it's not in the list (e.g. `AMap.Driving`), it's not bundled and calling it will throw.

## Testing

Tests live in `test/` (Jest unit tests) and `tests/` (bun:test-format capability tests, shimmed to run under Jest via `test/jest-bun-test-shim.js`).

Test mocks simulate AMap classes (`FakeMarker`, `FakeLngLat`, `FakeBounds`, etc.) so tests run in jsdom without a real map instance. Coverage is collected from `src/map/**/*.js`.

## Documentation

Detailed API specs and protocols are in [`docs/`](docs/):
- [`map-controller-api.md`](docs/map-controller-api.md) — Full command reference
- [`map-geojson-layer-protocol.md`](docs/map-geojson-layer-protocol.md) — GeoJSON layer spec
- [`map-style-protocol.md`](docs/map-style-protocol.md) — Style DSL reference
- [`loca-mass-data-layer.md`](docs/loca-mass-data-layer.md) — Loca pipeline
- [`map-vector-tile-layer.md`](docs/map-vector-tile-layer.md) — Vector tile layers
- [`project-architecture.md`](docs/project-architecture.md) — Architecture overview
- [`amap-available-classes.md`](docs/amap-available-classes.md) — Classes/namespaces actually exposed on `window.AMap` by the offline bundle

Example integrations are in [`src/examples/`](src/examples/). They are imported by [`src/components/MapWorkspace.vue`](src/components/MapWorkspace.vue) (the in-repo dev demo shell) — do not delete them while MapWorkspace still depends on them. Examples are dev-only and should not be carried into the offline business project.
