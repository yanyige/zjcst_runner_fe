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
          // 需要绑定CAS，保存openid并跳转到CAS登录
          wx.setStorageSync('pendingOpenId', res.openid);
          if (res.casLoginUrl) {
            wx.setStorageSync('pendingCasUrl', res.casLoginUrl);
          }
          console.log('需要绑定CAS，openid:', res.openid);
          
          // 显示提示并跳转到CAS登录
          wx.showModal({
            title: '校园统一认证',
            content: '首次登录需要完成校园统一认证，即将跳转到认证页面。',
            showCancel: false,
            confirmText: '继续',
            success: () => {
              this.redirectToCasLogin(res.casLoginUrl);
            }
          });
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
  
  redirectToCasLogin(casUrl) {
    // 获取待绑定的 openid
    const pendingOpenId = wx.getStorageSync('pendingOpenId');
    if (!pendingOpenId) {
      wx.showToast({ title: '登录状态异常，请重新登录', icon: 'none' });
      return;
    }
    const targetUrl = casUrl || wx.getStorageSync('pendingCasUrl');
    if (!targetUrl) {
      wx.showToast({ title: '认证地址获取失败，请稍后重试', icon: 'none' });
      return;
    }
    
    // 跳转到 CAS 登录页面，同时传递 openid
    const query = `/pages/casLogin/casLogin?openid=${encodeURIComponent(pendingOpenId)}&url=${encodeURIComponent(targetUrl)}`;
    wx.navigateTo({ url: query });
  },
  
  toHome() {
    wx.switchTab({ url: '/pages/run/run' });
  }
});
