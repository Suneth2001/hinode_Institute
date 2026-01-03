import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

// --- Data Storage Setup (JSON) ---
let dbPath: string;

function initStorage() {
  const userDataPath = app.isPackaged 
    ? path.join(path.dirname(app.getPath('exe')), 'data')
    : path.join(__dirname, '../data');

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  dbPath = path.join(userDataPath, 'transactions.json');
  console.log("Storage Path:", dbPath);

  if (!fs.existsSync(dbPath)) {
    try {
      fs.writeFileSync(dbPath, JSON.stringify([], null, 2), 'utf-8');
      console.log("Storage initialized successfully.");
    } catch (error) {
      console.error("Failed to initialize storage:", error);
      dialog.showErrorBox("Storage Error", "Failed to create transaction history file.\n" + error);
    }
  }
}

// Helper to read data
function readTransactions() {
  try {
    if (!fs.existsSync(dbPath)) return [];
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading transactions:", error);
    return [];
  }
}

// Helper to write data
function writeTransactions(data: any[]) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error("Error writing transactions:", error);
    return false;
  }
}

// --- Window Management ---
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "Hinode Institute POS",
    icon: path.join(__dirname, '../public/icon.ico')
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initStorage();
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

// --- IPC Handlers ---

// Save Transaction
ipcMain.handle('save-transaction', async (event, data) => {
  const { studentName, className, amount } = data;
  const date = new Date().toLocaleString();
  const timestamp = Date.now();
  
  const newTransaction = {
    id: timestamp, // Simple ID based on timestamp
    student_name: studentName,
    class_name: className,
    amount,
    date,
    timestamp
  };

  const transactions = readTransactions();
  transactions.push(newTransaction);
  
  if (writeTransactions(transactions)) {
    return { success: true, id: newTransaction.id, date };
  } else {
    throw new Error("Failed to write to storage");
  }
});

// Get Transactions (History)
ipcMain.handle('get-transactions', async (event) => {
  const transactions = readTransactions();
  // Sort by timestamp DESC
  return transactions.sort((a: any, b: any) => b.timestamp - a.timestamp);
});