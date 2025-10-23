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

// 微信登录（标准流程）
export function loginWithWeChat() {
  return new Promise((resolve, reject) => {
    // 检查是否已有token
    const token = wx.getStorageSync('token');
    if (token) {
      console.log('已有token，直接返回');
      resolve({ token: token });
      return;
    }

    // 获取微信登录码
    wx.login({
      success(loginRes) {
        if (!loginRes.code) {
          reject(new Error('获取临时登录凭证失败'));
          return;
        }
        
        console.log('发送code到后端进行登录:', loginRes.code);
        // 直接发送code到后端，后端处理完整的登录流程
        request({
          url: '/api/auth/wechat-login',
          method: 'POST',
          data: { 
            code: loginRes.code
          }
        })
          .then(res => {
            console.log('登录响应:', res);
            if (res && res.token) {
              // 缓存token
              wx.setStorageSync('token', res.token);
              console.log('登录成功，token已缓存');
              resolve(res);
            } else if (res && res.needBind) {
              // 需要绑定CAS，返回响应让调用方处理
              console.log('需要绑定CAS，openid:', res.openid);
              resolve(res);
            } else {
              reject(new Error('登录失败'));
            }
          })
          .catch(reject);
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

