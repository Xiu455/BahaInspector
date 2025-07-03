const fs = require('fs')
const path = require('path')

const { ipcMain } = require('electron')
const isDev = require('electron-is-dev')
const Database = require('better-sqlite3');
const { checkTokenBH, createBartex } = require('../_lib/Bartex')

const ROOTDIR = isDev?
  process.cwd() :
  path.join(process.cwd(),'resources/app');

// 讀取設定檔
const configData = fs.readFileSync(path.join(ROOTDIR, '_data/config.json'), 'utf-8');
let config = JSON.parse(configData);

// 連線本機資料庫
const db = new Database(path.join(ROOTDIR, '_data/save.db'));

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
    const startTime = new Date();

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

    setLoadingMsg(`暫存資料中...`);

    // 清空暫存資料表 save_tmp
    db.prepare(/*SQL*/` DELETE FROM save_tmp`).run();

    // 寫入資料庫
    // 插入語句
    const stmt = db.prepare(/*SQL*/`
      INSERT INTO save_tmp (
        search_target,
        PostID, KanbanID, url,
        title, content, dete, type,
        gp, isRE
      )VALUES(
        :search_target,
        :PostID, :KanbanID, :url,
        :title, :content, :dete, :type,
        :gp, :isRE
      );
    `);

    // 大量資料插入
    const insertData = db.transaction(() => {
      bartexResult.postListData.forEach((postData, index) => {
        const urlParams = postData.url_params || {};
    
        // 預先處理所有欄位資料型態 避免 undefined boolean object 等錯誤
        const data = {
          search_target: String(searchTarget ?? ''),
          PostID: urlParams.PostID ?? null,
          KanbanID: urlParams.KanbanID ?? null,
          url: postData.url ?? '',
          title: postData.title ?? '',
          content: postData.content ?? '',
          dete: (postData.dete instanceof Date)
            ? postData.dete.toISOString()
            : (postData.dete ?? ''),
          type: postData.type ?? '',
          gp: typeof postData.gp === 'number'
            ? postData.gp
            : parseInt(postData.gp) || 0,
          isRE: postData.isRE ? 1 : 0,
        };
    
        try{
          stmt.run(data);
        }catch(err){
          console.error(`第 ${index + 1} 筆資料寫入錯誤:`, data, err);
          throw err; // 丟回去讓 transaction 回滾
        }
      });
    });

    try{
      insertData(); // 執行大量資料插入
    }catch(err){
      result.msg = `寫入資料庫失敗`;
      console.error(err);
      return result;
    }

    // 進行資料排序
    const rows = db.prepare(/*SQL*/`
      SELECT search_target,
        PostID, KanbanID, url,
        title, content, dete, type,
        gp, isRE
      FROM save_tmp
      ORDER BY
        dete DESC,     -- 根據 yyyy-mm-dd 排序(新到舊)
        PostID DESC;    -- 日期時 使用 PostID 排序
    `).all();

    // result.bartexResult = bartexResult;
    result.porcTime = ((new Date() - startTime) / 1000).toFixed(1);
    result.searchTarget = searchTarget;
    result.targetUrl = bartexResult.targetUrl;
    result.postListData = rows;
    result.status = 'ok';
    return result;
  });
}

exports.test = () => {
  ipcMain.handle('test', ( event, props ) => {
    // const rows = db.prepare(/*SQL*/`
    //   SELECT * FROM save_tmp
    // `).all();
    // return rows;

    return 'test';
  });
}