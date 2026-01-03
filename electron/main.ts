import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

// --- Database Setup (SQLite) ---
let db: Database.Database;

function initDatabase() {
  // Determine database path
  // In Dev: <project>/data/transactions.db
  // In Prod: <exe_folder>/data/transactions.db
  const userDataPath = app.isPackaged 
    ? path.join(path.dirname(app.getPath('exe')), 'data')
    : path.join(__dirname, '../data');

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const dbPath = path.join(userDataPath, 'transactions.db');
  console.log("Database Path:", dbPath);

  try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    
    // Create table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_name TEXT,
        class_name TEXT,
        amount INTEGER,
        date TEXT,
        timestamp INTEGER
      )
    `).run();
    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
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
  initDatabase();
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
  
  const stmt = db.prepare(`
    INSERT INTO transactions (student_name, class_name, amount, date, timestamp)
    VALUES (@studentName, @className, @amount, @date, @timestamp)
  `);

  const info = stmt.run({
    studentName,
    className,
    amount,
    date,
    timestamp
  });

  return { success: true, id: info.lastInsertRowid, date };
});

// Get Transactions (History)
ipcMain.handle('get-transactions', async (event) => {
  const stmt = db.prepare('SELECT * FROM transactions ORDER BY timestamp DESC');
  return stmt.all();
});