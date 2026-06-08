import fs from 'fs'
import path from 'path'

import { ipcMain, dialog } from 'electron'
import { Parser } from 'json2csv'

import db from '../_lib/db.js'
import { checkTokenBH, createBartex } from '../_lib/Bartex.js'

import ROOTDIR from '../_utils/getRootDir.js'
import delay from '../_utils/delay.js'
import convertToCSV from '../_utils/convertToCSV.js'

// 讀取設定檔
const configData = fs.readFileSync(path.join(ROOTDIR, '_data/config.json'), 'utf-8');
let config = JSON.parse(configData);

let mainWindow = null;
export const fromMain = ({ mwin }) => {
  mainWindow = mwin;
}

// 設置loadding文字
const setLoadingMsg = (msg) => {
  mainWindow.webContents.send('set-loading-msg', msg);
}

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

// 傳送設定檔
ipcMain.handle('get-config', async (event, props) => {
  return config;
});

// 保存設定檔案
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

// 檢查 BAHARUNE Token
ipcMain.handle('check-token', async (event, props) => {
  const { token } = props;
  const result = await checkTokenBH(token);
  return result;
});

// 搜尋文章
ipcMain.handle('search-post', async (event, props) => {
  const { searchTarget } = props;

  const result = {
    status: 'error',
    msg: '',
  };

  const startTime = Date.now();

  switch (true){
    case searchTarget === '':
      result.msg = '搜尋字串不能為空';
      return result;

    case config.BAHARUNE === '':
      result.msg = '請先設定 BAHARUNE Token';
      return result;

    case !(await checkTokenBH(config.BAHARUNE)):
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
  db.exec(`DELETE FROM save_tmp`);

  const stmt = db.prepare(/*SQL*/`
    INSERT INTO save_tmp(
      search_target,
      PostID, KanbanID, url,
      title, content, date, type,
      gp, isRE
    )VALUES(
      :search_target,
      :PostID, :KanbanID, :url,
      :title, :content, :date, :type,
      :gp, :isRE
    )
  `);

  try{
    db.exec('BEGIN');

    for(let index = 0; index < bartexResult.postListData.length; index++){
      const postData = bartexResult.postListData[index];
      const urlParams = postData.url_params || {};

      try{
        stmt.run({
          search_target: String(searchTarget ?? ''),
          PostID: urlParams.PostID ?? null,
          KanbanID: urlParams.KanbanID ?? null,
          url: postData.url ?? '',
          title: postData.title ?? '',
          content: postData.content ?? '',
          date: postData.date instanceof Date
            ? postData.date.toISOString()
            : (postData.date ?? ''),
          type: postData.type ?? '',
          gp: typeof postData.gp === 'number'
            ? postData.gp
            : parseInt(postData.gp) || 0,
          isRE: postData.isRE ? 1 : 0,
        });
      }catch (err){
        console.error(`第 ${index + 1} 筆寫入錯誤`, data, err);
        throw err;
      }
    }

    db.exec('COMMIT');
  }catch (err){
    db.exec('ROLLBACK');

    result.msg = '寫入資料庫失敗';
    console.error(err);
    return result;
  }

  const rows = db.prepare(/*SQL*/`
    SELECT
      PostID, KanbanID, url,
      title, content, date, type,
      gp, isRE
    FROM save_tmp
    ORDER BY
      date DESC,
      PostID DESC
  `).all();

  const typeNum = await db.prepare(/*SQL*/`
    SELECT 
      type, COUNT(*) AS count
    FROM 
      save_tmp
    GROUP BY type
    ORDER BY count DESC
  `).all();

  const postInfo = await db.prepare(/*SQL*/`
    SELECT 
      SUM(gp) AS total_gp,
      SUM(CASE WHEN isRE = 0 THEN 1 ELSE 0 END) AS NRE_count,
      SUM(CASE WHEN isRE = 1 THEN 1 ELSE 0 END) AS RE_count,
      SUM(CASE WHEN isRE = 0 THEN gp ELSE 0 END) AS NRE_gp,
      SUM(CASE WHEN isRE = 1 THEN gp ELSE 0 END) AS RE_gp
    FROM save_tmp
  `).get();

  result.porcTime = ((Date.now() - startTime) / 1000).toFixed(1);

  result.searchResult = {
    searchTarget,
    targetUrl: bartexResult.targetUrl,
    postListData: rows,
    typeNum,
    postCount: rows.length,
    postInfo,
    isTmp: true,
  };

  result.status = 'ok';

  return result;
});

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

// 取得 目標 所有的文章(預設排序)
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

// 下載文章清單
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

// exports.test = () => {
//   ipcMain.handle('test', ( event, props ) => {
//     return 'test';
//   });
// }