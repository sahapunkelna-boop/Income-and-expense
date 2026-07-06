import { useState, useEffect, useMemo, FormEvent } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { Transaction, CATEGORIES } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Plus, Trash2, Calendar, ChevronLeft, ChevronRight, Wallet, Info } from "lucide-react";
import CategoryIcon from "./components/CategoryIcon";
import DashboardCharts from "./components/DashboardCharts";
import LineIntegration from "./components/LineIntegration";

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Manual Form States
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>("");

  // AI Form States
  const [aiInput, setAiInput] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [proposedTransaction, setProposedTransaction] = useState<{
    amount: number;
    type: "income" | "expense";
    category: string;
    description: string;
  } | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Set initial month and date on mount
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    
    setSelectedMonth(`${yyyy}-${mm}`);
    setDate(`${yyyy}-${mm}-${dd}`);
    
    // Set default category for manual form
    setCategory(CATEGORIES.expense[0].id);
  }, []);

  // Sync transactions in real-time from Firestore
  useEffect(() => {
    const trRef = collection(db, "transactions");
    const q = query(trRef, orderBy("date", "desc"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Transaction);
        });
        setTransactions(list);
      },
      (error) => {
        console.error("Firestore loading error:", error);
      }
    );
    
    return () => unsubscribe();
  }, []);

  // Filter transaction list for selected month
  const monthlyTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Compute available months with transactions, or default to current month
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    months.add(currentMonthStr);
    
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        months.add(t.date.substring(0, 7));
      }
    });
    
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Handle Month Stepping
  const handlePrevMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[idx + 1]);
    } else {
      // Step backward 1 calendar month
      const [y, m] = selectedMonth.split("-").map(Number);
      const prevDate = new Date(y, m - 2, 1);
      const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
      setSelectedMonth(prevStr);
    }
  };

  const handleNextMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx > 0) {
      setSelectedMonth(availableMonths[idx - 1]);
    } else {
      // Step forward 1 calendar month
      const [y, m] = selectedMonth.split("-").map(Number);
      const nextDate = new Date(y, m, 1);
      const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
      setSelectedMonth(nextStr);
    }
  };

  // Human Readable Month Label
  const selectedMonthLabel = useMemo(() => {
    if (!selectedMonth) return "";
    const [year, month] = selectedMonth.split("-");
    const monthNamesTh = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return `${monthNamesTh[parseInt(month) - 1]} ${parseInt(year) + 543}`;
  }, [selectedMonth]);

  // Manual Transaction Submit
  const handleManualSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("กรุณากรอกจำนวนเงินให้ถูกต้องและมากกว่า 0");
      return;
    }

    if (!category) {
      setFormError("กรุณาเลือกหมวดหมู่");
      return;
    }

    if (!description.trim()) {
      setFormError("กรุณากรอกคำอธิบายหรือชื่อรายการ");
      return;
    }

    try {
      await addDoc(collection(db, "transactions"), {
        amount: parsedAmount,
        type,
        category,
        description: description.trim(),
        date,
        createdAt: new Date().toISOString()
      });

      // Reset fields
      setAmount("");
      setDescription("");
      // Keep type, category, date as preferred for rapid entry
    } catch (err: any) {
      setFormError("ไม่สามารถบันทึกรายการได้: " + err.message);
    }
  };

  // AI Parsing API Request
  const handleAIParsing = async () => {
    if (!aiInput.trim()) {
      setAiError("กรุณาป้อนข้อความจดบันทึกของท่านก่อนวิเคราะห์");
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setProposedTransaction(null);

    try {
      const response = await fetch("/api/parse-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiInput })
      });

      if (!response.ok) {
        throw new Error("ระบบ AI ไม่ตอบสนอง กรุณาลองใช้อีกครั้ง");
      }

      const parsedData = await response.json();
      if (parsedData.error) {
        throw new Error(parsedData.error);
      }

      setProposedTransaction({
        amount: parsedData.amount,
        type: parsedData.type,
        category: parsedData.category,
        description: parsedData.description
      });
    } catch (err: any) {
      setAiError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ AI");
    } finally {
      setAiLoading(false);
    }
  };

  // Confirm and Save AI Proposed Transaction
  const handleConfirmAIProposal = async () => {
    if (!proposedTransaction) return;

    try {
      await addDoc(collection(db, "transactions"), {
        ...proposedTransaction,
        date, // Use selected date in form
        createdAt: new Date().toISOString()
      });

      // Clear AI States
      setAiInput("");
      setProposedTransaction(null);
    } catch (err: any) {
      setAiError("บันทึกจาก AI ล้มเหลว: " + err.message);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm("คุณต้องการลบรายการจดบันทึกนี้ใช่หรือไม่?")) {
      try {
        await deleteDoc(doc(db, "transactions", id));
      } catch (err) {
        console.error("Failed to delete transaction:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans antialiased" id="main-app">
      {/* Premium Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-850 text-white shadow-md border-b border-slate-800 py-6 mb-8" id="header">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-emerald-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-500/20">
              <Wallet className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight font-sans">
                Daily Save AI
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                บันทึกบัญชีรายรับ-รายจ่ายอัจฉริยะ พร้อมวิเคราะห์ยอดทางการเงินส่งตรงถึง LINE
              </p>
            </div>
          </div>
          
          {/* Month Selector Navigation */}
          <div className="flex items-center gap-3 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/50" id="month-picker">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-3 text-center min-w-[120px]">
              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                เดือนสรุปยอด
              </span>
              <span className="text-sm font-bold text-white font-sans">
                {selectedMonthLabel}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4" id="main-content">
        
        {/* Statistics & SVG charts Bento area */}
        <div className="mb-8" id="stats-section">
          <DashboardCharts transactions={transactions} selectedMonth={selectedMonth} />
        </div>

        {/* Action Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="action-grid">
          
          {/* Left Columns - Inputs and Lists */}
          <div className="lg:col-span-5 space-y-8" id="left-column">
            
            {/* AI Smart Record Box */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden" id="ai-smart-card">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full blur-2xl opacity-75 -z-10" />
              
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">จดบันทึกอัจฉริยะด้วย AI 🪄</h3>
                  <p className="text-[11px] text-slate-400">พิมพ์ภาษาไทยทั่วไป แล้วให้ AI แยกหมวดหมู่และราคาอัตโนมัติ</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <textarea
                    rows={2}
                    placeholder="ตัวอย่าง: ได้เงินค่าขนม 500 บาท หรือ ซื้อกะเพราไข่ดาวกลางวันไป 60 บาท"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-150 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all leading-relaxed"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 leading-none">
                    <Info className="w-3.5 h-3.5" /> แนะนำระบุจำนวนเงินเสมอ
                  </span>
                  <button
                    onClick={handleAIParsing}
                    disabled={aiLoading || !aiInput.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {aiLoading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> วิเคราะห์รายรับ/จ่าย
                      </>
                    )}
                  </button>
                </div>

                {/* AI Parsing Errors */}
                {aiError && (
                  <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-xl border border-rose-100">
                    {aiError}
                  </div>
                )}

                {/* Proposed AI Transaction Confirmation Box */}
                <AnimatePresence>
                  {proposedTransaction && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-3 mt-2"
                    >
                      <p className="text-xs font-bold text-purple-800 flex items-center gap-1">
                        ✨ ผลลัพธ์วิเคราะห์จาก AI (กรุณาตรวจสอบเพื่อยืนยัน)
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-purple-50">
                          <span className="block text-[10px] text-slate-400 font-bold">ชื่อรายการ</span>
                          <span className="font-semibold text-slate-700">{proposedTransaction.description}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-purple-50">
                          <span className="block text-[10px] text-slate-400 font-bold">จำนวนเงิน</span>
                          <span className="font-bold text-slate-800">{proposedTransaction.amount.toLocaleString()} ฿</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-purple-50">
                          <span className="block text-[10px] text-slate-400 font-bold">ประเภท</span>
                          <span className={`font-bold ${proposedTransaction.type === "income" ? "text-emerald-600" : "text-rose-500"}`}>
                            {proposedTransaction.type === "income" ? "🟢 รายรับ" : "🔴 รายจ่าย"}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-purple-50">
                          <span className="block text-[10px] text-slate-400 font-bold">หมวดหมู่</span>
                          <span className="font-semibold text-slate-700">
                            {proposedTransaction.type === "income"
                              ? CATEGORIES.income.find((c) => c.id === proposedTransaction.category)?.label || proposedTransaction.category
                              : CATEGORIES.expense.find((c) => c.id === proposedTransaction.category)?.label || proposedTransaction.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setProposedTransaction(null)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                        <button
                          onClick={handleConfirmAIProposal}
                          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                        >
                          ยืนยัน &amp; บันทึก ✅
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Manual Form Box */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm" id="manual-form-card">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                📝 จดบันทึกด้วยตนเอง
              </h3>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                {/* Income / Expense Toggle buttons */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setType("expense");
                      setCategory(CATEGORIES.expense[0].id);
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      type === "expense"
                        ? "bg-white text-rose-500 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    🔴 รายจ่าย
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType("income");
                      setCategory(CATEGORIES.income[0].id);
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      type === "income"
                        ? "bg-white text-emerald-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    🟢 รายรับ
                  </button>
                </div>

                {/* Date Picker & Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่ทำรายการ</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-150 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">จำนวนเงิน (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-150 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Category Dropdown Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">หมวดหมู่รายการ</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-150 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all cursor-pointer"
                  >
                    {type === "income"
                      ? CATEGORIES.income.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))
                      : CATEGORIES.expense.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                  </select>
                </div>

                {/* Description input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อรายการหรือคำอธิบาย</label>
                  <input
                    type="text"
                    placeholder="เช่น: ข้าวกลางวัน, เงินเดือน, ช้อปปิ้งของใช้เข้าบ้าน"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-150 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-rose-500 font-semibold">{formError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> บันทึกรายการใหม่
                </button>
              </form>
            </div>

          </div>

          {/* Right Columns - Tables and Settings */}
          <div className="lg:col-span-7 space-y-8" id="right-column">
            
            {/* LINE Configuration Panel */}
            <LineIntegration selectedMonth={selectedMonth} />

            {/* Recent Logged Transactions List Table */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm" id="transactions-list-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">รายการเคลื่อนไหวของเดือนนี้</h3>
                  <p className="text-[11px] text-slate-400">ประวัติบันทึกรายรับรายจ่ายในเดือน {selectedMonthLabel}</p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                  ทั้งหมด {monthlyTransactions.length} รายการ
                </span>
              </div>

              {/* Transactions List Table */}
              <div className="overflow-x-auto">
                {monthlyTransactions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                    <Calendar className="w-8 h-8 stroke-1 mt-1 mb-2 mx-auto text-slate-300" />
                    <p className="text-xs">ยังไม่มีรายการบันทึกสำหรับเดือนนี้</p>
                    <p className="text-[10px] mt-1 text-slate-400">กรุณาเพิ่มรายการด้วยวิธีพิมพ์หรือป้อนด้วยตัวเองทางซ้าย</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                    {monthlyTransactions.map((t) => {
                      // Lookup details
                      const categoryObj =
                        t.type === "income"
                          ? CATEGORIES.income.find((c) => c.id === t.category)
                          : CATEGORIES.expense.find((c) => c.id === t.category);

                      const formattedDate = new Date(t.date).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit"
                      });

                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between py-3 hover:bg-slate-50/50 px-1 rounded-xl transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            {/* Colorful badge indicator */}
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                              style={{ backgroundColor: categoryObj?.color || "#6B7280" }}
                            >
                              <CategoryIcon name={categoryObj?.icon || "Receipt"} className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{t.description}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {formattedDate}
                                </span>
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-full font-medium">
                                  {categoryObj?.label || t.category}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs font-black font-mono ${
                                t.type === "income" ? "text-emerald-600" : "text-rose-500"
                              }`}
                            >
                              {t.type === "income" ? "+" : "-"}
                              {Number(t.amount).toLocaleString()} ฿
                            </span>

                            {/* Delete Action button */}
                            <button
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="ลบรายการ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
