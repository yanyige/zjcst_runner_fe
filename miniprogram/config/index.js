const ENVIRONMENTS = {
  development: {
    // 请将 192.168.x.x 替换为你的实际局域网IP地址
    apiBaseUrl: 'http://192.168.137.202:8080'
  },
  production: {
    apiBaseUrl: 'https://api.poprun-campus.com'
  }
};

const currentEnv = wx.getAccountInfoSync ? wx.getAccountInfoSync().miniProgram.envVersion : 'development';

function resolveEnv() {
  if (currentEnv === 'release') {
    return 'production';
  }
  return 'development';
}

const envKey = resolveEnv();

export const config = {
  ...ENVIRONMENTS[envKey],
  env: envKey
};
