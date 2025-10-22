import { request } from './request';
import { config } from '../config/index';

const TOKEN_REFRESH_KEY = 'token_refreshed_at';

export function loadTokenFromStorage() {
  try {
    return wx.getStorageSync('token') || '';
  } catch (error) {
    console.warn('load token error', error);
    return '';
  }
}

export function refreshTokenIfNeeded() {
  const token = loadTokenFromStorage();
  if (!token) return Promise.resolve('');

  const refreshedAt = wx.getStorageSync(TOKEN_REFRESH_KEY);
  if (refreshedAt && Date.now() - refreshedAt < 1000 * 60 * 30) {
    return Promise.resolve('');
  }

  return request({
    url: '/api/auth/refresh',
    method: 'POST'
  }).then((res) => {
    if (res?.token) {
      wx.setStorageSync('token', res.token);
      wx.setStorageSync(TOKEN_REFRESH_KEY, Date.now());
      return res.token;
    }
    return '';
  }).catch(() => '');
}

export function loginWithWeChat() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(loginRes) {
        if (!loginRes.code) {
          reject(new Error('获取临时登录凭证失败'));
          return;
        }
        request({
          url: '/api/auth/wechat-login',
          method: 'POST',
          data: { code: loginRes.code, env: config.env }
        })
          .then(resolve)
          .catch(reject);
      },
      fail(err) {
        reject(err);
      }
    });
  });
}
