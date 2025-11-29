const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Упрощает взаимодействие для простых приложений
    },
    // Иконка приложения (если есть)
    // icon: path.join(__dirname, 'icon.png')
  });

  // Убираем стандартное меню (Файл, Правка и т.д.) для чистого вида
  win.setMenuBarVisibility(false);

  // В продакшене загружаем файл index.html из папки dist
  // В разработке можно переключить на url, но для сборки .exe нужен файл
  win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});