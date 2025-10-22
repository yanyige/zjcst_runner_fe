import { request } from '../../utils/request';

const app = getApp();

function computeBadges(distance) {
  const badges = [];
  if (distance >= 50) badges.push({ label: '长跑达人', desc: '累计50公里' });
  if (distance >= 100) badges.push({ label: '百公里勇士', desc: '累计100公里' });
  if (distance >= 200) badges.push({ label: '坚持之星', desc: '累计200公里' });
  return badges;
}


Page({
  data: {
    totalDistance: 0,
    loading: false,
    badges: []
  },
  onShow() {
    if (!app?.globalData?.token) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    this.init();
  },
  init() {
    this.setData({ loading: true });
    this.fetchTotalDistance()
      .then((totalDistance) => {
        const badges = computeBadges(totalDistance);
        this.setData({
          totalDistance,
          badges
        });
      })
      .catch(() => {
        wx.showToast({ title: '获取跑步数据失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },
  fetchTotalDistance() {
    return request({ url: '/api/run/history' }).then((res) => {
      const records = res.records || res || [];
      const total = records.reduce((sum, item) => sum + Number(item.distance || 0), 0);
      return Number(total.toFixed(2));
    });
  },
  handleLogout() {
    app.clearSession();
    wx.redirectTo({ url: '/pages/login/login' });
  }
});
