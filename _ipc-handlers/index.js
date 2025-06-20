const { ipcMain } = require('electron');

exports.event1 = () => {
  ipcMain.handle('event1', async (event, args) => {
    return 'event1 response';
  });
}

exports.event2 = () => {
  ipcMain.handle('event2', async (event, args) => {
    return `event2 response`;
  });
}

exports.event3 = () => {
  ipcMain.handle('event3', async (event, args) => {
    return `event3 response`;
  });
}