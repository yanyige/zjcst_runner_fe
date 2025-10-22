import { request } from '../../utils/request';

const app = getApp();

function toDate(date) {
  return new Date(date);
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day + 1);
  return d;
}

function formatDuration(duration) {
  const min = Math.floor(duration / 60);
  const sec = duration % 60;
  return `${min}'${sec < 10 ? '0' : ''}${sec}"`;
}

Page({
  data: {
    records: [],
    loading: false,
    weeklyDistance: 0,
    monthlyDistance: 0
  },
  onShow() {
    if (!app?.globalData?.token) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    this.loadHistory();
  },
  loadHistory() {
    this.setData({ loading: true });
    request({ url: '/api/run/history' })
      .then((res) => {
        const records = (res.records || res || []).map((item) => {
          const distance = Number(item.distance || 0);
          const duration = Number(item.duration || 0);
          return {
            ...item,
            distance,
            duration,
            paceText: item.pace || (distance ? formatDuration(Math.round(duration / distance)) : '--'),
            durationText: formatDuration(duration)
          };
        });
        const now = new Date();
        const weekStart = getWeekStart(now);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        let weeklyDistance = 0;
        let monthlyDistance = 0;
        records.forEach((record) => {
          const recordDate = toDate(record.date);
          if (recordDate >= weekStart) {
            weeklyDistance += Number(record.distance || 0);
          }
          if (recordDate >= monthStart) {
            monthlyDistance += Number(record.distance || 0);
          }
        });
        this.setData({
          records,
          weeklyDistance: Number(weeklyDistance.toFixed(2)),
          monthlyDistance: Number(monthlyDistance.toFixed(2))
        });
      })
      .catch(() => {
        wx.showToast({ title: '获取历史记录失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },
  goDetail(e) {
    const record = e.currentTarget.dataset.record;
    wx.navigateTo({
      url: `/pages/historyDetail/historyDetail?record=${encodeURIComponent(JSON.stringify(record))}`
    });
  }
});
