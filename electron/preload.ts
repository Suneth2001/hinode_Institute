import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  saveTransaction: (data: any) => ipcRenderer.invoke('save-transaction', data),
  getTransactions: () => ipcRenderer.invoke('get-transactions'),
  deleteTransaction: (id: number) => ipcRenderer.invoke('delete-transaction', id),
  exportTransactions: (range: { startDate: string; endDate: string }) => ipcRenderer.invoke('export-transactions', range),
});
