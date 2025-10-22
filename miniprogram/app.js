// app.js
import { refreshTokenIfNeeded, loadTokenFromStorage, getOpenid } from './utils/auth';

App({
  globalData: {
    token: '',
    settings: {
      minValidDistance: 1.0,
    },
  },
  onLaunch() {
    console.log('=== 小程序启动 ===');
    const token = loadTokenFromStorage();
    if (token) {
      console.log('发现已保存的token:', token);
      this.globalData.token = token;
      refreshTokenIfNeeded().then((newToken) => {
        if (newToken) {
          console.log('Token已刷新:', newToken);
          this.globalData.token = newToken;
          wx.setStorageSync('token', newToken);
        }
      }).catch((error) => {
        console.log('Token刷新失败:', error);
        this.clearSession();
      });
    } else {
      console.log('未发现已保存的token');
    }
  },
  setToken(token) {
    this.globalData.token = token;
    wx.setStorageSync('token', token);
  },
  clearSession() {
    this.globalData.token = '';
    wx.removeStorageSync('token');
  },
  // 获取openid方法（供其他页面使用）
  getOpenid() {
    return getOpenid();
  }
});
