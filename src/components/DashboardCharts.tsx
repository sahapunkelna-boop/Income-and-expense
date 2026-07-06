import { useState } from "react";
import { Transaction, CATEGORIES } from "../types";
import CategoryIcon from "./CategoryIcon";
import { motion } from "motion/react";

interface DashboardChartsProps {
  transactions: Transaction[];
  selectedMonth: string; // YYYY-MM
}

export default function DashboardCharts({ transactions, selectedMonth }: DashboardChartsProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Filter transactions for the selected month
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

  // Compute stats
  let totalIncome = 0;
  let totalExpense = 0;
  const categorySpending: Record<string, number> = {};

  // Initialize expense categories in summary to show progress even if 0
  CATEGORIES.expense.forEach(c => {
    categorySpending[c.id] = 0;
  });

  monthlyTransactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === "income") {
      totalIncome += amt;
    } else {
      totalExpense += amt;
      categorySpending[t.category] = (categorySpending[t.category] || 0) + amt;
    }
  });

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, (netBalance / totalIncome) * 100) : 0;

  // Filter out categories with 0 spending for the visual bar chart
  const activeExpenses = Object.entries(categorySpending)
    .map(([catId, amount]) => {
      const catObj = CATEGORIES.expense.find(c => c.id === catId);
      return {
        id: catId,
        label: catObj?.label || catId,
        icon: catObj?.icon || "Receipt",
        color: catObj?.color || "#6B7280",
        amount
      };
    })
    .filter(item => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const maxExpense = activeExpenses.length > 0 ? Math.max(...activeExpenses.map(e => e.amount)) : 100;

  // SVG Chart Calculations
  const chartHeight = 220;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 30;
  const graphWidth = chartWidth - paddingX * 2;
  const graphHeight = chartHeight - paddingY * 2;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="dashboard-charts-container">
      {/* Total Income Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between"
        id="card-income"
      >
        <div>
          <p className="text-slate-400 text-sm font-medium">รายรับรวมเดือนนี้</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1 font-sans">
            +{totalIncome.toLocaleString()} <span className="text-sm font-normal text-slate-500">฿</span>
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            บันทึกแล้ว {monthlyTransactions.filter(t => t.type === "income").length} รายการ
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
          <CategoryIcon name="TrendingUp" className="w-6 h-6" />
        </div>
      </motion.div>

      {/* Total Expense Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between"
        id="card-expense"
      >
        <div>
          <p className="text-slate-400 text-sm font-medium">รายจ่ายรวมเดือนนี้</p>
          <h3 className="text-2xl font-bold text-rose-500 mt-1 font-sans">
            -{totalExpense.toLocaleString()} <span className="text-sm font-normal text-slate-500">฿</span>
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            บันทึกแล้ว {monthlyTransactions.filter(t => t.type === "expense").length} รายการ
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-400">
          <CategoryIcon name="Receipt" className="w-6 h-6" />
        </div>
      </motion.div>

      {/* Net Balance / Savings Rate Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between"
        id="card-savings"
      >
        <div>
          <p className="text-slate-400 text-sm font-medium">คงเหลือ / อัตราการออม</p>
          <h3 className={`text-2xl font-bold mt-1 font-sans ${netBalance >= 0 ? "text-slate-800" : "text-rose-600"}`}>
            {netBalance.toLocaleString()} <span className="text-sm font-normal text-slate-500">฿</span>
          </h3>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs text-slate-500">ออมเงินได้</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
              {savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="relative w-12 h-12 flex items-center justify-center">
          {/* Simple Circular Progress SVG */}
          <svg className="absolute w-full h-full transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              className="stroke-slate-100"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              className="stroke-blue-500 transition-all duration-500"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 20}
              strokeDashoffset={2 * Math.PI * 20 * (1 - savingsRate / 100)}
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[10px] font-bold text-blue-600">{Math.round(savingsRate)}%</span>
        </div>
      </motion.div>

      {/* Bento 4: Beautiful Custom SVG Graph Card */}
      <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between" id="bento-graph-card">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">กราฟฟิกเปรียบเทียบสัดส่วนรายจ่าย</h3>
              <p className="text-xs text-slate-400">เปรียบเทียบตามยอดรวมประเภทหมวดหมู่ค่าใช้จ่ายจริง</p>
            </div>
            {activeExpenses.length > 0 && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                สูงสุด: {maxExpense.toLocaleString()} ฿
              </span>
            )}
          </div>

          {activeExpenses.length === 0 ? (
            <div className="h-[220px] flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
              <CategoryIcon name="AlertCircle" className="w-10 h-10 stroke-1.5 mb-2 text-slate-300" />
              <p className="text-sm">ไม่มีข้อมูลรายจ่ายในเดือนนี้</p>
              <p className="text-xs mt-1">เริ่มต้นบันทึกรายจ่ายเพื่อสร้างกราฟสรุปยอด</p>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="relative w-full max-w-[500px]">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-auto overflow-visible select-none"
                >
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                    const y = paddingY + graphHeight * (1 - ratio);
                    const val = maxExpense * ratio;
                    return (
                      <g key={index} className="opacity-40">
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={chartWidth - paddingX}
                          y2={y}
                          stroke="#E2E8F0"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={paddingX - 8}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-slate-400 text-[10px] font-mono font-medium"
                        >
                          {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : Math.round(val)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Render Bars */}
                  {activeExpenses.map((item, idx) => {
                    const barCount = activeExpenses.length;
                    const spacing = graphWidth / barCount;
                    const barWidth = Math.min(32, spacing * 0.6);
                    const x = paddingX + idx * spacing + (spacing - barWidth) / 2;
                    const valRatio = item.amount / maxExpense;
                    const h = graphHeight * valRatio;
                    const y = paddingY + graphHeight - h;

                    return (
                      <g
                        key={item.id}
                        onMouseEnter={() => setHoveredBar(idx)}
                        onMouseLeave={() => setHoveredBar(null)}
                        className="cursor-pointer"
                      >
                        {/* Bar Body with rounded corners */}
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={Math.max(4, h)}
                          fill={item.color}
                          rx={Math.min(6, barWidth / 2)}
                          ry={Math.min(6, barWidth / 2)}
                          className="transition-all duration-300 hover:brightness-105"
                          opacity={hoveredBar === null || hoveredBar === idx ? 1 : 0.6}
                        />

                        {/* Category Label short */}
                        <text
                          x={x + barWidth / 2}
                          y={chartHeight - paddingY + 16}
                          textAnchor="middle"
                          className="fill-slate-600 text-[9px] font-medium"
                        >
                          {item.label.length > 5 ? `${item.label.substring(0, 4)}..` : item.label}
                        </text>

                        {/* Interactive Tooltip on hover */}
                        {hoveredBar === idx && (
                          <g className="filter drop-shadow-md">
                            <rect
                              x={x + barWidth / 2 - 50}
                              y={y - 32}
                              width="100"
                              height="24"
                              rx="6"
                              fill="#1E293B"
                            />
                            <text
                              x={x + barWidth / 2}
                              y={y - 16}
                              textAnchor="middle"
                              fill="#FFFFFF"
                              className="text-[10px] font-bold"
                            >
                              {item.amount.toLocaleString()} ฿
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* X Axis Line */}
                  <line
                    x1={paddingX}
                    y1={chartHeight - paddingY}
                    x2={chartWidth - paddingX}
                    y2={chartHeight - paddingY}
                    stroke="#CBD5E1"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bento 5: Category Expenditure Detailed List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between" id="bento-category-list">
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-1.5">
            📊 ยอดใช้จ่ายตามหมวดหมู่
          </h3>
          <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
            {activeExpenses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">ยังไม่มีประวัติใช้จ่ายรายเดือน</p>
            ) : (
              activeExpenses.map((item, idx) => {
                const percentage = totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0;
                return (
                  <div key={item.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-700">{item.label}</span>
                      </div>
                      <span className="text-slate-500 font-medium">
                        {item.amount.toLocaleString()} ฿ ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    {/* Linear Progress Bar */}
                    <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.05 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
