# PopRun 校园跑步小程序前端

本仓库为 PopRun 校园跑步系统的微信小程序端，实现了微信登录、校园统一认证绑定、跑步打卡、历史记录、排行榜以及个人中心等核心功能。

## 目录结构

```
miniprogram/
  app.js                # 小程序全局逻辑与全局数据
  app.json              # 全局路由与 tabBar 配置
  app.wxss              # 全局样式
  config/               # 环境变量配置
  utils/                # 网络请求、认证、用户工具方法
  pages/
    login/              # 微信登录
    cas/                # 校园统一认证绑定
    run/                # 跑步打卡与上传
    history/            # 历史记录列表
    historyDetail/      # 单次跑步详情
    rank/               # 排行榜
    profile/            # 个人中心
```

## 开发

1. 使用微信开发者工具打开本项目根目录。
2. 根据实际部署环境修改 `miniprogram/config/index.js` 中的接口地址。
3. 如需自定义 tabBar 图标，请自行创建 `miniprogram/assets/icons/` 目录，放入所需 PNG 图标并在 `app.json` 中配置；仓库默认不包含二进制图标资源。
4. 使用“模拟器”或真机调试进行功能验证。

## 后端接口依赖

小程序默认接入以下接口（均为 `config.apiBaseUrl` 下的路径）：

- `POST /api/auth/wechat-login`
- `POST /api/auth/cas-bind`
- `POST /api/auth/refresh`
- `POST /api/run/upload`
- `GET /api/run/history`
- `GET /api/statistics/rank`
- `GET /api/users/me`

请确保后端服务已实现并部署这些接口。
