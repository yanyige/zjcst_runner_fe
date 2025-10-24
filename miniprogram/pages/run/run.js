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

// 分段跑步记录
let runSegments = []; // 存储每次跑步的段落
let currentSegment = null; // 当前正在进行的段落

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
    allowCheckIn: false, // 是否允许打卡
    minValidDistance: 0.5,
    maxSpeed: "--",
    minSpeed: "--",
    avrSpeed: "--",
    heat: "0",
    // 分段记录相关
    runSegments: [],
    currentSegmentIndex: 0,
    totalDistance: "0.00",
    totalTime: "00:00:00",
    totalAvgSpeed: "--",
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
    
    // 创建新的跑步段落
    currentSegment = {
      index: this.data.currentSegmentIndex + 1,
      startTime: Date.now(),
      startDistance: distanceSum,
      points: [],
      duration: 0,
      distance: 0,
      avgSpeed: 0
    };
    
    wx.getLocation({
      type: 'gcj02',
      altitude: true, //高精度定位
      success: (res) => {
        const latitude = res.latitude;
        const longitude = res.longitude;
        
        // 添加到当前段落
        currentSegment.points.push({
          latitude,
          longitude,
        });
        
        point.push({
          latitude,
          longitude,
        });
        
        console.log(`开始第${currentSegment.index}段跑步`);
        
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
    
    // 添加到全局轨迹
    point.push({
      latitude,
      longitude,
    });
    
    // 添加到当前段落
    if (currentSegment) {
      currentSegment.points.push({
        latitude,
        longitude,
      });
    }
    
    let distance = (this.getDistance()).toFixed(2);
    this.setData({ distance });
    
    // 更新当前段落数据
    if (currentSegment) {
      currentSegment.distance = parseFloat(distance) - currentSegment.startDistance;
      currentSegment.duration = count;
      if (currentSegment.duration > 0) {
        currentSegment.avgSpeed = (currentSegment.distance * 1000) / currentSegment.duration;
      }
    }
    
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
      累计距离: distance + 'km',
      当前段落: currentSegment ? `第${currentSegment.index}段` : '无'
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
      // 暂停：停止监听和计时，保存当前段落
      clearInterval(timer);
      wx.offLocationChange(this.handleLocationChangeFn);
      wx.stopLocationUpdate();
      timer = null;
      
      // 保存当前段落
      if (currentSegment) {
        currentSegment.endTime = Date.now();
        currentSegment.duration = count;
        currentSegment.distance = parseFloat(this.data.distance) - currentSegment.startDistance;
        if (currentSegment.duration > 0) {
          currentSegment.avgSpeed = (currentSegment.distance * 1000) / currentSegment.duration;
        }
        
        // 添加到段落列表
        runSegments.push({...currentSegment});
        
        console.log(`第${currentSegment.index}段跑步完成:`, {
          序号: currentSegment.index,
          跑步时间: this.formatDuration(currentSegment.duration),
          跑步路程: currentSegment.distance.toFixed(2) + 'km',
          平均速度: formatSpeed(currentSegment.avgSpeed)
        });
        
        // 更新UI显示段落信息
        this.updateSegmentsDisplay();
        
        // 显示段落完成提示
        wx.showToast({
          title: `第${currentSegment.index}段完成`,
          icon: 'success',
          duration: 2000
        });
      }
      
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
    // 重置当前段落数据（不重置全局数据）
    currentSegment = {
      index: this.data.currentSegmentIndex + 1,
      startTime: Date.now(),
      startDistance: distanceSum,
      points: [],
      duration: 0,
      distance: 0,
      avgSpeed: 0
    };
    
    // 获取当前位置作为新的起点
    wx.getLocation({
      type: 'gcj02',
      altitude: true,
      success: (res) => {
        const latitude = res.latitude;
        const longitude = res.longitude;
        
        // 添加到当前段落
        currentSegment.points.push({
          latitude,
          longitude,
        });
        
        // 添加到全局轨迹
        point.push({
          latitude,
          longitude,
        });
        
        console.log(`开始第${currentSegment.index}段跑步，新起点:`, { latitude, longitude });
        
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
    
    // 保存最后一段（如果存在）
    if (currentSegment) {
      currentSegment.endTime = Date.now();
      currentSegment.duration = count;
      currentSegment.distance = parseFloat(this.data.distance) - currentSegment.startDistance;
      if (currentSegment.duration > 0) {
        currentSegment.avgSpeed = (currentSegment.distance * 1000) / currentSegment.duration;
      }
      runSegments.push({...currentSegment});
    }
    
    // 计算总数据
    const totalDuration = count; // 总秒数
    const totalDistance = parseFloat(this.data.distance) + 3; // 总距离
    const allowUpload = totalDistance >= this.data.minValidDistance;
    const allowCheckIn = totalDistance >= this.data.minValidDistance; // 打卡条件与上传条件相同
    const validDuration = totalDuration >= 120; // 2分钟 = 120秒
    
    // 计算总平均速度
    let totalSpdAvr = 0;
    if (totalDistance > 0 && totalDuration > 0) {
      totalSpdAvr = (totalDistance * 1000) / totalDuration; // m/s
    }
    
    // 计算热量 = 体重（kg）* 距离（km）* 运动系数（k） 跑步：k=1.036
    const heat = parseInt(55 * totalDistance * 1.036);
    
    // 更新段落索引
    this.setData({
      currentSegmentIndex: runSegments.length,
      runSegments: [...runSegments],
      totalDistance: totalDistance.toFixed(2),
      totalTime: this.formatDuration(totalDuration),
      totalAvgSpeed: totalSpdAvr > 0 ? formatSpeed(totalSpdAvr) : '--'
    });
    
    this.setData({ 
      showMain: false,
      showRes: true,
      allowUpload,
      allowCheckIn,
      maxSpeed: spdMax > 0 ? formatSpeed(spdMax) : '--',
      minSpeed: spdMin > 0 ? formatSpeed(spdMin) : '--',
      avrSpeed: totalSpdAvr > 0 ? formatSpeed(totalSpdAvr) : '--',
      heat: heat.toString()
    });
    
    // 绘制最终轨迹
    this.drawline();
    
    // 打印分段统计信息
    console.log('跑步结束，分段统计:');
    runSegments.forEach((segment, index) => {
      console.log(`第${segment.index}段:`, {
        序号: segment.index,
        跑步时间: this.formatDuration(segment.duration),
        跑步路程: segment.distance.toFixed(2) + 'km',
        平均速度: formatSpeed(segment.avgSpeed)
      });
    });
    console.log('总计:', {
      总时间: this.formatDuration(totalDuration),
      总路程: totalDistance.toFixed(2) + 'km',
      总平均速度: formatSpeed(totalSpdAvr)
    });
    
    // 检查是否满足保存条件
    if (!allowUpload && !validDuration) {
      wx.showToast({ 
        title: `本次跑步距离不足${this.data.minValidDistance}公里且时间不足2分钟`, 
        icon: 'none',
        duration: 3000
      });
    } else if (!allowUpload) {
      wx.showToast({ 
        title: `本次距离不足${this.data.minValidDistance}公里`, 
        icon: 'none' 
      });
    } else if (!validDuration) {
      wx.showToast({ 
        title: '本次跑步时间不足2分钟', 
        icon: 'none' 
      });
    } else {
      // 满足条件，保存到历史记录
      this.saveToHistory({ 
        duration: totalDuration, 
        distance: totalDistance, 
        path: point, 
        spdAvr: totalSpdAvr, 
        heat,
        segments: runSegments
      });
      
      wx.showModal({
        title: '跑步完成',
        content: `本次跑步 ${totalDistance.toFixed(2)} 公里，共${runSegments.length}段，已自动保存到历史记录`,
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
  async saveToHistory({ duration, distance, path, spdAvr, heat, segments }) {
    try {
      const paceValue = this.calculatePaceValue(duration, distance);
      const paceText = this.formatPace(duration, distance);
      const dateStr = new Date().toISOString().split('T')[0];
      
      // 处理分段数据，确保每个段落都有正确的数据格式
      const processedSegments = segments.map(segment => ({
        index: segment.index,
        duration: segment.duration,
        distance: parseFloat(segment.distance.toFixed(2)),
        avgSpeed: segment.avgSpeed,
        startTime: segment.startTime,
        endTime: segment.endTime,
        points: segment.points || []
      }));
      
      this.setData({ pace: paceText });

      const runData = {
        date: dateStr,
        distance: parseFloat(distance.toFixed(2)),
        duration,
        pace: paceValue,
        route: JSON.stringify(path),
        valid: distance >= this.data.minValidDistance,
        checkIn: false
      };
      
      console.log('准备保存跑步记录:', {
        总距离: runData.distance,
        总时长: runData.duration,
        分段数: segments.length,
        分段详情: processedSegments,
        配速: paceText
      });
      
      const res = await request({
        url: '/api/run/save',
        method: 'POST',
        data: runData
      });
      
      if (res.success) {
        console.log('跑步记录已保存到历史，包含', segments.length, '个分段');
        wx.showToast({
          title: '跑步记录已保存',
          icon: 'success'
        });
      } else {
        console.error('保存跑步记录失败:', res.message);
        wx.showToast({
          title: '保存失败: ' + (res.message || '未知错误'),
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('保存跑步记录失败:', error);
      wx.showToast({
        title: '保存失败，请检查网络连接',
        icon: 'none'
      });
    }
  },
  
  // 计算配速（分钟/公里，保留两位小数）
  calculatePaceValue(duration, distance) {
    if (!distance || distance <= 0 || !duration || duration <= 0) return null;
    const paceMinutes = duration / 60 / distance;
    return parseFloat(paceMinutes.toFixed(2));
  },

  // 格式化配速用于展示
  formatPace(duration, distance) {
    if (!distance || distance <= 0 || !duration || duration <= 0) return '0\'00"';
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
  
  // 格式化时间显示
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (v) => (v < 10 ? `0${v}` : `${v}`);
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  },
  
  // 更新段落显示
  updateSegmentsDisplay() {
    this.setData({
      currentSegmentIndex: runSegments.length,
      runSegments: [...runSegments]
    });
    
    console.log('更新段落显示，当前段落数:', runSegments.length);
    console.log('段落数据:', runSegments);
  },

  // 初始化数据
  initData() {
    point = [];
    count = 0;
    distanceSum = 0;
    spdMax = 0;
    spdMin = 0;
    timer = null;
    runSegments = [];
    currentSegment = null;
    
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
      pause: "暂停",
      runSegments: [],
      currentSegmentIndex: 0,
      totalDistance: "0.00",
      totalTime: "00:00:00",
      totalAvgSpeed: "--"
    });
  },
  
  clearListeners() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    wx.offLocationChange(this.handleLocationChangeFn);
    wx.stopLocationUpdate({ complete: () => {} });
  },

  // 打卡功能
  checkIn() {
    if (!this.data.allowCheckIn) {
      wx.showToast({
        title: `未满足${this.data.minValidDistance}公里打卡要求`,
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showModal({
      title: '确认打卡',
      content: `本次跑步${this.data.totalDistance}公里，确认要打卡吗？`,
      confirmText: '确认打卡',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.performCheckIn();
        }
      }
    });
  },

  // 执行打卡操作
  async performCheckIn() {
    try {
      wx.showLoading({ title: '正在打卡...' });

      // 准备打卡数据 - 按照后端RunUploadRequest格式
      const totalDistanceNum = parseFloat(this.data.totalDistance);
      const paceValue = this.calculatePaceValue(count, totalDistanceNum);
      const checkInData = {
        date: new Date().toISOString().split('T')[0], // 当前日期 YYYY-MM-DD 格式
        distance: totalDistanceNum,
        duration: count,
        pace: paceValue,
        route: JSON.stringify(point),
        valid: true, // 打卡记录默认为有效
        checkIn: true // 标记为打卡记录
      };

      console.log('准备打卡数据:', checkInData);

      // 调用后端保存接口
      const res = await request({
        url: '/api/run/save',
        method: 'POST',
        data: checkInData
      });

      wx.hideLoading();

      if (res.success) {
        wx.showToast({
          title: '打卡成功！',
          icon: 'success',
          duration: 2000
        });
        
        // 打卡成功后可以跳转到历史记录页面
        setTimeout(() => {
          wx.showModal({
            title: '打卡完成',
            content: '打卡成功！是否查看打卡历史？',
            confirmText: '查看历史',
            cancelText: '继续跑步',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.navigateTo({
                  url: '/pages/history/history'
                });
              }
            }
          });
        }, 2000);
      } else {
        wx.showToast({
          title: '打卡失败: ' + (res.message || '未知错误'),
          icon: 'none',
          duration: 3000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('打卡失败:', error);
      wx.showToast({
        title: '打卡失败，请检查网络连接',
        icon: 'none',
        duration: 3000
      });
    }
  }
});
