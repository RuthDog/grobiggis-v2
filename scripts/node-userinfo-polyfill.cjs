/* eslint-disable @typescript-eslint/no-require-imports */
const os = require("node:os");

const originalUserInfo = os.userInfo;

os.userInfo = function userInfoWithWindowsFallback(options) {
  try {
    return originalUserInfo.call(os, options);
  } catch (error) {
    if (error && error.code !== "ERR_SYSTEM_ERROR") throw error;

    return {
      uid: -1,
      gid: -1,
      username: process.env.USERNAME || process.env.USER || "user",
      homedir: process.env.USERPROFILE || process.env.HOME || os.homedir(),
      shell: null,
    };
  }
};
