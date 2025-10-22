const ENVIRONMENTS = {
  development: {
    apiBaseUrl: 'http://localhost:8080'
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
