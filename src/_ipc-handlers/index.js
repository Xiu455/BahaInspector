const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');
const isDev = require('electron-is-dev');

const ROOTDIR = isDev?
  process.cwd() :
  path.join(process.cwd(),'resources/app');

// 讀取設定檔
const settingData = fs.readFileSync(path.join(ROOTDIR, '_data/config.json'), 'utf-8');
const setting = JSON.parse(settingData);

// 傳送設定檔
exports.getConfig = () => {
  ipcMain.handle('get-config', async (event, props) => {
    return setting;
  });
}