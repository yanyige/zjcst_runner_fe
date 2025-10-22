import { config } from '../config/index';

function getAppInstance() {
  return typeof getApp === 'function' ? getApp() : null;
}

function getHeaders(extraHeaders = {}) {
  const app = getAppInstance();
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  if (app?.globalData?.token) {
    headers.Authorization = `Bearer ${app.globalData.token}`;
  }
  return headers;
}

export function request({ url, method = 'GET', data = {}, headers = {} }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.apiBaseUrl}${url}`,
      method,
      data,
      header: getHeaders(headers),
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          const app = getAppInstance();
          app?.clearSession?.();
          wx.showToast({ title: '登录状态已过期，请重新登录', icon: 'none' });
          reject(res.data);
        } else {
          reject(res.data);
        }
      },
      fail(error) {
        wx.showToast({ title: '网络异常，请稍后再试', icon: 'none' });
        reject(error);
      }
    });
  });
}

export function upload(url, data) {
  return request({ url, method: 'POST', data });
}
