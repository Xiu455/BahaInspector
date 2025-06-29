const { contextBridge, ipcRenderer } = require('electron');

/**
 * send 僅發送資料到主線程
 * receive 接收主線程發送的資料
 * invoke 呼叫主線程的函式並取得結果(異步)
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
    }
};

contextBridge.exposeInMainWorld('electron', electronAPI);