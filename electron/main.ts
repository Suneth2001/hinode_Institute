import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import ExcelJS from 'exceljs';
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
  const { studentName, className, amount, date: customDate } = data;
  const now = new Date();

  if (customDate) {
    const d = new Date(customDate);
    // Keep current time but switch to selected date
    now.setFullYear(d.getFullYear());
    now.setMonth(d.getMonth());
    now.setDate(d.getDate());
  }

  const date = now.toLocaleString();
  const timestamp = now.getTime();

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

// Delete Transaction
ipcMain.handle('delete-transaction', async (event, id) => {
  try {
    const transactions = readData();
    const initialLength = transactions.length;
    const newTransactions = transactions.filter((t: any) => t.id !== id);

    if (newTransactions.length === initialLength) {
      return { success: false, error: "Transaction not found" };
    }

    writeData(newTransactions);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return { success: false, error: String(error) };
  }
});

// Export Transactions to Excel
ipcMain.handle('export-transactions', async (event, { startDate, endDate }) => {
  try {
    const transactions = readData();

    // Filter by date range
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filtered = transactions.filter((t: any) => {
      const txDate = new Date(t.timestamp);
      return txDate >= start && txDate <= end;
    });

    if (filtered.length === 0) {
      return { success: false, error: "No transactions found in this range." };
    }

    // Create Workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payment History');

    // -- Styling Constants --
    const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF444444' } };
    const titleFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B140' } };
    const whiteBoldFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    const borderAll: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // -- Set Column Widths & Default Styles --
    sheet.columns = [
      { key: 'bill_no', width: 15, style: { font: { name: 'Arial', size: 10 }, alignment: { vertical: 'middle', horizontal: 'left' } } },
      { key: 'date', width: 12, style: { font: { name: 'Arial', size: 10 }, alignment: { vertical: 'middle', horizontal: 'center' } } },
      { key: 'time', width: 12, style: { font: { name: 'Arial', size: 10 }, alignment: { vertical: 'middle', horizontal: 'center' } } },
      { key: 'student', width: 30, style: { font: { name: 'Arial', size: 10 }, alignment: { vertical: 'middle', horizontal: 'left' } } },
      { key: 'course', width: 25, style: { font: { name: 'Arial', size: 10 }, alignment: { vertical: 'middle', horizontal: 'left' } } },
      { key: 'amount', width: 20, style: { font: { name: 'Arial', size: 10 }, alignment: { vertical: 'middle', horizontal: 'right' }, numFmt: '#,##0.00' } },
    ];

    // -- 1. Title Row --
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'HINODE INSTITUTE - PAYMENT HISTORY';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = titleFill;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // -- 2. Date Range Row --
    sheet.mergeCells('A2:F2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = `Report Period: ${startDate} to ${endDate}`;
    subtitleCell.font = { name: 'Arial', size: 10, italic: true };
    subtitleCell.alignment = { horizontal: 'center' };
    sheet.getRow(2).height = 20;

    // -- 3. Headers --
    const headerRow = sheet.getRow(4);
    headerRow.values = ['Bill No', 'Date', 'Time', 'Student Name', 'Course', 'Amount (Rs)'];
    headerRow.height = 25;

    headerRow.eachCell((cell) => {
      cell.font = whiteBoldFont;
      cell.fill = headerFill;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderAll;
    });

    // -- 4. Data Rows --
    let totalAmount = 0;

    filtered.forEach((t: any) => {
      totalAmount += t.amount;
      const d = new Date(t.timestamp);

      const row = sheet.addRow({
        bill_no: t.bill_number,
        date: d.toLocaleDateString(),
        time: d.toLocaleTimeString(),
        student: t.student_name,
        course: t.class_name,
        amount: t.amount
      });

      // Apply borders only (other styles inherited from columns)
      row.eachCell((cell) => {
        cell.border = borderAll;
      });
    });

    // -- 5. Total Row --
    const totalRow = sheet.addRow(['', '', '', '', 'TOTAL', totalAmount]);
    totalRow.height = 25;

    // Style Total Label
    const totalLabel = totalRow.getCell(5);
    totalLabel.font = { name: 'Arial', size: 12, bold: true };
    totalLabel.alignment = { horizontal: 'right', vertical: 'middle' };

    // Style Total Value
    const totalValue = totalRow.getCell(6);
    totalValue.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF00B140' } };
    totalValue.numFmt = 'Rs #,##0.00';
    totalValue.alignment = { horizontal: 'right', vertical: 'middle' };
    totalValue.border = borderAll;

    // -- Save Dialog --
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Payment Report',
      defaultPath: `Hinode_Report_${startDate}_${endDate}.xlsx`,
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    });

    if (filePath) {
      await workbook.xlsx.writeFile(filePath);
      return { success: true, filePath };
    } else {
      return { success: false, error: "Save cancelled" };
    }

  } catch (error) {
    console.error("Failed to export:", error);
    return { success: false, error: String(error) };
  }
});