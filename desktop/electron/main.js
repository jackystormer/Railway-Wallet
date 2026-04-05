const {
  app,
  BrowserWindow,
  screen: electronScreen,
  shell,
  Menu,
  ipcMain,
  dialog,
} = require('electron');

const isDev = require('electron-is-dev');
const path = require('path');
const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';

if (!globalThis.crypto) {
  globalThis.crypto = require('crypto').webcrypto;
}

function UpsertKeyValue(obj, keyToChange, value) {
  const keyToChangeLower = keyToChange.toLowerCase();
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase() === keyToChangeLower) {
      obj[key] = value;
      return;
    }
  }
  obj[keyToChange] = value;
}

function createWindow() {
  // Create the browser window.
  let win = new BrowserWindow({
    width: electronScreen.getPrimaryDisplay().workArea.width,
    height: electronScreen.getPrimaryDisplay().workArea.height,
    minWidth: 600,
    minHeight: 500,
    show: false,
    darkTheme: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, '../public/icon.ico'),
    title: 'Railway: Private DeFi Wallet',
  });

  win.webContents.session.webRequest.onBeforeSendHeaders((details, cb) => {
    const { requestHeaders } = details;
    UpsertKeyValue(requestHeaders, 'Origin', '*');
    UpsertKeyValue(requestHeaders, 'Sec-Fetch-Mode', 'no-cors');
    UpsertKeyValue(requestHeaders, 'Sec-Fetch-Site', 'none');
    UpsertKeyValue(requestHeaders, 'Sec-Fetch-Dest', 'document');
    cb({ requestHeaders });
  });

  win.webContents.session.webRequest.onHeadersReceived((details, cb) => {
    const { responseHeaders } = details;
    UpsertKeyValue(responseHeaders, 'Access-Control-Allow-Origin', ['*']);
    UpsertKeyValue(responseHeaders, 'Access-Control-Allow-Headers', ['*']);
    UpsertKeyValue(responseHeaders, 'Content-Security-Policy', [
      "default-src 'self';" +
      " script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';" +
      " style-src 'self' 'unsafe-inline';" +
      " connect-src *;" +
      " img-src 'self' data: https:;" +
      " font-src 'self' data:",
    ]);
    cb({ responseHeaders });
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      if (
        parsedUrl.protocol === 'http:' ||
        parsedUrl.protocol === 'https:'
      ) {
        shell.openExternal(url);
      }
    } catch {
      // Invalid URL, do not open
    }
    return { action: 'deny' };
  });

  win.setBackgroundColor('#0a0b0c');

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;
  win.loadURL(startURL);

  win.once('ready-to-show', () => win?.show());

  win.on('closed', () => {
    win = null;
  });

  win.on('focus', () => {
    win.webContents.send('focused');
  });
}

const wipeDeviceData = () => {
  const userDataPath = `${app.getPath('appData')}${
    isWin ? '\\' : '/'
  }railway-reactjs`;

  shell.trashItem(userDataPath);
  app.relaunch();
  app.quit();
};

ipcMain.on('wipe-device-data', wipeDeviceData);

// Menu
const defaultMenuOptions = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
      ]
    : []),
  {
    label: 'File',
    submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac
        ? [
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
              label: 'Speech',
              submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
            },
          ]
        : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac
        ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' },
          ]
        : [{ role: 'close' }]),
    ],
  },
];

const addedMenuOptions = [
  {
    role: 'help',
    submenu: [
      {
        label: 'Open Local Storage Folder',
        click: () => {
          const userData = app.getPath('userData');

          if (isWin) {
            shell.openPath(`${userData}`);
          } else {
            shell.showItemInFolder(`${userData}`);
          }
        },
      },
      {
        label: 'Wipe Device Data',
        click: () => {
          dialog
            .showMessageBox({
              type: 'warning',
              buttons: ['Delete data', 'Cancel'],
              cancelId: 1,
              title: 'Wipe device data',
              message: `This action will delete all app data. Save your seed phrase or funds will be lost.\rDo you want to proceed?`,
            })
            .then(result => {
              if (result.response === 0) {
                wipeDeviceData();
              }
            });
        },
      },
    ],
  },
];

const menu = Menu.buildFromTemplate([
  ...defaultMenuOptions,
  ...addedMenuOptions,
]);
Menu.setApplicationMenu(menu);

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