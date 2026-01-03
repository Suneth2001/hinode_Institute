import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  saveTransaction: (data: any) => ipcRenderer.invoke('save-transaction', data),
  getTransactions: () => ipcRenderer.invoke('get-transactions'),
});
