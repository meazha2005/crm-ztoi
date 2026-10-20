import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PieChart, ArrowLeft, Download, Filter } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { ExpenseDonutChart } from '@/components/Charts';
import { CsvExportButton } from '@/components/CsvExportButton';

export default async function ExpenseReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') redirect('/dashboard');

  const resolved = await searchParams;
  const categoryId = resolved.category ? parseInt(resolved.category, 10) : 0;
  const startDate = resolved.start_date || '';
  const endDate = resolved.end_date || '';

  // Categories
  const categories = await query<any>(
    'SELECT id, name FROM ztoi_mgmnt_system_expense_categories ORDER BY name ASC'
  );

  // Filters
  const where: string[] = ["e.status = 'active'"];
  const params: any[] = [];

  if (categoryId > 0) {
    where.push('e.category_id = ?');
    params.push(categoryId);
  }
  if (startDate && endDate) {
    where.push('e.expense_date BETWEEN ? AND ?');
    params.push(startDate, endDate);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  // Detailed Expense List
  const expenses = await query<any>(
    `SELECT e.*, c.name as category_name, u.full_name as created_by_name 
     FROM ztoi_mgmnt_system_expenses e 
     LEFT JOIN ztoi_mgmnt_system_expense_categories c ON e.category_id = c.id 
     LEFT JOIN ztoi_mgmnt_system_users u ON e.created_by = u.id 
     ${whereSql} 
     ORDER BY e.expense_date DESC`,
    params
  );

  // Aggregation by Category
  const categoryStats = await query<any>(
    `SELECT 
      c.name as category_name,
      c.color,
      COUNT(e.id) as count,
      COALESCE(SUM(e.amount), 0) as total
     FROM ztoi_mgmnt_system_expenses e 
     LEFT JOIN ztoi_mgmnt_system_expense_categories c ON e.category_id = c.id 
     ${whereSql} 
     GROUP BY c.id, c.name, c.color
     ORDER BY total DESC`,
    params
  );

  const totalExpense = categoryStats.reduce(
    (acc, curr) => acc + Number(curr.total || 0),
    0
  );

  // Donut chart data prep
  const donutData = categoryStats.map((c) => ({
    label: c.category_name,
    value: Number(c.total || 0),
    color: c.color,
  }));

  // CSV Data Prep
  const csvHeaders = ['Date', 'Category', 'Description', 'Amount (INR)', 'Payment Mode', 'Created By'];
  const csvRows = expenses.map((e) => [
    e.expense_date,
    e.category_name,
    e.description,
    e.amount,
    e.payment_method || 'N/A',
    e.created_by_name || 'System',
  ]);

  return (
    <AppShell user={user} title="Expense Report">
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/expenses"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
                Expense Distribution & Analytics
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Breakdown of agency expenditure across operational categories
              </p>
            </div>
          </div>

          <CsvExportButton
            filename={`Expense_Report_${new Date().toISOString().split('T')[0]}`}
            headers={csvHeaders}
            rows={csvRows}
          />
        </div>

        {/* Top Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Total Overhead"
            value={formatCurrency(totalExpense)}
            variant="danger"
          />
          <StatCard
            label="Total Expense Vouchers"
            value={expenses.length}
          />
          <StatCard
            label="Active Categories"
            value={categoryStats.length}
          />
        </div>

        {/* 2-Column: Category Breakdown Table & Visual Donut Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Donut Chart Card */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <h3 className="font-michroma text-xs sm:text-sm font-bold text-gray-900 tracking-wide mb-2">
              Expense Distribution
            </h3>
            <ExpenseDonutChart data={donutData} />
          </div>

          {/* Category Table Card */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-michroma text-xs sm:text-sm font-bold text-gray-900 tracking-wide mb-3">
                Category Summary
              </h3>
              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] text-gray-400 font-bold uppercase">
                      <th className="py-2">Category</th>
                      <th className="py-2 text-right">Count</th>
                      <th className="py-2 text-right">Total</th>
                      <th className="py-2 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categoryStats.map((stat, idx) => {
                      const pct = totalExpense > 0 ? ((stat.total / totalExpense) * 100).toFixed(1) : 0;
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-2 font-medium text-gray-900 flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: stat.color || '#FF4D00' }}
                            />
                            <span>{stat.category_name}</span>
                          </td>
                          <td className="py-2 text-right text-gray-500">{stat.count}</td>
                          <td className="py-2 text-right font-michroma font-bold text-gray-900">
                            {formatCurrency(stat.total)}
                          </td>
                          <td className="py-2 text-right text-gray-700 font-semibold">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 text-right font-michroma font-bold text-xs text-gray-900">
              Total: {formatCurrency(totalExpense)}
            </div>
          </div>
        </div>

        {/* Detailed Filter & Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <form method="GET" className="flex flex-wrap items-center gap-2">
              <select
                name="category"
                defaultValue={categoryId || ''}
                className="px-2.5 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 text-gray-400">
                <input
                  type="date"
                  name="start_date"
                  defaultValue={startDate}
                  className="px-2 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                />
                <span>to</span>
                <input
                  type="date"
                  name="end_date"
                  defaultValue={endDate}
                  className="px-2 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                />
              </div>

              <button
                type="submit"
                className="px-3 py-1.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors"
              >
                Filter
              </button>

              {(categoryId > 0 || startDate || endDate) && (
                <Link
                  href="/expenses/report"
                  className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Reset
                </Link>
              )}
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Payment Mode</th>
                  <th className="py-2.5 px-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No records matched the selected date or category filters.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-4 text-gray-700 font-medium">
                        {formatDate(exp.expense_date)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-gray-800">
                        {exp.category_name}
                      </td>
                      <td className="py-2.5 px-4 text-gray-900 max-w-[240px] truncate">
                        {exp.description}
                      </td>
                      <td className="py-2.5 px-4 font-michroma font-bold text-rose-600">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="py-2.5 px-4 uppercase text-[10px] font-semibold text-gray-600">
                        {exp.payment_method || 'N/A'}
                      </td>
                      <td className="py-2.5 px-4 text-gray-500">
                        {exp.created_by_name || 'System'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
