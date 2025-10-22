import { upload } from '../../utils/request';

const app = getApp();

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function calcDistance(prev, current) {
  if (!prev) return 0;
  const earthRadius = 6371e3;
  const lat1 = toRad(prev.latitude);
  const lat2 = toRad(current.latitude);
  const deltaLat = toRad(current.latitude - prev.latitude);
  const deltaLng = toRad(current.longitude - prev.longitude);

  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (v) => (v < 10 ? `0${v}` : `${v}`);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

Page({
  data: {
    isRunning: false,
    paused: false,
    startTime: 0,
    elapsed: 0,
    formattedTime: '00:00:00',
    distance: 0,
    distanceText: '0.00',
    pace: '0',
    path: [],
    allowUpload: false,
    minValidDistance: 1.0
  },
  onShow() {
    if (!app?.globalData?.token) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    this.setData({ minValidDistance: app.globalData.settings.minValidDistance });
  },
  onUnload() {
    this.clearListeners();
  },
  onHide() {
    if (!this.data.isRunning) {
      this.clearListeners();
    }
  },
  startRun() {
    if (this.data.isRunning) return;
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              this.beginTracking();
            },
            fail: () => {
              wx.showModal({
                title: '提示',
                content: '需要开启定位权限以记录跑步轨迹',
                confirmText: '去设置',
                success: ({ confirm }) => {
                  if (confirm) {
                    wx.openSetting({});
                  }
                }
              });
            }
          });
        } else {
          this.beginTracking();
        }
      }
    });
  },
  beginTracking() {
    this.setData({
      isRunning: true,
      paused: false,
      startTime: Date.now(),
      elapsed: 0,
      formattedTime: '00:00:00',
      distance: 0,
      distanceText: '0.00',
      pace: '0',
      path: [],
      allowUpload: false
    });
    this.locationListener = (location) => {
      if (this.data.paused) return;
      const latestPoint = {
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        accuracy: location.accuracy,
        timestamp: Date.now()
      };
      const { path } = this.data;
      const distanceIncrement = calcDistance(path[path.length - 1], latestPoint);
      const distance = this.data.distance + distanceIncrement / 1000;
      const displayPoint = {
        ...latestPoint,
        displayLat: latestPoint.latitude.toFixed(5),
        displayLng: latestPoint.longitude.toFixed(5)
      };
      this.setData({
        path: [...path, displayPoint],
        distance: Number(distance.toFixed(3)),
        distanceText: distance.toFixed(2)
      });
      this.updatePace();
    };
    wx.startLocationUpdate({
      success: () => {
        wx.onLocationChange(this.locationListener);
      },
      fail: () => {
        wx.showToast({ title: '无法开启定位，请检查权限', icon: 'none' });
        this.stopRun();
      }
    });
    this.timer = setInterval(() => {
      if (this.data.isRunning && !this.data.paused) {
        const elapsed = Date.now() - this.data.startTime;
        this.setData({ elapsed, formattedTime: formatDuration(elapsed) });
        this.updatePace();
      }
    }, 1000);
  },
  pauseRun() {
    if (!this.data.isRunning || this.data.paused) return;
    this.setData({ paused: true });
  },
  resumeRun() {
    if (!this.data.isRunning || !this.data.paused) return;
    this.setData({ paused: false, startTime: Date.now() - this.data.elapsed });
  },
  stopRun() {
    if (!this.data.isRunning) return;
    this.clearListeners();
    const duration = Math.floor(this.data.elapsed / 1000);
    const distance = this.data.distance;
    const pace = this.data.pace;
    const allowUpload = distance >= this.data.minValidDistance;
    this.setData({ isRunning: false, allowUpload });
    if (!allowUpload) {
      wx.showToast({ title: `本次距离不足${this.data.minValidDistance}公里`, icon: 'none' });
    } else {
      wx.showModal({
        title: '上传打卡',
        content: `本次跑步 ${distance.toFixed(2)} 公里，是否上传？`,
        success: ({ confirm }) => {
          if (confirm) {
            this.uploadRun({ duration, distance, pace, path: this.data.path });
          }
        }
      });
    }
  },
  uploadRun({ duration, distance, pace, path }) {
    upload('/api/run/upload', {
      distance,
      duration,
      pace,
      route: JSON.stringify(path),
      date: new Date().toISOString()
    }).then(() => {
      wx.showToast({ title: '上传成功', icon: 'success' });
    }).catch(() => {
      wx.showToast({ title: '上传失败，请稍后再试', icon: 'none' });
    });
  },
  updatePace() {
    const distance = this.data.distance;
    const minutes = this.data.elapsed / 1000 / 60;
    if (distance > 0 && minutes > 0) {
      const pace = minutes / distance;
      const min = Math.floor(pace);
      const sec = Math.floor((pace - min) * 60);
      this.setData({ pace: `${min}'${sec < 10 ? '0' : ''}${sec}"` });
    } else {
      this.setData({ pace: '0' });
    }
  },
  clearListeners() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.locationListener) {
      wx.offLocationChange(this.locationListener);
      this.locationListener = null;
    }
    wx.stopLocationUpdate({ complete: () => {} });
  }
});
