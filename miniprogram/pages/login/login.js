import { loginWithWeChat } from '../../utils/auth';
import { fetchUserProfile } from '../../utils/user';

const app = getApp();

Page({
  data: {
    loading: false,
    description: '一键登录，开启每日打卡',
    needBind: false
  },
  onShow() {
    if (app?.globalData?.token) {
      this.toHome();
    }
  },
  handleLogin() {
    this.setData({ loading: true });
    loginWithWeChat()
      .then(async (res) => {
        if (res.needBind) {
          wx.setStorageSync('pendingOpenId', res.openid);
          this.setData({ needBind: true, loading: false });
          wx.navigateTo({ url: '/pages/cas/cas' });
          return;
        }
        if (res.token) {
          app.setToken(res.token);
          if (res.user) {
            app.setUserInfo(res.user);
          } else {
            await fetchUserProfile().catch(() => {});
          }
          this.toHome();
        } else {
          wx.showToast({ title: '登录失败，请稍后再试', icon: 'none' });
        }
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '登录失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },
  toHome() {
    wx.switchTab({ url: '/pages/run/run' });
  }
});
