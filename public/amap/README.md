# 高德地图离线包目录

当前项目通过 `public/index.html` 静态加载下面两个入口：

```text
/amap/AMap3.js
/amap/plugin.js
/amap/Loca.js
```

请保持离线包依赖文件和入口脚本在同一个 `/amap/` 静态目录下：

```text
AMap3.js
plugin.js
Loca.js
init.js
2.0.1
```

如果后续需要切换到其他授权包入口，例如 `AMap.js`、`plugin.js` 或 `mapsplugin.js`，需要同步修改 `public/index.html` 和项目文档。

## 离线无官方底图模式

当前项目初始化地图时不会创建高德官方默认底图层：

```js
new AMap.Map(container, {
  layers: [],
  features: [],
  showLabel: false,
  showIndoorMap: false
})
```

这样可以避免默认底图触发 `vdata.amap.com`、`webapi.amap.com`、`glyph.amap.com`、`sdf.amap.com` 等外网资源请求。业务底图、默认图层和业务覆盖物由项目外部的本地资源或业务接口负责。

`AMap3.js` 中的 `web/init`、初始化监控上报和 `maps/checkredirect` 探测也已经去掉，默认 logo 图片改为透明内联资源，避免内网环境启动时访问高德外网。`Loca.js` 中的 `/count` 统计上报也已关闭。`plugin.js` 通过本地静态文件加载，用于注册 `WebGLRender` 等离线模块，避免运行时再请求 `mapsplugincdn`。
