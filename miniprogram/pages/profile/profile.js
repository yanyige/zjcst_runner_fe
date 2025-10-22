import { fetchUserProfile, updateAvatar } from '../../utils/user';
import { request } from '../../utils/request';

const app = getApp();

function computeBadges(distance) {
  const badges = [];
  if (distance >= 50) badges.push({ label: '长跑达人', desc: '累计50公里' });
  if (distance >= 100) badges.push({ label: '百公里勇士', desc: '累计100公里' });
  if (distance >= 200) badges.push({ label: '坚持之星', desc: '累计200公里' });
  return badges;
}

function getPlaceholderInitial(userInfo) {
  const name = userInfo?.name?.trim();
  if (name) return name[0];
  const studentId = userInfo?.student_id?.trim();
  if (studentId) return studentId.slice(-1);
  return '跑';
}

Page({
  data: {
    userInfo: null,
    totalDistance: 0,
    loading: false,
    badges: [],
    placeholderInitial: '跑'
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
    Promise.all([fetchUserProfile(), this.fetchTotalDistance()])
      .then(([userInfo, totalDistance]) => {
        const badges = computeBadges(totalDistance);
        this.setData({
          userInfo,
          totalDistance,
          badges,
          placeholderInitial: getPlaceholderInitial(userInfo)
        });
      })
      .catch(() => {
        wx.showToast({ title: '获取个人信息失败', icon: 'none' });
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
  handleChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const filePath = res.tempFiles[0].tempFilePath;
        updateAvatar(filePath)
          .then((result) => {
            if (result.avatarUrl) {
              this.setData({
                userInfo: { ...(this.data.userInfo || {}), avatarUrl: result.avatarUrl }
              });
              wx.showToast({ title: '头像更新成功', icon: 'success' });
            }
          })
          .catch(() => {
            wx.showToast({ title: '头像更新失败', icon: 'none' });
          });
      }
    });
  },
  handleLogout() {
    app.clearSession();
    wx.redirectTo({ url: '/pages/login/login' });
  }
});
