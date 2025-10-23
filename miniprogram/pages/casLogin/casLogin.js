const app = getApp();

Page({
  data: {
    loginUrl: '',
    loading: true,
    error: ''
  },

  onLoad(options = {}) {
    const { url, openid } = options;

    if (openid) {
      const decoded = decodeURIComponent(openid);
      wx.setStorageSync('pendingOpenId', decoded);
      console.log('保存 openid 到本地存储:', decoded);
    }

    const storedUrl = wx.getStorageSync('pendingCasUrl');
    const normalizedUrl = url ? decodeURIComponent(url) : storedUrl;

    if (normalizedUrl) {
      this.setData({
        loginUrl: normalizedUrl,
        loading: true,
        error: ''
      });
      this.completed = false;
    } else {
      this.setData({
        error: '认证地址缺失，请返回重新登录',
        loading: false
      });
    }
  },

  onUnload() {
    this.completed = false;
    wx.removeStorageSync('pendingCasUrl');
  },

  handleLoaded() {
    this.setData({ loading: false });
  },

  handleMessage(e) {
    console.log('收到web-view消息:', e.detail.data);
    const messages = e.detail?.data || [];
    if (!messages.length) {
      return;
    }

    messages.forEach((msg) => {
      if (!msg || typeof msg !== 'object') {
        return;
      }

      if (msg.type === 'casBindSuccess' && !this.completed) {
        this.completed = true;
        if (msg.token) {
          app.setToken(msg.token);
        }
        wx.removeStorageSync('pendingOpenId');
        wx.removeStorageSync('pendingCasUrl');
        wx.showToast({
          title: '认证成功',
          icon: 'success'
        });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/run/run' });
        }, 500);
      }

      if (msg.type === 'casBindFailed') {
        const reason = msg.reason || '认证失败，请重试';
        wx.showToast({
          title: reason,
          icon: 'none'
        });
        this.setData({
          loading: false,
          error: reason
        });
      }
    });
  },

  handleError(e) {
    console.error('web-view加载错误:', e);
    this.setData({
      error: '页面加载失败，请稍后重试',
      loading: false
    });
  },

  retry() {
    const loginUrl = this.data.loginUrl || wx.getStorageSync('pendingCasUrl');
    if (loginUrl) {
      this.setData({
        error: '',
        loading: true,
        loginUrl
      });
    } else {
      wx.showToast({
        title: '认证地址缺失，请返回登录页重试',
        icon: 'none'
      });
    }
  }
});
