import { request } from '../../utils/request';

const app = getApp();

Page({
  data: {
    rankings: [],
    loading: false,
    scopeOptions: ['class', 'grade', 'campus'],
    periodOptions: ['week', 'month', 'term'],
    scopeLabels: {
      class: '班级',
      grade: '年级',
      campus: '全校'
    },
    periodLabels: {
      week: '本周',
      month: '本月',
      term: '本学期'
    },
    currentScope: 'class',
    currentPeriod: 'week'
  },
  onShow() {
    if (!app?.globalData?.token) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    this.fetchRankings();
  },
  fetchRankings() {
    this.setData({ loading: true });
    request({
      url: '/api/statistics/rank',
      data: {
        scope: this.data.currentScope,
        period: this.data.currentPeriod
      }
    })
      .then((res) => {
        this.setData({ rankings: res.rankings || res || [] });
      })
      .catch(() => {
        wx.showToast({ title: '获取排行榜失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },
  handleScopeChange(e) {
    const scope = this.data.scopeOptions[e.detail.value];
    this.setData({ currentScope: scope }, () => {
      this.fetchRankings();
    });
  },
  handlePeriodChange(e) {
    const period = this.data.periodOptions[e.detail.value];
    this.setData({ currentPeriod: period }, () => {
      this.fetchRankings();
    });
  }
});
