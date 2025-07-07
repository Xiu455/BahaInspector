// @charset "UTF-8";

const path = require('path')
const { join } = require('path')
const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron')
const isDev = require('electron-is-dev')

const db = require('./_utils/db')
const ipcHandlers = require('./_ipc-handlers/index')

const ROOTDIR = isDev?
  process.cwd() :
  path.join(process.cwd(),'resources/app');

let mainWindow;

const windowSetting1 = {
    width: 1000 + (isDev? 500 : 0),                             // 視窗預設寬度
    height: 600,                                                // 視窗預設高度
    minWidth: 1000,                                             // 最小寬度
    minHeight: 600,                                             // 最小高度
    // x: 100,                                                     // x預設位置
    // y: 100,                                                     // y預設位置
    webPreferences: {
        preload: join(__dirname, 'preload.js'),                 // 預先引入
        devTools: true,                                         // 是否啟用devTools
        nodeIntegration: true,                                  // 是否允許渲染進程中使用Node.js模組
        enableRemoteModule: true,                               // 是否允許渲染進程中可以使用主進程的模組
    },
    autoHideMenuBar: true,                                      // 是否隱藏選單
}

function restartApp() {
    app.relaunch();
    app.exit();
}

/**
    按鍵註冊
*/
const keyReg = () => {
    let openDevToolsflag = false;

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if(input.type !== 'keyDown'){ return; }
        switch(input.key){
            case 'F5':  // 刷新畫面
                event.preventDefault();
                mainWindow.webContents.reload();
                break;
            case 'F6':
                event.preventDefault();
                console.log('重啟應用');
                restartApp();
                break;
            case 'F12': // 開啟/關閉 開發模式
                event.preventDefault();
                if(mainWindow.webContents.isDevToolsOpened()){
                    mainWindow.webContents.closeDevTools();
                }else{
                    mainWindow.webContents.openDevTools();
                }
                break;
        }
    });
}

(async () => {
    app.on('ready', () => { app.locale = 'zh-TW'; });   // 設定語言
    await app.whenReady();  // 等待app準備好

    mainWindow = new BrowserWindow(windowSetting1);

    Object.entries(ipcHandlers).forEach(([name, fn]) => {
        if(typeof fn !== 'function') return;

        if(name === 'fromMain'){
            fn({ mwin: mainWindow });
            return;
        }

        fn();
    });

    if(isDev){
        await mainWindow.loadURL('http://localhost:3000/');
        mainWindow.webContents.openDevTools();
    }else{
        await mainWindow.loadFile('dist/renderer/index.html');
    }

    keyReg();  // 按鍵註冊

    // 關閉應用時觸發
    app.on('before-quit', () => {
        try{
            console.log('準備關閉應用 開始清理多餘資料...');
            db.exec('VACUUM');
            db.close();
            console.log('✅ 資料庫清理完成');
        }catch (err){
            console.error('❌ 資料庫清理時發生錯誤:', err);
        }
    });

    // 關閉視窗時關閉應用
    app.on('window-all-closed', () => {
        if(process.platform !== 'darwin') app.quit();
    });
})();