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

- `POST /api/auth/wechat-login` - 微信登录
- `POST /api/auth/cas-login` - CAS登录
- `POST /api/auth/cas-bind-openid` - CAS绑定openid
- `GET /api/auth/cas-callback` - CAS回调接口
- `POST /api/auth/cas-bind` - CAS绑定（旧版）
- `POST /api/auth/refresh` - 刷新token
- `POST /api/run/upload` - 上传跑步记录
- `GET /api/run/history` - 获取跑步历史
- `GET /api/statistics/rank` - 获取排行榜
- `GET /api/users/me` - 获取用户信息

请确保后端服务已实现并部署这些接口。

## 登录流程

### 微信登录 + CAS 绑定流程
1. 用户点击"微信登录"按钮
2. 调用微信登录接口获取 openid
3. 如果用户未绑定 CAS，自动跳转到校园统一认证页面
4. 用户在 CAS 页面完成认证
5. 系统自动将微信 openid 和 CAS 用户信息（学号、姓名、班级等）绑定
6. 登录完成，跳转到主页

### 直接 CAS 登录流程
1. 用户直接访问 CAS 登录页面
2. 完成校园统一认证
3. 系统创建用户账号并登录
4. 跳转到主页

## 配置说明

### CAS 配置
在 `application.yml` 中配置 CAS 服务器信息：
```yaml
cas:
  server:
    url: https://rz.zjcst.edu.cn/sso  # CAS服务器地址
  service:
    url: http://localhost:8080        # 服务回调地址（部署时需修改）
```
