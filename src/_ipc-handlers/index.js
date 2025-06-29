const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');
const isDev = require('electron-is-dev');

const ROOTDIR = isDev?
  process.cwd() :
  path.join(process.cwd(),'resources/app');

// 讀取設定檔
exports.getConfig = () => {
  ipcMain.handle('get-config', async (event, props) => {
    const settingData = fs.readFileSync(path.join(ROOTDIR, '_data/config.json'), 'utf-8');
    return JSON.parse(settingData);
  });
}