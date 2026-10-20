import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookOpen, Search, ArrowUpRight, ArrowDownRight, Scale } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { CsvExportButton } from '@/components/CsvExportButton';
import { LedgerClient } from '@/components/LedgerClient';

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') redirect('/dashboard');

  const resolved = await searchParams;
  const filterType = resolved.type || '';
  const filterCategory = resolved.category || '';
  const startDate = resolved.start_date || '';
  const endDate = resolved.end_date || '';

  // Active users for "received by" selector
  const activeUsers = await query<{ id: number; full_name: string }>(
    'SELECT id, full_name FROM ztoi_mgmnt_system_users WHERE status = "active" ORDER BY full_name ASC'
  );

  // Distinct categories in ledger
  const distinctCats = await query<{ category: string }>(
    'SELECT DISTINCT category FROM ztoi_mgmnt_system_ledger WHERE status = "active" AND category IS NOT NULL ORDER BY category ASC'
  );

  // Filter Query
  const where: string[] = ["l.status = 'active'"];
  const params: any[] = [];

  if (filterType && (filterType === 'income' || filterType === 'expense')) {
    where.push('l.type = ?');
    params.push(filterType);
  }
  if (filterCategory) {
    where.push('l.category = ?');
    params.push(filterCategory);
  }
  if (startDate && endDate) {
    where.push('l.transaction_date BETWEEN ? AND ?');
    params.push(startDate, endDate);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const entries = await query<any>(
    `SELECT l.*, u.full_name as creator_name
     FROM ztoi_mgmnt_system_ledger l
     LEFT JOIN ztoi_mgmnt_system_users u ON l.created_by = u.id
     ${whereSql}
     ORDER BY l.transaction_date DESC, l.id DESC`,
    params
  );

  // Totals for all active records matching filters
  const totals = await queryOne<{ total_income: number; total_expense: number }>(
    `SELECT 
      COALESCE(SUM(CASE WHEN l.type = 'income' THEN l.amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN l.type = 'expense' THEN l.amount ELSE 0 END), 0) as total_expense
     FROM ztoi_mgmnt_system_ledger l
     ${whereSql}`,
    params
  );

  const totalIncome = Number(totals?.total_income || 0);
  const totalExpense = Number(totals?.total_expense || 0);
  const netBalance = totalIncome - totalExpense;

  // Format data for CSV Export
  const csvData = entries.map((e) => ({
    'Entry ID': e.id,
    Date: formatDate(e.transaction_date),
    Type: e.type.toUpperCase(),
    Category: e.category,
    Amount: e.amount,
    'Payment Method': e.payment_method || 'N/A',
    'Received By / Handler': e.received_by || 'N/A',
    'Ref Type': e.reference_type || 'N/A',
    'Ref ID': e.reference_id || 'N/A',
    Description: e.description,
    'Recorded By': e.creator_name || 'System',
    Created: formatDate(e.created_at),
  }));

  return (
    <AppShell user={user} title="General Ledger">
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#FF4D00]" />
              <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
                General Ledger
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Complete chronological audit of cash inflows, disbursements, and internal transfers
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CsvExportButton
              data={csvData}
              filename={`ztoi-general-ledger-${new Date().toISOString().split('T')[0]}.csv`}
              label="Export Ledger CSV"
            />
          </div>
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Total Inflow (Credits)"
            value={formatCurrency(totalIncome)}
            variant="success"
            subValue="Client EMIs & manual income"
          />
          <StatCard
            label="Total Outflow (Debits)"
            value={formatCurrency(totalExpense)}
            variant="danger"
            subValue="Operating expenses & payroll"
          />
          <StatCard
            label="Net Cash Balance"
            value={formatCurrency(netBalance)}
            variant={netBalance >= 0 ? 'accent' : 'danger'}
            subValue={netBalance >= 0 ? 'Positive Operating Surplus' : 'Net Operating Deficit'}
          />
        </div>

        {/* Filter Bar */}
        <form
          method="GET"
          className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-2.5 text-xs"
        >
          <select
            name="type"
            defaultValue={filterType}
            className="px-2.5 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          >
            <option value="">All Types (Inflow & Outflow)</option>
            <option value="income">Credits (Income)</option>
            <option value="expense">Debits (Expense)</option>
          </select>

          <select
            name="category"
            defaultValue={filterCategory}
            className="px-2.5 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          >
            <option value="">All Categories</option>
            {distinctCats.map((c) => (
              <option key={c.category} value={c.category}>
                {c.category}
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

          {(filterType || filterCategory || startDate || endDate) && (
            <Link
              href="/ledger"
              className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset
            </Link>
          )}
        </form>

        {/* Ledger Client Component with Modals */}
        <LedgerClient
          entries={entries}
          activeUsers={activeUsers}
          currentUserName={user.full_name}
        />
      </div>
    </AppShell>
  );
}
