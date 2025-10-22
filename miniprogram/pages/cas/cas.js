import { request } from '../../utils/request';

const app = getApp();

Page({
  data: {
    studentId: '',
    casPassword: '',
    name: '',
    grade: '',
    className: '',
    gender: '男',
    loading: false,
    error: ''
  },
  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value, error: '' });
  },
  handleGenderChange(e) {
    this.setData({ gender: e.detail.value });
  },
  submit() {
    const { studentId, casPassword, name, grade, className, gender } = this.data;
    if (!studentId || !casPassword) {
      this.setData({ error: '请输入学号与统一认证密码' });
      return;
    }
    this.setData({ loading: true, error: '' });
    const openid = wx.getStorageSync('pendingOpenId');
    request({
      url: '/api/auth/cas-bind',
      method: 'POST',
      data: {
        studentId,
        password: casPassword,
        name,
        grade,
        className,
        gender,
        openid
      }
    }).then((res) => {
      if (res.token) {
        app.setToken(res.token);
      }
      wx.removeStorageSync('pendingOpenId');
      wx.showToast({ title: '绑定成功', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/run/run' });
      }, 400);
    }).catch((err) => {
      this.setData({ error: err.message || '绑定失败，请检查信息' });
    }).finally(() => {
      this.setData({ loading: false });
    });
  }
});
