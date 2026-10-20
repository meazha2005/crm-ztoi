import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Receipt, Search, FileText } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { ExpenseClient } from '@/components/ExpenseClient';

export default async function ExpensesPage({
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

  // Fetch Categories
  const categories = await query<any>(
    'SELECT id, name FROM ztoi_mgmnt_system_expense_categories WHERE status = "active" ORDER BY name ASC'
  );

  // Filter Query
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

  const expenses = await query<any>(
    `SELECT e.*, c.name as category_name
     FROM ztoi_mgmnt_system_expenses e
     JOIN ztoi_mgmnt_system_expense_categories c ON e.category_id = c.id
     ${whereSql}
     ORDER BY e.expense_date DESC, e.id DESC`,
    params
  );

  // Total Metric
  const totalRow = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM ztoi_mgmnt_system_expenses e ${whereSql}`,
    params
  );
  const totalExpense = Number(totalRow?.total || 0);

  return (
    <AppShell user={user} title="Expenses">
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#FF4D00]" />
              <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
                Company Expenses
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Record vouchers, attached bills, and maintain operational overheads
            </p>
          </div>

          <Link
            href="/expenses/report"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Expense Analytics & Distribution</span>
          </Link>
        </div>

        {/* Top Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatCard
            label="Total Expenses"
            value={formatCurrency(totalExpense)}
            variant="danger"
            subValue={
              startDate && endDate
                ? `${formatDate(startDate)} to ${formatDate(endDate)}`
                : 'All-time active records'
            }
          />
          <StatCard
            label="Total Expense Vouchers"
            value={expenses.length}
            subValue="Linked with General Ledger"
          />
        </div>

        {/* Filter Bar */}
        <form
          method="GET"
          className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-2.5 text-xs"
        >
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
            <span>Date:</span>
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
              href="/expenses"
              className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset
            </Link>
          )}
        </form>

        <ExpenseClient expenses={expenses} categories={categories} />
      </div>
    </AppShell>
  );
}
