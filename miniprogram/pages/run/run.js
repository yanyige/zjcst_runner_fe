import { upload, request } from '../../utils/request';

const app = getApp();

// 进行经纬度转换为距离的计算
function Rad(d) {
  //经纬度转换成三角函数中度分表形式。
  return d * Math.PI / 180.0;
}

//计算距离，参数分别为第一点的纬度，经度；第二点的纬度，经度
function distance(lat1, lng1, lat2, lng2) {
  let radLat1 = Rad(lat1);
  let radLat2 = Rad(lat2);
  let a = radLat1 - radLat2;
  let b = Rad(lng1) - Rad(lng2);
  let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
  s = s * 6378.137; // EARTH_RADIUS;
  //输出为公里
  s = Math.round(s * 10000) / 10000;
  return s;
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (v) => (v < 10 ? `0${v}` : `${v}`);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// 全局变量
let point = [];
let count = 0;
let distanceSum = 0;
let spdMax = 0;
let spdMin = 0;
let timer = null;

// 比较最大最小速度
function spdCheck(speed) {
  spdMax = speed > spdMax ? speed : spdMax;
  spdMin = speed < spdMin ? speed : spdMin;
}

// 格式化速度显示
function formatSpeed(speed) {
  if (speed <= 0) return '--';
  return (speed * 3.6).toFixed(1) + ' km/h';
}

Page({
  data: {
    longitude: "",
    latitude: "",
    speed: "--",
    polyLine: [],
    showMain: true,
    showRes: false,
    secondes: "00",
    minutes: "00",
    hours: "00",
    pause: "暂停",
    distance: "0.00",
    pace: '0',
    path: [],
    allowUpload: false,
    minValidDistance: 0.5,
    maxSpeed: "--",
    minSpeed: "--",
    avrSpeed: "--",
    heat: "0",
    setting: {
      power: true,
      voice: true,
      shake: true,
      screen: true,
      method: '1'
    }
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
    if (this.data.pause === "继续") return;
    
    wx.getLocation({
      type: 'gcj02',
      altitude: true, //高精度定位
      success: (res) => {
        const latitude = res.latitude;
        const longitude = res.longitude;
        point.push({
          latitude,
          longitude,
        });
        
        // 开始监听位置
        wx.startLocationUpdate({
          type: 'gcj02',
          success: (res) => {
            console.log('location start', res);
            wx.onLocationChange(this.handleLocationChangeFn); // 监听位置变化
            timer = setInterval(this.repeat, 1000); // 计时
            this.setData({
              showMain: false,
              pause: "暂停"
            });
          },
          fail: (err) => {
            console.error(err);
            wx.showToast({
              title: "定位失败",
              icon: "none"
            });
          },
        });
      },
      fail: (err) => {
        console.error(err);
        wx.showToast({
          title: "定位失败",
          icon: "none"
        });
      },
    });
  },
  // 位置变化处理函数
  handleLocationChangeFn(res) {
    console.log('location change', res);
    let latitude = res.latitude;
    let longitude = res.longitude;
    let speed = res.speed;
    const speedArr_i = speed <= 0 ? 0 : speed;
    spdCheck(speedArr_i);
    let accuracy = res.accuracy;
    
    this.setData({
      speed: formatSpeed(speed),
      latitude,
      longitude,
    });
    
    point.push({
      latitude,
      longitude,
    });
    
    let distance = (this.getDistance()).toFixed(2);
    this.setData({ distance });
    
    // 整公里震动提醒
    if (this.data.setting.shake) {
      if (!this._shake) this._shake = 1;
      if (distance - this._shake > 0) {
        this._shake = parseInt(distance) + 1;
        wx.vibrateLong();
      }
    }
    
    // 更新轨迹显示
    this.drawline();
    
    // 在console中打印当前定位信息
    console.log('当前GPS定位:', {
      纬度: latitude,
      经度: longitude,
      速度: speed,
      精度: accuracy,
      累计距离: distance + 'km'
    });
  },
  
  // 秒表计时器
  repeat() {
    count++;
    let s = count % 60;
    let m = parseInt(count / 60) % 60;
    let h = parseInt(count / 60 / 60);
    
    this.setData({
      secondes: s < 10 ? '0' + s : s.toString(),
      minutes: m < 10 ? '0' + m : m.toString(),
      hours: h < 10 ? '0' + h : h.toString()
    });
  },
  
  // 跑步划线
  drawline() {
    this.setData({
      polyLine: [{
        points: point,
        color: '#48F90D',
        width: 5,
      }]
    });
  },
  
  // 显示路程
  getDistance() {
    if (point.length <= 1) {
      return 0.00;
    } else {
      let totalDistance = 0;
      for (let i = 1; i < point.length; i++) {
        totalDistance += distance(
          point[i - 1].latitude, 
          point[i - 1].longitude, 
          point[i].latitude, 
          point[i].longitude
        );
      }
      return totalDistance;
    }
  },
  // 暂停运动
  pauseRun() {
    if (this.data.pause == "暂停") {
      // 暂停：停止监听和计时
      clearInterval(timer);
      wx.offLocationChange(this.handleLocationChangeFn);
      wx.stopLocationUpdate();
      timer = null;
      this.setData({
        pause: "继续",
      });
    } else {
      // 继续：重新开始监听和计时
      this.resumeRun();
    }
  },
  
  // 继续运动
  resumeRun() {
    // 获取当前位置作为新的起点
    wx.getLocation({
      type: 'gcj02',
      altitude: true,
      success: (res) => {
        const latitude = res.latitude;
        const longitude = res.longitude;
        
        // 添加新的起点
        point.push({
          latitude,
          longitude,
        });
        
        console.log('继续跑步，新起点:', { latitude, longitude });
        
        // 重新开始位置监听
        wx.startLocationUpdate({
          type: 'gcj02',
          success: (res) => {
            console.log('location resume', res);
            wx.onLocationChange(this.handleLocationChangeFn); // 监听位置变化
            timer = setInterval(this.repeat, 1000); // 计时
            this.setData({
              pause: "暂停"
            });
          },
          fail: (err) => {
            console.error(err);
            wx.showToast({
              title: "定位失败",
              icon: "none"
            });
          },
        });
      },
      fail: (err) => {
        console.error(err);
        wx.showToast({
          title: "获取位置失败",
          icon: "none"
        });
      },
    });
  },
  
  // 结束运动
  stopRun() {
    clearInterval(timer);
    wx.offLocationChange(this.handleLocationChangeFn);
    wx.stopLocationUpdate();
    timer = null;
    
    const duration = count; // 秒数
    const distance = parseFloat(this.data.distance);
    const allowUpload = distance >= this.data.minValidDistance;
    const validDuration = duration >= 120; // 2分钟 = 120秒
    
    // 计算平均速度
    let spdAvr = 0;
    if (distance > 0 && count > 0) {
      spdAvr = (distance * 1000) / count; // m/s
    }
    
    // 计算热量 = 体重（kg）* 距离（km）* 运动系数（k） 跑步：k=1.036
    const heat = parseInt(55 * distance * 1.036);
    
    this.setData({ 
      showMain: false,
      showRes: true,
      allowUpload,
      maxSpeed: spdMax > 0 ? formatSpeed(spdMax) : '--',
      minSpeed: spdMin > 0 ? formatSpeed(spdMin) : '--',
      avrSpeed: spdAvr > 0 ? formatSpeed(spdAvr) : '--',
      heat: heat.toString()
    });
    
    // 绘制最终轨迹
    this.drawline();
    
    // 检查是否满足保存条件
    if (!allowUpload) {
      wx.showToast({ title: `本次距离不足${this.data.minValidDistance}公里`, icon: 'none' });
    } else if (!validDuration) {
      wx.showToast({ title: '本次跑步时间不足2分钟', icon: 'none' });
    } else {
      // 自动保存到历史记录
      this.saveToHistory({ duration, distance, path: point, spdAvr, heat });
      
      wx.showModal({
        title: '跑步完成',
        content: `本次跑步 ${distance.toFixed(2)} 公里，已自动保存到历史记录`,
        confirmText: '查看历史',
        cancelText: '重新开始',
        success: ({ confirm }) => {
          if (confirm) {
            wx.navigateTo({
              url: '/pages/history/history'
            });
          } else {
            this.initData();
          }
        }
      });
    }
  },
  // 保存到历史记录
  async saveToHistory({ duration, distance, path, spdAvr, heat }) {
    try {
      const pace = this.calculatePace(duration, distance);
      
      const runData = {
        distance: parseFloat(distance.toFixed(2)),
        duration: duration,
        pace: pace,
        calories: heat,
        avgSpeed: spdAvr > 0 ? formatSpeed(spdAvr) : '--',
        maxSpeed: spdMax > 0 ? formatSpeed(spdMax) : '--',
        minSpeed: spdMin > 0 ? formatSpeed(spdMin) : '--',
        route: JSON.stringify(path),
        routePoints: path.length,
        startTime: new Date(Date.now() - duration * 1000).toISOString(),
        endTime: new Date().toISOString()
      };
      
      const res = await request({
        url: '/api/run/save',
        method: 'POST',
        data: runData
      });
      
      if (res.success) {
        console.log('跑步记录已保存到历史');
      } else {
        console.error('保存跑步记录失败:', res.message);
      }
    } catch (error) {
      console.error('保存跑步记录失败:', error);
    }
  },
  
  // 计算配速
  calculatePace(duration, distance) {
    if (distance <= 0) return '0\'00"';
    const paceInSeconds = duration / distance; // 每公里秒数
    const minutes = Math.floor(paceInSeconds / 60);
    const seconds = Math.floor(paceInSeconds % 60);
    return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
  },

  uploadRun({ duration, distance, path }) {
    upload('/api/run/upload', {
      distance,
      duration,
      route: JSON.stringify(path),
      date: new Date().toISOString()
    }).then(() => {
      wx.showToast({ title: '上传成功', icon: 'success' });
      this.initData();
    }).catch(() => {
      wx.showToast({ title: '上传失败，请稍后再试', icon: 'none' });
    });
  },
  
  // 初始化数据
  initData() {
    point = [];
    count = 0;
    distanceSum = 0;
    spdMax = 0;
    spdMin = 0;
    timer = null;
    
    this.setData({
      showMain: true,
      showRes: false,
      secondes: "00",
      minutes: "00",
      hours: "00",
      distance: "0.00",
      speed: "--",
      maxSpeed: "--",
      minSpeed: "--",
      avrSpeed: "--",
      heat: "0",
      polyLine: [],
      pause: "暂停"
    });
  },
  
  clearListeners() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    wx.offLocationChange(this.handleLocationChangeFn);
    wx.stopLocationUpdate({ complete: () => {} });
  }
});
