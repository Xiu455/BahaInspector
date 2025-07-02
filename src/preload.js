const {
    contextBridge,
    ipcRenderer,
    shell,
} = require('electron');

const listeners = {};   // 存放接收事件
/**
 * send 僅發送資料到主線程
 * receive 接收主線程發送的資料
 * invoke 呼叫主線程的函式並取得結果(異步)
 * off 移除主線程的接收事件
 * openURL 開啟外部網址
 */
const electronAPI = {
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },
    invoke: (channel, data) => {
        return ipcRenderer.invoke(channel, data);
    },
    receive: (channel, func) => {
        // ipcRenderer.on(channel, (event, ...args) => func(...args));
        const wrapped = (event, ...args) => func(...args);
        listeners[func] = wrapped;
        ipcRenderer.on(channel, wrapped);
    },
    off: (channel, func) =>{
        // ipcRenderer.removeListener(channel, func);
        const wrapped = listeners[func];
        if(wrapped){
            ipcRenderer.removeListener(channel, wrapped);
            delete listeners[func];
        }
    },
    openURL: (url) => shell.openExternal(url)
};

contextBridge.exposeInMainWorld('electron', electronAPI);