const fs = require('fs')
const path = require('path')
const { ipcMain } = require('electron')
const isDev = require('electron-is-dev')
const { checkTokenBH, createBartex } = require('../_lib/Bartex');

const ROOTDIR = isDev?
  process.cwd() :
  path.join(process.cwd(),'resources/app');

// 讀取設定檔
const configData = fs.readFileSync(path.join(ROOTDIR, '_data/config.json'), 'utf-8');
let config = JSON.parse(configData);

// 建立並設定 Bartex 物件
const bartex = createBartex({
  worker: config.ConcurrencyCount,
  fetchDelay: config.ConcurrencyDelay,
});
// 設定 Bartex 事件監聽
bartex.on('pageFetched', (pageCount) => {
  setLoadingMsg(`已找到 ${pageCount} 頁文章列表 準備解析`);
});
bartex.on('parsing', ({totalCount, completedCount}) => {
  setLoadingMsg(`已解析 ${completedCount} / ${totalCount} 頁文章列表`);
});

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
    return config;
  });
}
// 保存設定檔案
exports.saveConfig = () => {
  ipcMain.handle('save-config', async (event, props) => {
    config = props;
    fs.writeFileSync(path.join(ROOTDIR, '_data/config.json'), JSON.stringify(props, null, 2), 'utf-8');

    // 更新 Bartex 物件設定
    const { ConcurrencyCount, ConcurrencyDelay } = config;
    bartex.setOpt({
      worker: ConcurrencyCount,
      fetchDelay: ConcurrencyDelay,
    });
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
    const result = {
      status: 'error',
      msg: '',
    }

    // const checkResult = await checkTokenBH(config.BAHARUNE);
    // if(!await checkTokenBH(config.BAHARUNE)){
      
    // }

    switch(true){
      case searchTarget === '':
        result.msg = '搜尋字串不能為空';
        return result;
      case config.BAHARUNE === '':
        result.msg = '請先設定 BAHARUNE Token';
        return result;
      case !await checkTokenBH(config.BAHARUNE):
        result.msg = 'BAHARUNE Token 無效';
        return result;
      default:
        break;
    }

    const bartexResult = await bartex.get(searchTarget, config.BAHARUNE);
    if(bartexResult.postListData.length === 0){
      result.msg = `找不到 ${searchTarget} 的文章`;
      return result;
    }

    result.bartexResult = bartexResult;
    result.status = 'ok';
    return result;
  });
}