const fs = require('fs')
const path = require('path')

const { ipcMain, dialog } = require('electron')
const isDev = require('electron-is-dev')
const { Parser } = require('json2csv');

const db = require('../_utils/db')
const { checkTokenBH, createBartex } = require('../_lib/Bartex')

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

// 將物件轉換成CSV
function convertToCSV(rows, fields) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('輸入資料無效或為空陣列');
  }

  const selectedFields = fields || Object.keys(rows[0]);
  const parser = new Parser({ fields: selectedFields });
  const csv = parser.parse(rows);

  return '\uFEFF' + csv;
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
        title, content, date, type,
        gp, isRE
      )VALUES(
        :search_target,
        :PostID, :KanbanID, :url,
        :title, :content, :date, :type,
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
          date: (postData.date instanceof Date)
            ? postData.date.toISOString()
            : (postData.date ?? ''),
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
      SELECT
        PostID, KanbanID, url,
        title, content, date, type,
        gp, isRE
      FROM save_tmp
      ORDER BY
        date DESC,    -- 根據 yyyy-mm-dd 排序(新到舊)
        PostID DESC;  -- 日期相同時 使用 PostID 排序
    `).all();

    // 計算文章類型統計
    const typeNum = db.prepare(/*SQL*/`
      SELECT type, COUNT(*) AS count
      FROM save_tmp
      GROUP BY type
      ORDER BY count DESC
    `).all();

    // 獲取文章資訊
    const postInfo = db.prepare(/*SQL*/`
      SELECT 
        SUM(gp) AS total_gp,
        SUM(CASE WHEN isRE = 0 THEN 1 ELSE 0 END) AS NRE_count,
        SUM(CASE WHEN isRE = 1 THEN 1 ELSE 0 END) AS RE_count,
        SUM(CASE WHEN isRE = 0 THEN gp ELSE 0 END) AS NRE_gp,
        SUM(CASE WHEN isRE = 1 THEN gp ELSE 0 END) AS RE_gp
      FROM save_tmp
    `).get();

    // result.bartexResult = bartexResult;

    result.porcTime = ((new Date() - startTime) / 1000).toFixed(1);

    result.searchResult = {
      searchTarget,
      targetUrl: bartexResult.targetUrl,
      postListData: rows,
      typeNum,
      postCount: rows.length,
      postInfo,
      isTmp: true,
    }

    result.status = 'ok';
    return result;
  });
}

// 條件式搜尋文章列表
ipcMain.handle('search', async (event, props) => {
  const { searchTarget, isTmp, searchFilter } = props;
  const { type, keyword, sort } = searchFilter;

  const baseTable = isTmp ? 'save_tmp' : 'save';
  let sql = /*SQL*/`
    SELECT
      PostID, KanbanID, url,
      title, content, date, type,
      gp, isRE,
      ${keyword.length ? keyword.map((k, i) => `(title LIKE @kw${i})`).join(' + ') : '0'} AS titleHits,
      ${keyword.length ? keyword.map((k, i) => `(content LIKE @kw${i})`).join(' + ') : '0'} AS contentHits
    FROM ${baseTable}
    WHERE 1 = 1
  `;

  const params = {};

  // 處理 type 條件
  if (type !== '-') {
    sql += ` AND type = @type`;
    params.type = type;
  }

  // 關鍵字過濾
  if (keyword.length > 0) {
    sql += ` AND (${keyword.map((k, i) => `(title LIKE @kw${i} OR content LIKE @kw${i})`).join(' OR ')})`;
    keyword.forEach((kw, i) => {
      params[`kw${i}`] = `%${kw}%`;
    });
  }

  // 排序條件
  sql += /*SQL*/`
    ORDER BY
      ${sort === 'gp' ? ' gp DESC, ' : ''}
      titleHits DESC,
      contentHits DESC,
      date DESC,
      PostID ASC
  `;

  const stmt = db.prepare(sql);
  const rows = stmt.all(params);

  return rows;
});
// 類型搜尋
exports.typeSearch = () => {
  ipcMain.handle('type-search', async (event, props) => {
    const { searchTarget, type, isTmp } = props;

    const rows = db.prepare(/*SQL*/`
      SELECT 
        PostID, KanbanID, url,
        title, content, date, type,
        gp, isRE
      FROM ${isTmp? 'save_tmp' :'save'}
      WHERE type = :type AND search_target = :searchTarget
      ORDER BY
        date DESC,    -- 根據 yyyy-mm-dd 排序(新到舊)
        PostID DESC;  -- 日期時 使用 PostID 排序
    `).all({ type, searchTarget });

    return rows;
  });
}
// 取得 目標 所有的文章(預設排序)
exports.getAllPosts = () => {
  ipcMain.handle('get-all-post-list', (event, props) => {
    const { searchTarget, isTmp } = props;

    const rows = db.prepare(/*SQL*/`
      SELECT 
        PostID, KanbanID, url,
        title, content, date, type,
        gp, isRE
      FROM ${isTmp? 'save_tmp' : 'save'}
      WHERE search_target = :searchTarget
      ORDER BY
        date DESC,    -- 根據 yyyy-mm-dd 排序(新到舊)
        PostID DESC;  -- 日期時 使用 PostID 排序
    `).all({ searchTarget });

      return rows
  })
}
// 依照 GP 排序
exports.sortByGP = () => {
  ipcMain.handle('sort-gp', (event, props) => {
    const { searchTarget, isTmp } = props;
    const rows = db.prepare(/*SQL*/`
      SELECT 
        PostID, KanbanID, url,
        title, content, date, type,
        gp, isRE
      FROM ${isTmp? 'save_tmp' : 'save'}
      WHERE search_target = :searchTarget
      ORDER BY
        gp DESC,      -- 根據 GP 排序(高到低)
        date DESC,    -- 根據 yyyy-mm-dd 排序(新到舊)
        PostID DESC;  -- 日期時 使用 PostID 排序
    `).all({ searchTarget });

    return rows;
  })
}

// 下載文章清單
exports.downloadPostList = () => {
  ipcMain.handle('download-post-list', async (event, props) => {
    let savePath = '';
    const { searchTarget, isTmp, type } = props;

    const selectedResult = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });

    // 若未選擇資料夾 則直接返回
    if (selectedResult.canceled || selectedResult.filePaths.length === 0){
      return;
    }
    const dirPath = selectedResult.filePaths[0];
    
    const rows = db.prepare(/*SQL*/`
      SELECT 
        PostID, KanbanID, url,
        title, content, date, type,
        gp, isRE
      FROM ${isTmp? 'save_tmp' :'save'}
      WHERE search_target = :searchTarget
      ORDER BY
        date DESC,    -- 根據 yyyy-mm-dd 排序(新到舊)
        PostID DESC;  -- 日期時 使用 PostID 排序
    `).all({ searchTarget });

    switch(type){
      case 'JSON':
        savePath = path.join(dirPath, `${searchTarget}-文章清單.json`);
        const jsonData = JSON.stringify(rows, null, 2);
        fs.writeFileSync(savePath, jsonData, 'utf-8');
        break;
      case 'CSV':
        savePath = path.join(dirPath, `${searchTarget}-文章清單.csv`);
        const csvData = convertToCSV(rows);
        fs.writeFileSync(savePath, csvData, 'utf-8');
        break;
    }

    return true;
  });
}

exports.test = () => {
  ipcMain.handle('test', ( event, props ) => {
    return 'test';
  });
}