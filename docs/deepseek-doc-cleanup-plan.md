# 文档清理计划

> 给 DeepSeek 执行：只清理文档表述，不改业务代码，不删除 `public/amap/` 资源。

**目标：**把项目文档里的“离线方案 / 离线包”表述统一改成“内网 JSAPI script 标签加载 / 当前 SDK 能力”。

**架构：**代码层继续由 `public/index.html` 的 `script` 标签注入 `window.AMap` 和 `window.Loca`。文档层需要同步这个事实，删除“完全离线可用”“禁止公网请求”“离线兜底”等已经不成立的描述。

**技术栈：**Vue2、AMap JSAPI、Loca、Jest。

---

## Task 1：更新项目架构文档

**文件：**
- 修改：`docs/project-architecture.md`
- 参考：`public/amap/README.md`
- 参考：`public/index.html`

- [ ] 将开头“离线 JSAPI 加载”相关描述改成“内网 JSAPI script 标签加载”。
- [ ] 删除或改写“项目完全使用离线高德 JSAPI 包”“不请求公网插件地址”等断言。
- [ ] 把资源清单更新为当前入口实际加载的三个文件：`AMap3.js`、`mapsplugin.js`、`Loca.js`。
- [ ] 将 `plugin.js`、`init.js`、`render.js` 等历史描述改为“历史保留资源”，不要写成当前必需入口。
- [ ] 部署说明改成：应用需要保证 `public/index.html` 中的 JSAPI script 地址可访问；如果使用内网固定域名，只改 script 地址。

验收搜索：

```bash
rg -n "完全使用离线|离线 JSAPI|不请求公网|plugin.js|init.js|mapsplugincdn" docs/project-architecture.md
```

期望：没有旧结论；如仍出现“离线”，只能出现在历史说明或明确废弃说明里。

## Task 2：更新地图能力 API 文档

**文件：**
- 修改：`docs/map-controller-api.md`
- 修改：`docs/map-vector-tile-layer.md`
- 修改：`docs/map-style-protocol.md`
- 修改：`docs/map-geojson-layer-protocol.md`
- 修改：`docs/map-loca-actions-api.md`

- [ ] 把“依赖离线包中的 `AMap.RangingTool` / `AMap.MouseTool` / Editor”改成“依赖当前 AMap SDK 提供对应插件”。
- [ ] 把“离线包能力检查”改成“SDK 能力检查”。
- [ ] HeatMap 相关文档改成：如果当前 AMap SDK 提供 `AMap.HeatMap` 则使用官方热力能力；否则业务应选择 Polygon 网格等明确替代方案。
- [ ] MarkerCluster / MVT / WMS / WMTS 文档统一使用“当前 SDK 是否提供能力”的表述。

验收搜索：

```bash
rg -n "离线包|当前离线包|offline package" docs/map-controller-api.md docs/map-vector-tile-layer.md docs/map-style-protocol.md docs/map-geojson-layer-protocol.md docs/map-loca-actions-api.md
```

期望：无结果，或只有“历史迁移说明”这种明确上下文。

## Task 3：更新 Loca 文档

**文件：**
- 修改：`docs/loca-mass-data-layer.md`

- [ ] 将“离线资源”章节改成“Loca script 加载”。
- [ ] 保留 `Loca.js` 需要先于业务初始化完成的说明。
- [ ] 删除 `dist/amap/Loca.js` 是离线资源的表述，改成“构建后需要确保 script 指向的内网资源可访问”。

验收搜索：

```bash
rg -n "离线资源|dist/amap/Loca.js|离线" docs/loca-mass-data-layer.md
```

期望：不再把 Loca 描述成离线方案。

## Task 4：更新项目记忆

**文件：**
- 修改：`docs/project-memory.md`

- [ ] 增加一条当前决策：项目不再维护完全离线方案。
- [ ] 增加一条当前决策：开发和验证使用用户提供的高德 Key，通过 script 标签加载内网 JSAPI 和插件。
- [ ] 保留已有主题色 `#B6002A` 记忆，不要覆盖。

验收搜索：

```bash
rg -n "完全离线|script 标签|#B6002A" docs/project-memory.md
```

期望：能同时看到新 JSAPI 决策和主题色记忆。

## Task 5：全局验收

- [ ] 全局搜索旧表述：

```bash
rg -n "离线包|当前离线包|offline package|完全离线|不请求公网|mapsplugincdn|plugin.js" docs src public -S -g "!public/amap/**"
```

- [ ] `src/` 中不应再出现“离线包”能力提示。
- [ ] `docs/` 中如保留“离线”二字，必须是历史说明或“不再维护离线方案”的明确表述。
- [ ] 不修改 `public/amap/` 下任何 JS 静态资源。
