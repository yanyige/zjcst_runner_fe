import { request } from '../../utils/request';

const app = getApp();

Page({
  data: {
    historyList: [],
    loading: false,
    isEmpty: false
  },

  onLoad() {
    this.loadHistory();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadHistory();
  },

  // 加载历史记录
  async loadHistory() {
    this.setData({ loading: true });
    
    try {
      const res = await request({
        url: '/api/run/history',
        method: 'GET'
      });
      
      if (res.success) {
        this.setData({
          historyList: res.data || [],
          isEmpty: (res.data || []).length === 0
        });
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
      wx.showToast({
        title: '加载失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 格式化时间显示
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  },

  // 格式化日期显示
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  },

  // 查看详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/runDetail/runDetail?id=${id}`
    });
  },

  // 删除记录
  deleteRecord(e) {
    const { id, index } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条跑步记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await request({
              url: `/api/run/delete/${id}`,
              method: 'DELETE'
            });
            
            if (result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              // 从列表中移除
              const { historyList } = this.data;
              historyList.splice(index, 1);
              this.setData({
                historyList,
                isEmpty: historyList.length === 0
              });
            } else {
              wx.showToast({
                title: result.message || '删除失败',
                icon: 'none'
              });
            }
          } catch (error) {
            console.error('删除记录失败:', error);
            wx.showToast({
              title: '删除失败，请稍后重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadHistory().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});