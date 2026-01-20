import { useState, useEffect, useMemo } from 'react';
import { Printer, History, PlusCircle, Search, Trash2, ArrowUpDown, ArrowUp, ArrowDown, BarChart3 } from 'lucide-react';
import Swal from 'sweetalert2';

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
  const [activeTab, setActiveTab] = useState<'billing' | 'history' | 'revenue'>('billing');

  // Lifted state for BillingPage to manage print logic at App level
  const [studentName, setStudentName] = useState('');
  const [cart, setCart] = useState<typeof COURSE_FEES>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [currentBillNo, setCurrentBillNo] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setIsConnected(!!window.api);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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
    const cuteAlert = {
      width: 320,
      padding: '1.5rem',
      customClass: {
        popup: 'rounded-[2rem]',
        confirmButton: 'rounded-full px-6 font-bold shadow-md',
        cancelButton: 'rounded-full px-6 font-bold shadow-md',
        title: 'text-lg font-bold text-gray-800',
        htmlContainer: 'text-sm text-gray-500'
      }
    };

    if (!studentName.trim()) {
      Swal.fire({
        ...cuteAlert,
        icon: 'warning',
        title: 'Missing Info',
        text: 'Please enter a student name.',
        confirmButtonColor: '#00B140'
      });
      return;
    }
    if (cart.length === 0) {
      Swal.fire({
        ...cuteAlert,
        icon: 'warning',
        title: 'Empty Cart',
        text: 'Please select at least one course.',
        confirmButtonColor: '#00B140'
      });
      return;
    }

    const result = await Swal.fire({
      ...cuteAlert,
      title: 'Confirm Payment?',
      html: `Pay <b class="text-[#00B140]">Rs. ${totalAmount.toLocaleString()}</b><br/>for ${studentName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#00B140',
      cancelButtonColor: '#FF671F',
      confirmButtonText: 'Yes, Pay',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    setIsPrinting(true);

    try {
      let billNumbers: string[] = [];

      // 1. Save all transactions first
      if (window.api) {
        for (const item of cart) {
          const res = await window.api.saveTransaction({
            studentName,
            className: item.name,
            amount: item.price
          });
          if (res && res.bill_number) {
            billNumbers.push(res.bill_number);
          }
        }
      } else {
        Swal.fire({
          ...cuteAlert,
          icon: 'info',
          title: 'Browser Mode',
          text: "History will NOT be saved in browser.",
          confirmButtonColor: '#00B140'
        });
      }

      // Format Bill Number string
      const billNoStr = billNumbers.length > 0
        ? (billNumbers.length > 1 ? `${billNumbers[0]} - ${billNumbers[billNumbers.length - 1]}` : billNumbers[0])
        : `TEMP-${Date.now().toString().slice(-6)}`;

      setCurrentBillNo(billNoStr);

      // 2. Trigger Print (Wait for state update)
      setTimeout(() => {
        window.print();

        // 3. Show Success & Reset (Runs after print dialog closes)
        setTimeout(() => {
          if (window.api) {
            const Toast = Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 2000,
              timerProgressBar: true,
              didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
              }
            })

            Toast.fire({
              icon: 'success',
              title: 'Payment Recorded!'
            })
          }
          setIsPrinting(false);
          setStudentName('');
          setCart([]);
          setCurrentBillNo('');
        }, 500);
      }, 500);

    } catch (error) {
      console.error("Transaction failed", error);
      Swal.fire({
        ...cuteAlert,
        icon: 'error',
        title: 'Oops!',
        text: 'Something went wrong.',
        confirmButtonColor: '#d33'
      });
      setIsPrinting(false);
    }
  };

  return (
    <div className="h-screen bg-gray-100 font-sans text-gray-800 overflow-hidden print:overflow-visible">
      {/* Main UI - Hidden when printing */}
      <div className="flex h-full print:hidden flex-col md:flex-row">

        {/* Mobile Header */}
        <header className="md:hidden bg-white shadow-sm p-3 flex justify-between items-center z-20 shrink-0 h-16">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            <div className="leading-tight">
              <h1 className="font-bold text-gray-800 text-lg">Hinode POS</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase">{currentTime.toLocaleDateString()}</p>
            </div>
          </div>
          <div className="font-mono font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </header>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 bg-white shadow-md flex-col z-10 shrink-0">
          <div className="mt-10 flex flex-col items-center border-b border-gray-100 pb-6">
            <div className="w-[150px] h-[150px]">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="mt-4 text-center">
              <p className="text-3xl font-black text-gray-800 tracking-tight">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                {currentTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'billing'
                ? 'bg-[#00B140] text-white shadow-md transform scale-105'
                : 'text-gray-600 hover:bg-gray-50 hover:text-[#00B140]'
                }`}
            >
              <PlusCircle size={20} />
              <span className="font-semibold">New Payment</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'history'
                ? 'bg-[#00B140] text-white shadow-md transform scale-105'
                : 'text-gray-600 hover:bg-gray-50 hover:text-[#00B140]'
                }`}
            >
              <History size={20} />
              <span className="font-semibold">History</span>
            </button>

            <button
              onClick={() => setActiveTab('revenue')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'revenue'
                ? 'bg-[#00B140] text-white shadow-md transform scale-105'
                : 'text-gray-600 hover:bg-gray-50 hover:text-[#00B140]'
                }`}
            >
              <BarChart3 size={20} />
              <span className="font-semibold">Revenue</span>
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
        <main className="flex-1 overflow-hidden relative flex flex-col h-[calc(100vh-128px)] md:h-full">
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
          ) : activeTab === 'history' ? (
            <HistoryPage />
          ) : (
            <RevenuePage />
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-gray-100 shrink-0 h-16 flex justify-around items-center z-30">
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'billing' ? 'text-[#00B140]' : 'text-gray-400'}`}
          >
            <PlusCircle size={24} />
            <span className="text-[10px] font-bold uppercase">Payment</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'history' ? 'text-[#00B140]' : 'text-gray-400'}`}
          >
            <History size={24} />
            <span className="text-[10px] font-bold uppercase">History</span>
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'revenue' ? 'text-[#00B140]' : 'text-gray-400'}`}
          >
            <BarChart3 size={24} />
            <span className="text-[10px] font-bold uppercase">Revenue</span>
          </button>
        </nav>
      </div>

      {/* Print Receipt Template - Optimized for 80mm Thermal Printer (Xprinter XP-80T) */}
      <div className="fixed inset-0 bg-white z-[-1] print:z-[9999] print:block p-0">
        <div className="w-[80mm] max-w-full mx-auto print:mx-0 p-2 text-gray-900">
          <div className="text-center border-b border-dashed border-gray-800 pb-4 mb-4">
            <div className="flex flex-col items-center gap-2 mb-2">
              <img src="/2nd_image.jpg" alt="Hinode Logo" className="w-42 h-32 object-contain" />

            </div>
            <p className="text-[10px] text-gray-600 uppercase tracking-tighter">Official Payment Receipt</p>
          </div>

          <div className="flex justify-between items-start mb-4 text-[11px]">
            <div>
              <p className="text-[9px] text-gray-500 uppercase font-bold">Student</p>
              <p className="font-bold">{studentName}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-gray-500 uppercase font-bold">Bill No</p>
              <p className="font-mono font-bold">{currentBillNo}</p>
            </div>
          </div>

          <div className="mb-4 text-[10px] text-gray-600 border-b border-dashed border-gray-300 pb-2">
            <p>Date: {new Date().toLocaleDateString()}</p>
            <p>Time: {new Date().toLocaleTimeString()}</p>
          </div>

          <table className="w-full mb-4 text-[11px]">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="py-1 text-left font-bold uppercase">Item</th>
                <th className="py-1 text-right font-bold uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-gray-200">
              {cart.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 pr-2">
                    <div className="font-bold">{item.name}</div>
                    <div className="text-[9px] text-gray-500">{item.schedule}</div>
                  </td>
                  <td className="py-2 text-right align-top font-bold">{item.price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col items-end border-t border-gray-800 pt-2 mb-6">
            <div className="flex justify-between w-full text-lg font-bold">
              <span>TOTAL</span>
              <span>Rs.{totalAmount.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-gray-500">Paid in Cash</p>
          </div>

          <div className="text-center pt-4 border-t border-dashed border-gray-300 pb-10">
            <p className="font-bold text-sm">Thank You!</p>
            <p className="text-[9px] text-gray-500 mt-1">Please retain this receipt.</p>

            <p className="text-[8px] text-gray-400 mt-2">Develop & Designed by ZipZipy(Pvt)Ltd.</p>
            <p className="text-[8px] text-gray-400 mt-1">076 6595714</p>
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
    <div className="h-full flex flex-col md:flex-row gap-0 overflow-hidden">
      {/* Course Selection Area */}
      <div className="flex-1 bg-gray-200 p-4 md:p-8 overflow-y-auto order-1">
        <header className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Select Courses</h2>
            <p className="text-sm md:text-base text-gray-500">Click to add to bill</p>
          </div>
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search classes..."
              className="w-full md:w-64 pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00B140] focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 pb-20">
          {filteredCourses.map((course) => (
            <button
              key={course.id}
              onClick={() => addToCart(course)}
              className="group flex flex-col items-start p-4 md:p-5 bg-white rounded-2xl shadow-sm border border-transparent hover:border-[#00B140] hover:shadow-md transition-all duration-200 text-left"
            >
              <div className="flex justify-between w-full mb-2">
                <span className="font-bold text-gray-800 group-hover:text-[#00B140] transition-colors line-clamp-1">{course.name}</span>
                <span className="font-bold text-[#FF671F] shrink-0 ml-2">Rs. {course.price.toLocaleString()}</span>
              </div>
              <span className="text-xs md:text-sm text-gray-400 line-clamp-1">{course.schedule}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bill / Cart Area */}
      <div className="w-full md:w-[400px] bg-white-500 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] md:shadow-2xl flex flex-col h-[45%] md:h-full border-t md:border-t-0 md:border-l border-gray-100 z-20 order-2 shrink-0">
        <div className="p-4 md:p-6 bg-[#00B140] text-white shrink-0">
          <h3 className="text-lg font-bold">Courses Bill</h3>
          <p className="text-green-100 text-sm hidden md:block">Review details before printing</p>
        </div>

        <div className="p-4 md:p-6 flex-1 overflow-y-auto flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Student Name</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Enter student name"
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00B140] transition-all"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Selected Items ({cart.length})</label>
            {cart.length === 0 ? (
              <div className="text-center py-6 md:py-10 text-gray-400 border-2 border-dashed border-gray-400 rounded-xl text-sm">
                No items selected
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="flex justify-between items-center bg-green-100 p-3 border-2 border-line border-gray-400 rounded-lg group">
                    <div className="overflow-hidden">
                      <div className="font-medium text-gray-800 text-m truncate">{item.name}</div>
                      <div className="text-sm text-gray-500">Rs. {item.price.toLocaleString()}</div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-100 shrink-0">
          <div className="flex justify-between items-end mb-4 md:mb-6">
            <span className="text-gray-500 font-medium text-sm">Total Amount</span>
            <span className="text-2xl md:text-3xl font-bold text-gray-800">Rs. {totalAmount.toLocaleString()}</span>
          </div>

          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className={`w-full py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-base md:text-lg shadow-lg transition-all transform active:scale-95 ${isPrinting
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#FF671F] text-white hover:bg-[#ff5700] hover:shadow-[#FF671F]/30'
              }`}
          >
            <Printer size={20} className="md:w-6 md:h-6" />
            <span>{isPrinting ? 'PRINTING...' : 'PAY & PRINT'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Revenue Page Component ---
const RevenuePage = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedClass, setSelectedClass] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        if (window.api) {
          const data = await window.api.getTransactions();
          setTransactions(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // -- Calculations --
  const uniqueClasses = useMemo(() => {
    const classes = new Set<string>();
    // Add known courses
    COURSE_FEES.forEach(c => classes.add(c.name));
    // Add any from history that might not be in current fees
    transactions.forEach(t => classes.add(t.class_name));
    return Array.from(classes).sort();
  }, [transactions]);

  const yearTransactions = transactions.filter(t => {
    const d = new Date(t.timestamp);
    const matchesYear = d.getFullYear() === selectedYear;
    const matchesClass = selectedClass === 'All' || t.class_name === selectedClass;
    return matchesYear && matchesClass;
  });

  const monthTransactions = yearTransactions.filter(t => {
    const d = new Date(t.timestamp);
    return d.getMonth() === selectedMonth;
  });

  const yearlyRevenue = yearTransactions.reduce((sum, t) => sum + t.amount, 0);
  const monthlyRevenue = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

  const getBreakdown = (txs: any[]) => {
    const map: Record<string, number> = {};
    txs.forEach(t => {
      map[t.class_name] = (map[t.class_name] || 0) + t.amount;
    });
    return map;
  };

  const yearlyClassRevenue = getBreakdown(yearTransactions);
  const monthlyClassRevenue = getBreakdown(monthTransactions);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (loading) return <div className="h-full flex items-center justify-center font-bold text-gray-400">Loading Analytics...</div>;

  return (
    <div className="h-full flex flex-col bg-green-50/50 overflow-hidden">
      {/* Revenue Header */}
      <header className="shrink-0 bg-white border-b border-gray-100 shadow-sm px-8 py-6 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Revenue Analytics</h2>
            <p className="text-sm text-gray-400 font-medium mt-0.5">Financial overview and performance</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Class Filter */}
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00B140]/20 focus:border-[#00B140] transition-all cursor-pointer shadow-sm hover:border-[#00B140] min-w-[150px]"
              >
                <option value="All">All Classes</option>
                {uniqueClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                <ArrowDown size={14} />
              </div>
            </div>

            {/* Month Filter */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00B140]/20 focus:border-[#00B140] transition-all cursor-pointer shadow-sm hover:border-[#00B140] min-w-[140px]"
              >
                {months.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                <ArrowDown size={14} />
              </div>
            </div>

            {/* Year Filter */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00B140]/20 focus:border-[#00B140] transition-all cursor-pointer shadow-sm hover:border-[#00B140]"
              >
                {[2024, 2025, 2026, 2027, 2028].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                <ArrowDown size={14} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Card */}
            <div className="bg-white rounded-[1.5rem] p-6 shadow-xl shadow-green-900/5 border border-green-50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00B140]/5 rounded-full -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative z-10">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Revenue ({months[selectedMonth]} {selectedYear})
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-gray-800 tracking-tight">Rs. {monthlyRevenue.toLocaleString()}</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#00B140] bg-[#00B140]/10 w-fit px-3 py-1.5 rounded-full">
                  <BarChart3 size={14} />
                  <span>{selectedClass === 'All' ? 'All Classes' : selectedClass}</span>
                </div>
              </div>
            </div>

            {/* Yearly Card */}
            <div className="bg-white rounded-[1.5rem] p-6 shadow-xl shadow-blue-900/5 border border-blue-50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative z-10">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Revenue ({selectedYear})
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-gray-800 tracking-tight">Rs. {yearlyRevenue.toLocaleString()}</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 w-fit px-3 py-1.5 rounded-full">
                  <BarChart3 size={14} />
                  <span>{selectedClass === 'All' ? 'All Classes' : selectedClass}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Monthly Breakdown */}
            <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-gray-200/50 border border-gray-100 flex flex-col h-[500px]">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#00B140] rounded-full"></span>
                Monthly Breakdown ({months[selectedMonth]})
              </h3>
              <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                {Object.keys(monthlyClassRevenue).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <p>No data for {months[selectedMonth]}</p>
                  </div>
                ) : (
                  Object.entries(monthlyClassRevenue)
                    .sort(([, a], [, b]) => b - a)
                    .map(([className, amount]) => {
                      const percentage = (amount / monthlyRevenue) * 100;
                      return (
                        <div key={className} className="group">
                          <div className="flex justify-between items-end mb-2">
                            <span className="font-bold text-gray-700 text-sm">{className}</span>
                            <span className="font-black text-gray-800 text-sm">Rs. {amount.toLocaleString()}</span>
                          </div>
                          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#00B140] rounded-full group-hover:bg-[#009e3a] transition-all duration-500 ease-out"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Yearly Breakdown */}
            <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-gray-200/50 border border-gray-100 flex flex-col h-[500px]">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                Yearly Breakdown ({selectedYear})
              </h3>
              <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                {Object.keys(yearlyClassRevenue).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <p>No data for {selectedYear}</p>
                  </div>
                ) : (
                  Object.entries(yearlyClassRevenue)
                    .sort(([, a], [, b]) => b - a)
                    .map(([className, amount]) => {
                      const percentage = (amount / yearlyRevenue) * 100;
                      return (
                        <div key={className} className="group">
                          <div className="flex justify-between items-end mb-2">
                            <span className="font-bold text-gray-700 text-sm">{className}</span>
                            <span className="font-black text-gray-800 text-sm">Rs. {amount.toLocaleString()}</span>
                          </div>
                          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full group-hover:bg-blue-600 transition-all duration-500 ease-out"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

          </div>

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

  // State for Month Filter (Default: Current Month)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // State for Date Filter (Default: Empty, as month is default)
  const [selectedDate, setSelectedDate] = useState('');

  const [filterCourse, setFilterCourse] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleDelete = async (id: number) => {
    const { value: password } = await Swal.fire({
      title: 'Enter Admin Password',
      input: 'password',
      inputLabel: 'Password required to delete record',
      inputPlaceholder: 'Enter password',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Delete',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!'
        }
      }
    });

    if (password) {
      if (password === 'admin123') {
        try {
          if (window.api) {
            const result = await window.api.deleteTransaction(id);
            if (result.success) {
              Swal.fire('Deleted!', 'Transaction has been deleted.', 'success');
              loadData();
            } else {
              Swal.fire('Error!', result.error || 'Failed to delete.', 'error');
            }
          } else {
            Swal.fire('Info', 'Delete not available in browser mode', 'info');
          }
        } catch (error) {
          Swal.fire('Error!', 'An unexpected error occurred.', 'error');
        }
      } else {
        Swal.fire('Error!', 'Incorrect Password!', 'error');
      }
    }
  };

  const handleExport = async () => {
    if (!window.api) {
      Swal.fire('Info', 'Export not available in browser mode', 'info');
      return;
    }

    const { value: dateRange } = await Swal.fire({
      title: 'Export Payment Report',
      html: `
        <div class="flex flex-col gap-4 text-left">
          <div>
            <label class="block text-sm font-bold text-gray-600 mb-1">Start Date</label>
            <input id="swal-start-date" type="date" class="swal2-input m-0 w-full" value="${selectedMonth ? `${selectedMonth}-01` : new Date().toISOString().split('T')[0]}">
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-600 mb-1">End Date</label>
            <input id="swal-end-date" type="date" class="swal2-input m-0 w-full" value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Download Report',
      confirmButtonColor: '#00B140',
      preConfirm: () => {
        const start = (document.getElementById('swal-start-date') as HTMLInputElement).value;
        const end = (document.getElementById('swal-end-date') as HTMLInputElement).value;
        if (!start || !end) {
          Swal.showValidationMessage('Please select both start and end dates');
          return false;
        }
        if (start > end) {
          Swal.showValidationMessage('Start date cannot be after end date');
          return false;
        }
        return { startDate: start, endDate: end };
      }
    });

    if (dateRange) {
      try {
        Swal.fire({
          title: 'Generating Report...',
          didOpen: () => Swal.showLoading(),
          allowOutsideClick: false
        });

        const result = await window.api.exportTransactions(dateRange);

        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Export Successful',
            text: `Saved to: ${result.filePath}`,
            confirmButtonColor: '#00B140'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Export Failed',
            text: result.error || 'Unknown error occurred',
            confirmButtonColor: '#d33'
          });
        }
      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'An unexpected error occurred', 'error');
      }
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedTransactions = useMemo(() => {
    if (!transactions.length) return [];

    let result = [...transactions];

    // 0. Search Filter (Bill No or Student Name)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(tx =>
        (tx.bill_number && tx.bill_number.toLowerCase().includes(q)) ||
        (tx.student_name && tx.student_name.toLowerCase().includes(q))
      );
    }

    // 1. Filter Logic (Date takes precedence over Month)
    if (selectedDate) {
      // Filter by specific DATE
      result = result.filter(tx => {
        const d = new Date(tx.timestamp);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const txDateStr = `${year}-${month}-${day}`;
        return txDateStr === selectedDate;
      });
    } else if (selectedMonth) {
      // Filter by MONTH
      result = result.filter(tx => {
        const d = new Date(tx.timestamp);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const txMonth = `${year}-${month}`;
        return txMonth === selectedMonth;
      });
    }

    // 2. Filter by Course
    if (filterCourse) {
      result = result.filter(tx => tx.class_name === filterCourse);
    }

    // 3. Sort
    return result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [transactions, sortConfig, selectedMonth, selectedDate, filterCourse, searchQuery]);

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-400" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp size={14} className="text-[#00B140]" />
      : <ArrowDown size={14} className="text-[#00B140]" />;
  };

  const getHeaderText = () => {
    if (searchQuery) return `Search results for "${searchQuery}"`;
    if (selectedDate) {
      return `Showing records for ${new Date(selectedDate).toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}`
    }
    if (selectedMonth) {
      return `Showing records for ${new Date(selectedMonth).toLocaleDateString('default', { month: 'long', year: 'numeric' })}`
    }
    return 'Showing all records';
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Enhanced Header */}
      <header className="shrink-0 bg-white border-b border-gray-100 shadow-sm px-4 md:px-8 py-4 md:py-6 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
          {/* Top Row: Title & Report Button */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">Payment History</h2>
              <p className="text-sm text-gray-400 font-medium mt-0.5">{getHeaderText()}</p>
            </div>

            <button
              onClick={handleExport}
              className="px-4 py-2 bg-[#00B140] hover:bg-[#009e3a] text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider shadow-sm"
              title="Export Report"
            >
              <ArrowDown size={16} />
              <span>Report</span>
            </button>
          </div>

          {/* Bottom Row: Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-end">
            {/* Search */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Quick Search</label>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#00B140] transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Bill No / Student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00B140]/20 focus:border-[#00B140] transition-all"
                />
              </div>
            </div>

            {/* Month */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Filter by Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setSelectedDate('');
                }}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00B140]/20 focus:border-[#00B140] transition-all cursor-pointer"
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Filter by Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedMonth('');
                }}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00B140]/20 focus:border-[#00B140] transition-all cursor-pointer"
              />
            </div>

            {/* Course */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Filter by Course</label>
              <div className="relative">
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00B140]/20 focus:border-[#00B140] transition-all cursor-pointer"
                >
                  <option value="">All Courses</option>
                  {COURSE_FEES.map(course => (
                    <option key={course.id} value={course.name}>{course.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>

            {/* Actions: Clear & Refresh */}
            <div className="flex items-center justify-end gap-2 h-full pb-1">
              {(selectedMonth || selectedDate || filterCourse || searchQuery) && (
                <button
                  onClick={() => { setSelectedMonth(''); setSelectedDate(''); setFilterCourse(''); setSearchQuery(''); }}
                  className="px-3 py-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Clear All
                </button>
              )}

              <button
                onClick={loadData}
                className="px-3 py-2 text-[#00B140] hover:bg-green-50 hover:text-[#009e3a] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                title="Refresh Data"
              >
                <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Table Container */}
      <div className="flex-1 p-4 md:p-8 overflow-hidden bg-gray-100">
        <div className="h-full bg-white rounded-[1rem] shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left relative min-w-[800px] border-collapse">
              <thead className="sticky top-0 z-20 shadow-sm">
                <tr className="bg-white/95 backdrop-blur-md">
                  <th
                    className="p-5 font-bold text-gray-400 text-[12px] uppercase tracking-widest cursor-pointer hover:text-[#00B140] transition-colors border-b border-gray-200"
                    onClick={() => handleSort('bill_number')}
                  >
                    <div className="flex items-center gap-2">
                      Bill Details {getSortIcon('bill_number')}
                    </div>
                  </th>
                  <th className="p-5 font-bold text-gray-400 text-[12px] uppercase tracking-widest border-b border-gray-200">Student Name</th>

                  <th
                    className="p-5 font-bold text-gray-400 text-[12px] uppercase tracking-widest cursor-pointer hover:text-[#00B140] transition-colors border-b border-gray-200"
                    onClick={() => handleSort('timestamp')}
                  >
                    <div className="flex items-center gap-2">
                      Payment Date {getSortIcon('timestamp')}
                    </div>
                  </th>
                  <th
                    className="p-5 font-bold text-gray-400 text-[12px] uppercase tracking-widest cursor-pointer hover:text-[#00B140] transition-colors border-b border-gray-200"
                    onClick={() => handleSort('class_name')}
                  >
                    <div className="flex items-center gap-2">
                      Course Plan {getSortIcon('class_name')}
                    </div>
                  </th>
                  <th className="p-5 font-bold text-gray-400 text-[12px] uppercase tracking-widest text-right border-b border-gray-200">Settled Amount</th>
                  <th className="p-5 font-bold text-gray-400 text-[12px] uppercase tracking-widest text-center border-b border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-gray-100 border-t-[#00B140] rounded-full animate-spin"></div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Syncing Data</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-5">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                          <Search size={32} className="text-gray-200" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xl font-black text-gray-800 tracking-tight">No Records Found</p>
                          <p className="text-sm text-gray-400 font-medium">Try adjusting your filters or search terms</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-[#00B140]/[0.02] transition-colors group">
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center gap-4">

                          <div className="flex flex-col">
                            <span className="text-m font-black text-gray-800 font-mono tracking-tighter">{tx.bill_number || 'N/A'}</span>

                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-600 text-m tracking-tight uppercase group-hover:text-[#79C9C5] transition-colors">{tx.student_name}</span>

                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-700">{tx.date.split(',')[0]}</span>
                          <span className="text-[11px] font-medium text-gray-400">{tx.date.split(',')[1]}</span>
                        </div>
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <span className=" font-black text-gray-600 text-m tracking-tight uppercase group-hover:text-[#D1855C] transition-colors ">
                          {tx.class_name}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-middle text-right">
                        <span className="font-bold text-gray-800">Rs. {tx.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-5 align-middle text-center">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Record"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div >
    </div >
  );
};

export default App;