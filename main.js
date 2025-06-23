// @charset "UTF-8";

const { join } = require('path');
const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const isDev = require('electron-is-dev');

const ipcHandlers = require('./_ipc-handlers/index');

let mainWindow;

const windowSetting1 = {
    width: 1000,                                                // 視窗預設寬度
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
                openDevToolsflag = !openDevToolsflag;
                openDevToolsflag?
                    mainWindow.webContents.openDevTools() :
                    mainWindow.webContents.closeDevTools();
                break;
        }
    });
}

(async () => {
    app.on('ready', () => { app.locale = 'zh-TW'; });   // 設定語言
    await app.whenReady();  // 等待app準備好

    Object.entries(ipcHandlers).forEach(([name, fn]) => {
        if(typeof fn !== 'function') return;

        fn();
    });

    mainWindow = new BrowserWindow(windowSetting1);
    if(isDev){
        await mainWindow.loadURL('http://localhost:3000/');
    }else{
        await mainWindow.loadFile('dist/renderer/index.html');
    }

    keyReg();  // 按鍵註冊

    // 關閉視窗時關閉應用
    app.on('window-all-closed', () => {
        if(process.platform !== 'darwin') app.quit();
    });
})();