# Electron API 對照說明：主進程與渲染進程使用方式

本文說明 `electronAPI` 中 `send`、`receive`、`invoke` 方法在主進程與渲染進程中的對應使用方式，便於開發時一目了然。

---

## 📤 `send(channel, data)`

用於 **渲染進程** 傳送訊息給 **主進程**，**不需要回傳結果**。

### 渲染進程使用：

```javascript
electron.send('log-event', { level: 'info', message: '使用者點擊了按鈕' });
```

### 主進程對應：

```javascript
ipcMain.on('log-event', (event, data) => {
    console.log('收到來自渲染進程的訊息:', data);
});
```

如果需要回應結果，請使用 `reply` 方法  
渲染進程需要使用 receive 接收回應  
建議直接使用 invoke 方法  

```javascript
ipcMain.on('log-event', (event, data) => {
    console.log('收到來自渲染進程的訊息:', data);
    event.reply('log-event-reply', { result: '成功' });
});
```

---

## 📥 `receive(channel, callback)`

用於 **渲染進程** 接收來自 **主進程** 傳送的訊息。

### 主進程使用：

```javascript
mainWindow.webContents.send('update-ui', { message: '請更新畫面' });
```

### 渲染進程對應：

```javascript
electron.receive('update-ui', (data) => {
    console.log('主進程通知:', data.message);
});
```

---

## 🔁 `invoke(channel, data)`

用於 **渲染進程** 發送請求給 **主進程**，**並等待主進程回傳資料（Promise）**。

### 渲染進程使用：

```javascript
const user = await electron.invoke('get-user', { id: 1 });
console.log('取得的使用者:', user);
```

### 主進程對應：

```javascript
ipcMain.handle('get-user', async (event, args) => {
    // 假設資料查詢邏輯
    return { id: args.id, name: 'Alice' };
});
```

---

## 📚 API 對照總表

| API 名稱      | 渲染進程用法                               | 主進程對應處理                                 | 回應特性     |
|---------------|--------------------------------------------|------------------------------------------------|--------------|
| `send`        | `electron.send('channel', data)`        | `ipcMain.on('channel', (event, data) => {})`   | 單向傳送     |
| `receive`     | `electron.receive('channel', callback)` | `webContents.send('channel', data)`            | 單向接收     |
| `invoke`      | `electron.invoke('channel', data)`      | `ipcMain.handle('channel', async () => {})`    | 雙向請求回傳 |

---