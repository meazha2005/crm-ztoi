import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  PieChart,
  BarChart3,
  Percent,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { IncomeExpenseBarChart, DonutChart } from '@/components/Charts';
import { CsvExportButton } from '@/components/CsvExportButton';

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') redirect('/dashboard');

  const resolved = await searchParams;
  const currentYear = new Date().getFullYear();
  const defaultStartDate = `${currentYear}-01-01`;
  const defaultEndDate = new Date().toISOString().split('T')[0];

  const startDate = resolved.start_date || defaultStartDate;
  const endDate = resolved.end_date || defaultEndDate;

  // 1. Income Total
  const incomeRow = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM ztoi_mgmnt_system_ledger 
     WHERE type = 'income' AND status = 'active' AND transaction_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );
  const totalIncome = Number(incomeRow?.total || 0);

  // 2. Expense Total
  const expenseRow = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM ztoi_mgmnt_system_ledger 
     WHERE type = 'expense' AND status = 'active' AND transaction_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );
  const totalExpense = Number(expenseRow?.total || 0);

  // 3. Net & Margin
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0';

  // 4. Expense Breakdown by Category
  const expenseBreakdown = await query<{ category: string; amount: number; count: number }>(
    `SELECT 
      COALESCE(category, 'Uncategorized') as category,
      COALESCE(SUM(amount), 0) as amount,
      COUNT(*) as count
     FROM ztoi_mgmnt_system_ledger
     WHERE type = 'expense' AND status = 'active' AND transaction_date BETWEEN ? AND ?
     GROUP BY category
     ORDER BY amount DESC`,
    [startDate, endDate]
  );

  // 5. Income Breakdown by Category
  const incomeBreakdown = await query<{ category: string; amount: number; count: number }>(
    `SELECT 
      COALESCE(category, 'Direct Revenue') as category,
      COALESCE(SUM(amount), 0) as amount,
      COUNT(*) as count
     FROM ztoi_mgmnt_system_ledger
     WHERE type = 'income' AND status = 'active' AND transaction_date BETWEEN ? AND ?
     GROUP BY category
     ORDER BY amount DESC`,
    [startDate, endDate]
  );

  // 6. Monthly Trend (last 6 months in chronological order)
  const monthlyRows = await query<{ ym: string; income: number; expense: number }>(
    `SELECT 
      DATE_FORMAT(transaction_date, '%Y-%m') as ym,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
     FROM ztoi_mgmnt_system_ledger
     WHERE status = 'active'
     GROUP BY ym
     ORDER BY ym DESC
     LIMIT 6`
  );
  const chronologicalMonths = [...monthlyRows].reverse();

  const chartData = chronologicalMonths.map((m) => {
    const [y, mon] = m.ym.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      label: `${monthNames[parseInt(mon, 10) - 1]} '${y.slice(-2)}`,
      income: Number(m.income || 0),
      expense: Number(m.expense || 0),
    };
  });

  // Donut chart colors
  const donutColors = ['#FF4D00', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#6B7280'];
  const donutData = expenseBreakdown.slice(0, 5).map((e, idx) => ({
    label: e.category,
    value: Number(e.amount),
    color: donutColors[idx % donutColors.length],
  }));

  // CSV Data format
  const csvData = [
    { Section: 'Summary', Metric: 'Gross Inflow (Revenue)', Amount: totalIncome },
    { Section: 'Summary', Metric: 'Total Outflows (Expenses)', Amount: totalExpense },
    { Section: 'Summary', Metric: 'Net Operating Profit', Amount: netProfit },
    { Section: 'Summary', Metric: 'Net Profit Margin (%)', Amount: `${profitMargin}%` },
    ...expenseBreakdown.map((e) => ({
      Section: 'Expense Breakdown',
      Metric: e.category,
      Amount: e.amount,
    })),
    ...incomeBreakdown.map((i) => ({
      Section: 'Income Breakdown',
      Metric: i.category,
      Amount: i.amount,
    })),
  ];

  return (
    <AppShell user={user} title="Profit & Loss Statement">
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#FF4D00]" />
              <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
                Profit & Loss Analytics
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Comprehensive financial performance, operating margins, and expenditure distribution
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CsvExportButton
              data={csvData}
              filename={`ztoi-profit-loss-${startDate}-to-${endDate}.csv`}
              label="Export P&L Statement"
            />
          </div>
        </div>

        {/* Date Filter Bar */}
        <form
          method="GET"
          className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-2.5 text-xs"
        >
          <div className="flex items-center gap-1.5 text-gray-600 font-medium">
            <Filter className="w-3.5 h-3.5 text-[#FF4D00]" />
            <span>Reporting Period:</span>
          </div>

          <input
            type="date"
            name="start_date"
            defaultValue={startDate}
            className="px-2 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            name="end_date"
            defaultValue={endDate}
            className="px-2 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          />

          <button
            type="submit"
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors"
          >
            Apply Range
          </button>

          <Link
            href={`/reports/profit-loss?start_date=${currentYear}-01-01&end_date=${defaultEndDate}`}
            className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            This Year
          </Link>
          <Link
            href={`/reports/profit-loss?start_date=${new Date().toISOString().slice(0, 7)}-01&end_date=${defaultEndDate}`}
            className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            This Month
          </Link>
        </form>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Inflow (Revenue)"
            value={formatCurrency(totalIncome)}
            variant="success"
            subValue={`${formatDate(startDate)} to ${formatDate(endDate)}`}
          />
          <StatCard
            label="Total Outflow (Expenses)"
            value={formatCurrency(totalExpense)}
            variant="danger"
            subValue="Overhead & operations"
          />
          <StatCard
            label="Net Operating Profit"
            value={formatCurrency(netProfit)}
            variant={netProfit >= 0 ? 'accent' : 'danger'}
            subValue={netProfit >= 0 ? 'Net positive earnings' : 'Net operating deficit'}
          />
          <StatCard
            label="Profit Margin"
            value={`${profitMargin}%`}
            variant={parseFloat(profitMargin) >= 20 ? 'success' : parseFloat(profitMargin) > 0 ? 'accent' : 'danger'}
            subValue="Operating efficiency ratio"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly Trend Bar Chart */}
          <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-michroma text-sm font-semibold text-gray-900 tracking-wide">
                  6-Month Inflow vs Outflow
                </h3>
                <p className="text-[11px] text-gray-500">Chronological financial velocity</p>
              </div>
            </div>
            <IncomeExpenseBarChart data={chartData} />
          </div>

          {/* Expense Distribution Donut */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-michroma text-sm font-semibold text-gray-900 tracking-wide mb-1">
                Top Expense Channels
              </h3>
              <p className="text-[11px] text-gray-500 mb-3">Cost center percentage distribution</p>
              <DonutChart data={donutData} totalLabel="Expenses" />
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-xs">
              {expenseBreakdown.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-600 truncate">{item.category}</span>
                  <span className="font-mono font-semibold text-gray-800">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Financial Breakdown Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Expense Categories Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-michroma text-xs font-semibold text-gray-900 tracking-wide">
                Operating Outflows by Category
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-wider bg-gray-50/30">
                    <th className="py-2.5 px-4">Expense Category</th>
                    <th className="py-2.5 px-4 text-center">Entries</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-right">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenseBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-400 text-xs">
                        No recorded expenses in this period
                      </td>
                    </tr>
                  ) : (
                    expenseBreakdown.map((row, idx) => {
                      const pct = totalExpense > 0 ? ((row.amount / totalExpense) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2 px-4 font-medium text-gray-900">{row.category}</td>
                          <td className="py-2 px-4 text-center text-gray-500">{row.count}</td>
                          <td className="py-2 px-4 text-right font-mono font-medium text-gray-900">
                            {formatCurrency(row.amount)}
                          </td>
                          <td className="py-2 px-4 text-right">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-50 text-rose-700">
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue Categories Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-michroma text-xs font-semibold text-gray-900 tracking-wide">
                Revenue Inflows by Stream
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-wider bg-gray-50/30">
                    <th className="py-2.5 px-4">Revenue Stream</th>
                    <th className="py-2.5 px-4 text-center">Receipts</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-right">% of Inflows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {incomeBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-400 text-xs">
                        No recorded inflows in this period
                      </td>
                    </tr>
                  ) : (
                    incomeBreakdown.map((row, idx) => {
                      const pct = totalIncome > 0 ? ((row.amount / totalIncome) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2 px-4 font-medium text-gray-900">{row.category}</td>
                          <td className="py-2 px-4 text-center text-gray-500">{row.count}</td>
                          <td className="py-2 px-4 text-right font-mono font-medium text-gray-900">
                            {formatCurrency(row.amount)}
                          </td>
                          <td className="py-2 px-4 text-right">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700">
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
