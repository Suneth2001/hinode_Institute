import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

// Enable Chromium Print Preview
app.commandLine.appendSwitch('enable-print-preview');

// --- Data Storage Setup (JSON) ---
const DATA_FILE_NAME = 'transactions.json';
let dataFilePath: string;

function initStorage() {
  const userDataPath = app.isPackaged 
    ? path.join(path.dirname(app.getPath('exe')), 'data')
    : path.join(__dirname, '../data');

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  dataFilePath = path.join(userDataPath, DATA_FILE_NAME);
  console.log("Data File Path:", dataFilePath);

  if (!fs.existsSync(dataFilePath)) {
    try {
      fs.writeFileSync(dataFilePath, JSON.stringify([], null, 2), 'utf-8');
      console.log("Data file initialized successfully.");
    } catch (error) {
      console.error("Failed to initialize data file:", error);
      dialog.showErrorBox("Data Error", "Failed to create data file.\n" + error);
    }
  }
}

function readData() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      return [];
    }
    const data = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read data:", error);
    return [];
  }
}

function writeData(data: any[]) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Failed to write data:", error);
    throw error;
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
    icon: path.join(__dirname, '../public/logo.ico')
  });

  mainWindow.setMenu(null);

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
  const now = new Date();
  const date = now.toLocaleString();
  const timestamp = Date.now();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}${month}`; // e.g., 202601

  try {
    const transactions = readData();
    
    // Generate Bill Number
    // Filter for transactions with the same prefix
    const currentMonthTransactions = transactions.filter((t: any) => 
      t.bill_number && t.bill_number.startsWith(prefix)
    );

    let sequence = 1;
    if (currentMonthTransactions.length > 0) {
      // Find max sequence
      const maxSeq = currentMonthTransactions.reduce((max: number, t: any) => {
        const seq = parseInt(t.bill_number.slice(-4));
        return seq > max ? seq : max;
      }, 0);
      sequence = maxSeq + 1;
    }

    const billNumber = `${prefix}${String(sequence).padStart(4, '0')}`;
    
    const newTransaction = {
      id: timestamp, // Using timestamp as ID for simplicity
      bill_number: billNumber,
      student_name: studentName,
      class_name: className,
      amount: amount,
      date: date,
      timestamp: timestamp
    };

    transactions.push(newTransaction);
    writeData(transactions);
    
    return { success: true, id: timestamp, bill_number: billNumber, date };
  } catch (error) {
    console.error("Failed to save transaction:", error);
    throw new Error("Data error: " + error);
  }
});

// Get Transactions (History)
ipcMain.handle('get-transactions', async (event) => {
  try {
    const transactions = readData();
    // Sort by timestamp DESC
    return transactions.sort((a: any, b: any) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return [];
  }
});