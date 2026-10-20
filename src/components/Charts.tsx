import React from 'react';

interface BarChartItem {
  label: string;
  income: number;
  expense: number;
}

export function IncomeExpenseBarChart({ data }: { data: BarChartItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-gray-400">
        No transaction history available
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    1000
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-end gap-4 text-xs mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
          <span className="text-gray-600 font-medium">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#FF4D00] inline-block" />
          <span className="text-gray-600 font-medium">Expense</span>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-48 pt-4 border-b border-gray-100">
        {data.map((item, idx) => {
          const incomeHeight = Math.max(4, Math.round((item.income / maxVal) * 160));
          const expenseHeight = Math.max(4, Math.round((item.expense / maxVal) * 160));

          return (
            <div key={idx} className="flex flex-col items-center h-full justify-end group">
              <div className="flex items-end gap-1 sm:gap-2 w-full justify-center max-w-[48px]">
                {/* Income Bar */}
                <div
                  title={`Income: ₹${item.income.toLocaleString()}`}
                  style={{ height: `${incomeHeight}px` }}
                  className="w-1/2 bg-emerald-500 rounded-t-sm hover:brightness-110 transition-all duration-150"
                />
                {/* Expense Bar */}
                <div
                  title={`Expense: ₹${item.expense.toLocaleString()}`}
                  style={{ height: `${expenseHeight}px` }}
                  className="w-1/2 bg-[#FF4D00] rounded-t-sm hover:brightness-110 transition-all duration-150"
                />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-gray-500 mt-2 truncate max-w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DonutItem {
  label: string;
  value: number;
  color?: string;
}

const DEFAULT_COLORS = [
  '#FF4D00',
  '#111827',
  '#059669',
  '#2563eb',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#4b5563',
];

export function ExpenseDonutChart({
  data,
  totalLabel = 'Total',
}: {
  data: DonutItem[];
  totalLabel?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-gray-400">
        No expense data recorded
      </div>
    );
  }

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  if (total === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-gray-400">
        Zero total expenses
      </div>
    );
  }

  // Calculate SVG stroke dashes
  let cumulativePercent = 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
      <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#f3f4f6"
            strokeWidth="12"
          />
          {data.map((item, idx) => {
            const percent = item.value / total;
            const strokeDasharray = `${percent * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativePercent * circumference;
            cumulativePercent += percent;
            const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

            return (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase font-bold text-gray-400">{totalLabel}</span>
          <span className="text-xs font-michroma font-bold text-gray-900">
            ₹{(total >= 100000 ? `${(total / 100000).toFixed(1)}L` : total.toLocaleString())}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 w-full text-xs">
        {data.slice(0, 6).map((item, idx) => {
          const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
          const pct = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={idx} className="flex items-center justify-between gap-2 py-0.5">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-gray-700 truncate">{item.label}</span>
              </div>
              <span className="font-semibold text-gray-900 shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const DonutChart = ExpenseDonutChart;

