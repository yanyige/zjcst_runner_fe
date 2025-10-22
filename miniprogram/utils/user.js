import { request } from './request';
import { config } from '../config/index';

export function fetchUserProfile() {
  return request({ url: '/api/users/me' })
    .then((data) => {
      const app = getApp();
      app?.setUserInfo?.(data);
      return data;
    });
}

export function updateAvatar(filePath) {
  const app = getApp();
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${config.apiBaseUrl}/api/users/avatar`,
      filePath,
      name: 'file',
      header: {
        Authorization: `Bearer ${app?.globalData?.token || ''}`
      },
      success(res) {
        try {
          const data = JSON.parse(res.data);
          if (data.avatarUrl) {
            const userInfo = { ...(app?.globalData?.userInfo || {}), avatarUrl: data.avatarUrl };
            app?.setUserInfo?.(userInfo);
          }
          resolve(data);
        } catch (error) {
          reject(error);
        }
      },
      fail(error) {
        reject(error);
      }
    });
  });
}
