const fs = require('fs')
const path = require('path')
const { ipcMain } = require('electron')
const isDev = require('electron-is-dev')
const { checkTokenBH, createBartex } = require('../_lib/Bartex');

const ROOTDIR = isDev?
  process.cwd() :
  path.join(process.cwd(),'resources/app');

// 讀取設定檔
const settingData = fs.readFileSync(path.join(ROOTDIR, '_data/config.json'), 'utf-8');
let setting = JSON.parse(settingData);

// 取得 主進程 的數據
let mainWindow = null;
exports.fromMain = (props) => {
  let { mwin } = props;
  mainWindow = mwin;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 設置loadding文字
const setLoadingMsg = (msg) => {
  mainWindow.webContents.send('set-loading-msg', msg);
}

// 傳送設定檔
exports.getConfig = () => {
  ipcMain.handle('get-config', async (event, props) => {
    return setting;
  });
}
// 保存設定檔案
exports.saveConfig = () => {
  ipcMain.handle('save-config', async (event, props) => {
    setting = props;
    fs.writeFileSync(path.join(ROOTDIR, '_data/config.json'), JSON.stringify(props, null, 2), 'utf-8');
  });
}

// 檢查 BAHARUNE Token
exports.checkToken = () => {
  ipcMain.handle('check-token', async (event, props) => {
    const { token } = props;
    const result = await checkTokenBH(token);
    return result;
  });
}

// 搜尋文章
exports.searchPost = () => {
  ipcMain.handle('search-post', async (event, props) => {
    const { searchTarget } = props;
    // await checkTokenBH(setting.BAHARUNE);
    setLoadingMsg(`正在搜尋文章 ${searchTarget} ...`);
    await delay(5000);
    return ;
  });
}