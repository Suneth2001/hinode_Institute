/// <reference types="vite/client" />

interface Window {
  api: {
    saveTransaction: (data: { studentName: string; className: string; amount: number; date?: string }) => Promise<{ success: boolean; id: number; bill_number: string; date: string }>;
    getTransactions: () => Promise<Array<{ id: number; bill_number: string; student_name: string; class_name: string; amount: number; date: string; timestamp: number }>>;
    deleteTransaction: (id: number) => Promise<{ success: boolean; error?: string }>;
    exportTransactions: (range: { startDate: string; endDate: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  };
}
