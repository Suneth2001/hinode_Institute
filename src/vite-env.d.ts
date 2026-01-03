/// <reference types="vite/client" />

interface Window {
  api: {
    saveTransaction: (data: { studentName: string; className: string; amount: number }) => Promise<{ success: boolean; id: number; date: string }>;
    getTransactions: () => Promise<Array<{ id: number; student_name: string; class_name: string; amount: number; date: string; timestamp: number }>>;
  };
}
