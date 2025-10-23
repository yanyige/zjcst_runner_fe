const ENVIRONMENTS = {
  development: {
    // 请将 192.168.x.x 替换为你的实际服务器IP地址
    apiBaseUrl: 'http://121.40.207.7:8082'
  },
  production: {
    apiBaseUrl: 'https://run.zjcst.cn:8082'
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
