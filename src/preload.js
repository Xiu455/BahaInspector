const {
    contextBridge,
    ipcRenderer,
    shell,
} = require('electron');

/**
 * send 僅發送資料到主線程
 * receive 接收主線程發送的資料
 * invoke 呼叫主線程的函式並取得結果(異步)
 * off 移除主線程的接收事件
 */
const electronAPI = {
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },
    receive: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    invoke: (channel, data) => {
        return ipcRenderer.invoke(channel, data);
    },
    off: (channel, func) =>{
        ipcRenderer.removeListener(channel, func);
    },
    openURL: (url) => shell.openExternal(url)
};

contextBridge.exposeInMainWorld('electron', electronAPI);