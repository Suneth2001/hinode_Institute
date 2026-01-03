import { useState, useEffect, useMemo } from 'react';
import { Printer, History, PlusCircle, Search, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// --- Constants ---
const COURSE_FEES = [
  { id: 1, name: "Admission Fee", price: 1000, schedule: "One Time" },
  { id: 2, name: "Grade 6 to 11", price: 1200, schedule: "Tue 3.30 p.m - 5.30 p.m" },
  { id: 3, name: "Grade 6 to 11", price: 1200, schedule: "Wed 3 p.m - 5 p.m" },
  { id: 4, name: "Grade 6 to 11 Special", price: 1000, schedule: "Monthly" },
  { id: 5, name: "2026 AL Revision", price: 3500, schedule: "Fri 10.30 a.m - 5.30 p.m" },
  { id: 6, name: "2027 AL Theory", price: 2500, schedule: "Mon 3 p.m - 5.30 p.m" },
  { id: 7, name: "2027 AL Revision", price: 4000, schedule: "Mon 10 a.m - 5.30 p.m" },
  { id: 8, name: "2028 AL Theory", price: 3000, schedule: "Thu 3 p.m - 5.30 p.m" },
  { id: 9, name: "2028 AL Revision", price: 4500, schedule: "Thu 10 a.m - 5.30 p.m" },
  { id: 10, name: "N5 Japanese", price: 5000, schedule: "Sun 2.30 p.m - 5.30 p.m" },
  { id: 11, name: "N4 Japanese", price: 5000, schedule: "Mon 7 p.m - 10 p.m" },
  { id: 12, name: "JFT (Weekdays)", price: 10000, schedule: "Tue, Wed, Thu 10 a.m - 2 p.m" },
  { id: 13, name: "JFT (Weekends)", price: 10000, schedule: "Sat 10-5, Sun 10-2" },
];

// --- Props Interface for BillingPage ---
interface BillingPageProps {
  studentName: string;
  setStudentName: (name: string) => void;
  cart: typeof COURSE_FEES;
  setCart: (cart: typeof COURSE_FEES) => void;
  addToCart: (course: typeof COURSE_FEES[0]) => void;
  removeFromCart: (id: number) => void;
  handlePrint: () => void;
  isPrinting: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredCourses: typeof COURSE_FEES;
  totalAmount: number;
}

const App = () => {
  const [activeTab, setActiveTab] = useState<'billing' | 'history'>('billing');
  
  // Lifted state for BillingPage to manage print logic at App level
  const [studentName, setStudentName] = useState('');
  const [cart, setCart] = useState<typeof COURSE_FEES>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(!!window.api);
  }, []);

  const addToCart = (course: typeof COURSE_FEES[0]) => {
    if (!cart.find(c => c.id === course.id)) {
      setCart([...cart, course]);
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

  const filteredCourses = COURSE_FEES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.schedule.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = async () => {
    if (!studentName.trim()) {
      alert("Please enter a student name.");
      return;
    }
    if (cart.length === 0) {
      alert("Please select at least one course.");
      return;
    }

    if (!confirm(`Confirm payment of Rs. ${totalAmount.toLocaleString()} for ${studentName}?`)) {
      return;
    }

    setIsPrinting(true);

    try {
      // 1. Save all transactions first
      if (window.api) {
        for (const item of cart) {
          await window.api.saveTransaction({
            studentName,
            className: item.name,
            amount: item.price
          });
        }
      } else {
        alert("Running in Browser? History will NOT be saved.\nPlease run the Desktop App: npm run electron:dev");
      }
      
      // 2. Trigger Print (Blocking in most browsers/Electron)
      window.print();

      // 3. Show Success & Reset (Runs after print dialog closes)
      setTimeout(() => {
        // Only show success if api was present or user acknowledged the warning (implied)
        if (window.api) {
           alert("Payment Recorded Successfully!");
        }
        setIsPrinting(false);
        setStudentName('');
        setCart([]);
      }, 500);

    } catch (error) {
      console.error("Transaction failed", error);
      alert("Error saving transaction! Check console for details.");
      setIsPrinting(false);
    }
  };

  return (
    <div className="h-screen bg-gray-100 font-sans text-gray-800">
      {/* Main UI - Hidden when printing */}
      <div className="flex h-full print:hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md flex flex-col z-10">
          <div className="p-6 flex flex-col items-center border-b border-gray-100">
            <div className="w-16 h-16 bg-[#00B140] rounded-full flex items-center justify-center mb-3 shadow-lg">
               <span className="text-white text-2xl font-bold">H</span>
            </div>
            <h1 className="text-xl font-bold text-[#00B140] tracking-tight">HINODE</h1>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-widest">Institute</h2>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'billing' 
                  ? 'bg-[#00B140] text-white shadow-md transform scale-105' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#00B140]'
              }`}
            >
              <PlusCircle size={20} />
              <span className="font-semibold">New Payment</span>
            </button>
            
            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'history' 
                  ? 'bg-[#00B140] text-white shadow-md transform scale-105' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#00B140]'
              }`}
            >
              <History size={20} />
              <span className="font-semibold">History</span>
            </button>
          </nav>

          <div className="p-4 border-t border-gray-100 text-center text-xs text-gray-400">
            <p>Hinode POS v1.0</p>
            <div className={`mt-2 flex items-center justify-center gap-2 ${isConnected ? 'text-green-600' : 'text-red-500'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              {isConnected ? 'System Ready' : 'Browser Mode (No DB)'}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'billing' ? (
            <BillingPage 
              studentName={studentName} 
              setStudentName={setStudentName}
              cart={cart}
              setCart={setCart}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
              handlePrint={handlePrint}
              isPrinting={isPrinting}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filteredCourses={filteredCourses}
              totalAmount={totalAmount}
            />
          ) : <HistoryPage />}
        </main>
      </div>

      {/* Print Receipt Template - Only visible when printing */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8">
          <div className="border-2 border-gray-800 p-8 h-full max-w-3xl mx-auto">
            <div className="text-center border-b-2 border-gray-800 pb-6 mb-6">
              <div className="flex justify-center items-center gap-2 mb-2">
                 <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white font-bold text-xs">H</div>
                 <h1 className="text-4xl font-bold uppercase tracking-wider">Hinode Institute</h1>
              </div>
              <p className="text-sm text-gray-600 uppercase tracking-widest">Official Payment Receipt</p>
            </div>

            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Student Name</p>
                <p className="text-xl font-bold">{studentName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-bold">Date & Time</p>
                <p className="text-sm font-medium">{new Date().toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Ref: #{Date.now().toString().slice(-8)}</p>
              </div>
            </div>

            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-gray-800">
                  <th className="py-2 text-left font-bold uppercase text-sm">Description</th>
                  <th className="py-2 text-right font-bold uppercase text-sm">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cart.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 text-sm">{item.name} <span className="text-xs text-gray-500 block">{item.schedule}</span></td>
                    <td className="py-3 text-right font-medium">{item.price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-col items-end border-t-2 border-gray-800 pt-4 mb-12">
              <div className="flex justify-between w-64 text-2xl font-bold">
                <span>TOTAL</span>
                <span>Rs. {totalAmount.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Paid in Cash</p>
            </div>

            <div className="text-center mt-auto pt-8 border-t border-gray-200">
              <p className="font-bold text-gray-800">Thank You!</p>
              <p className="text-xs text-gray-500 mt-1">Please retain this receipt for your records.</p>
              <p className="text-xs text-gray-400 mt-4">System Generated Receipt | Hinode Institute</p>
            </div>
          </div>
      </div>
    </div>
  );
};

// --- Billing Component ---
const BillingPage = ({ 
  studentName, setStudentName, cart, addToCart, removeFromCart, 
  handlePrint, isPrinting, searchQuery, setSearchQuery, filteredCourses, totalAmount 
}: BillingPageProps) => {

  return (
    <div className="h-full flex gap-0">
      {/* Course Selection Area */}
      <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Select Courses</h2>
            <p className="text-gray-500">Click to add to bill</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search classes..." 
              className="pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00B140] focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
          {filteredCourses.map((course) => (
            <button
              key={course.id}
              onClick={() => addToCart(course)}
              className="group flex flex-col items-start p-5 bg-white rounded-2xl shadow-sm border border-transparent hover:border-[#00B140] hover:shadow-md transition-all duration-200 text-left"
            >
              <div className="flex justify-between w-full mb-2">
                <span className="font-bold text-gray-800 group-hover:text-[#00B140] transition-colors">{course.name}</span>
                <span className="font-bold text-[#FF671F]">Rs. {course.price.toLocaleString()}</span>
              </div>
              <span className="text-sm text-gray-400">{course.schedule}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bill / Cart Area */}
      <div className="w-[400px] bg-white shadow-2xl flex flex-col h-full border-l border-gray-100 z-20">
        <div className="p-6 bg-[#00B140] text-white">
          <h3 className="text-lg font-bold">Current Bill</h3>
          <p className="text-green-100 text-sm">Review details before printing</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Student Name</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Enter student name"
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00B140] transition-all"
            />
          </div>

          <div className="flex-1">
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Selected Items ({cart.length})</label>
             {cart.length === 0 ? (
               <div className="text-center py-10 text-gray-300 border-2 border-dashed border-gray-100 rounded-xl">
                 No items selected
               </div>
             ) : (
               <div className="space-y-3">
                 {cart.map((item, idx) => (
                   <div key={`${item.id}-${idx}`} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg group">
                     <div>
                       <div className="font-medium text-gray-800 text-sm">{item.name}</div>
                       <div className="text-xs text-gray-500">Rs. {item.price.toLocaleString()}</div>
                     </div>
                     <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                       <Trash2 size={16} />
                     </button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <div className="flex justify-between items-end mb-6">
            <span className="text-gray-500 font-medium">Total Amount</span>
            <span className="text-3xl font-bold text-gray-800">Rs. {totalAmount.toLocaleString()}</span>
          </div>

          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg shadow-lg transition-all transform active:scale-95 ${
              isPrinting
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#FF671F] text-white hover:bg-[#ff5700] hover:shadow-[#FF671F]/30'
            }`}
          >
            <Printer size={24} />
            <span>{isPrinting ? 'PRINTING...' : 'PAY & PRINT'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- History Component ---
const HistoryPage = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (window.api) {
        const data = await window.api.getTransactions();
        setTransactions(data);
      } else {
        console.warn("Electron API not detected. Showing mock history.");
        setTransactions([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTransactions = useMemo(() => {
    if (!transactions.length) return [];
    
    return [...transactions].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [transactions, sortConfig]);

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-400" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-[#00B140]" /> 
      : <ArrowDown size={14} className="text-[#00B140]" />;
  };

  return (
    <div className="h-full p-8 overflow-y-auto bg-gray-50">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Payment History</h2>
          <p className="text-gray-500">Recent transactions log</p>
        </div>
        <button onClick={loadData} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-600">
          Refresh
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th 
                className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => handleSort('timestamp')}
              >
                <div className="flex items-center gap-2">
                  Date {getSortIcon('timestamp')}
                </div>
              </th>
              <th className="p-4 font-semibold text-gray-600 text-sm">Student</th>
              <th 
                className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => handleSort('class_name')}
              >
                <div className="flex items-center gap-2">
                  Course {getSortIcon('class_name')}
                </div>
              </th>
              <th className="p-4 font-semibold text-gray-600 text-sm text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
               <tr><td colSpan={4} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : sortedTransactions.length === 0 ? (
               <tr><td colSpan={4} className="p-8 text-center text-gray-400">No records found</td></tr>
            ) : (
              sortedTransactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-sm text-gray-500">{tx.date}</td>
                  <td className="p-4 font-medium text-gray-800">{tx.student_name}</td>
                  <td className="p-4 text-sm text-gray-600">{tx.class_name}</td>
                  <td className="p-4 font-bold text-[#00B140] text-right">Rs. {tx.amount.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;