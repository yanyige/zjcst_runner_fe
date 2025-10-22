import { loginWithWeChat } from '../../utils/auth';

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
        console.log('登录响应:', res);
        
        if (res.needBind) {
          wx.setStorageSync('pendingOpenId', res.openid);
          this.setData({ needBind: true, loading: false });
          wx.navigateTo({ url: '/pages/cas/cas' });
          return;
        }
        
        if (res.token) {
          app.setToken(res.token);
          console.log('Token已设置:', res.token);
          this.toHome();
        } else {
          wx.showToast({ title: '登录失败，请稍后再试', icon: 'none' });
        }
      })
      .catch((err) => {
        console.error('登录失败:', err);
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
