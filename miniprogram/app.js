// app.js
import { refreshTokenIfNeeded, loadTokenFromStorage } from './utils/auth';
import { fetchUserProfile } from './utils/user';

App({
  globalData: {
    token: '',
    userInfo: null,
    settings: {
      minValidDistance: 1.0,
    },
  },
  onLaunch() {
    const token = loadTokenFromStorage();
    if (token) {
      this.globalData.token = token;
      refreshTokenIfNeeded().then((newToken) => {
        if (newToken) {
          this.globalData.token = newToken;
        }
        return fetchUserProfile();
      }).then((userInfo) => {
        this.globalData.userInfo = userInfo;
      }).catch(() => {
        this.clearSession();
      });
    }
  },
  setToken(token) {
    this.globalData.token = token;
    wx.setStorageSync('token', token);
  },
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
    wx.setStorageSync('userInfo', userInfo);
  },
  clearSession() {
    this.globalData.token = '';
    this.globalData.userInfo = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  }
});
