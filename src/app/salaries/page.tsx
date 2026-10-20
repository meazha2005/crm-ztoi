import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users2, Search, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { CsvExportButton } from '@/components/CsvExportButton';
import { SalaryClient } from '@/components/SalaryClient';

export default async function SalariesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') redirect('/dashboard');

  const resolved = await searchParams;
  const filterMonth = resolved.month || '';
  const filterStatus = resolved.status || '';
  const filterUserId = resolved.user_id ? parseInt(resolved.user_id, 10) : 0;

  // Active users for selector
  const activeUsers = await query<{ id: number; full_name: string; email: string }>(
    'SELECT id, full_name, email FROM ztoi_mgmnt_system_users WHERE status = "active" ORDER BY full_name ASC'
  );

  // Distinct months in salary records
  const distinctMonths = await query<{ month_year: string }>(
    'SELECT DISTINCT month_year FROM ztoi_mgmnt_system_salaries ORDER BY month_year DESC'
  );

  // Filter Query
  const where: string[] = ['1=1'];
  const params: any[] = [];

  if (filterMonth) {
    where.push('s.month_year = ?');
    params.push(filterMonth);
  }
  if (filterStatus && (filterStatus === 'pending' || filterStatus === 'paid')) {
    where.push('s.status = ?');
    params.push(filterStatus);
  }
  if (filterUserId > 0) {
    where.push('s.user_id = ?');
    params.push(filterUserId);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const salaries = await query<any>(
    `SELECT s.*, u.full_name as user_name, u.email as user_email, u.phone as user_phone
     FROM ztoi_mgmnt_system_salaries s
     JOIN ztoi_mgmnt_system_users u ON s.user_id = u.id
     ${whereSql}
     ORDER BY s.month_year DESC, s.id DESC`,
    params
  );

  // Totals
  const totals = await queryOne<{
    total_net: number;
    paid_net: number;
    pending_net: number;
  }>(
    `SELECT 
      COALESCE(SUM(s.net_salary), 0) as total_net,
      COALESCE(SUM(CASE WHEN s.status = 'paid' THEN s.net_salary ELSE 0 END), 0) as paid_net,
      COALESCE(SUM(CASE WHEN s.status = 'pending' THEN s.net_salary ELSE 0 END), 0) as pending_net
     FROM ztoi_mgmnt_system_salaries s
     ${whereSql}`,
    params
  );

  const totalNet = Number(totals?.total_net || 0);
  const paidNet = Number(totals?.paid_net || 0);
  const pendingNet = Number(totals?.pending_net || 0);

  // CSV Data format
  const csvData = salaries.map((s) => ({
    ID: s.id,
    Employee: s.user_name,
    Email: s.user_email,
    Month: s.month_year,
    'Base Salary': s.base_salary,
    Bonus: s.bonus,
    Deductions: s.deductions,
    'Net Payable': s.net_salary,
    Status: s.status.toUpperCase(),
    'Paid Date': s.paid_date ? formatDate(s.paid_date) : 'N/A',
    'Payment Mode': s.payment_mode || 'N/A',
    Notes: s.notes || '',
  }));

  return (
    <AppShell user={user} title="Payroll & Salaries">
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <Users2 className="w-5 h-5 text-[#FF4D00]" />
              <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
                Staff Payroll & Salaries
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage monthly employee compensations, bonuses, deductions, and disbursement records
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CsvExportButton
              data={csvData}
              filename={`ztoi-payroll-${filterMonth || 'all'}-${new Date().toISOString().split('T')[0]}.csv`}
              label="Export Payroll CSV"
            />
          </div>
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Total Payroll"
            value={formatCurrency(totalNet)}
            variant="default"
            subValue="Computed net compensation"
          />
          <StatCard
            label="Disbursed (Paid)"
            value={formatCurrency(paidNet)}
            variant="success"
            subValue="Debited in General Ledger"
          />
          <StatCard
            label="Pending Disbursement"
            value={formatCurrency(pendingNet)}
            variant={pendingNet > 0 ? 'warning' : 'default'}
            subValue="Awaiting release"
          />
        </div>

        {/* Filter Bar */}
        <form
          method="GET"
          className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-2.5 text-xs"
        >
          <select
            name="month"
            defaultValue={filterMonth}
            className="px-2.5 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          >
            <option value="">All Months</option>
            {distinctMonths.map((m) => (
              <option key={m.month_year} value={m.month_year}>
                {m.month_year}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={filterStatus}
            className="px-2.5 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>

          <select
            name="user_id"
            defaultValue={filterUserId || ''}
            className="px-2.5 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          >
            <option value="">All Employees</option>
            {activeUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors"
          >
            Filter
          </button>

          {(filterMonth || filterStatus || filterUserId > 0) && (
            <Link
              href="/salaries"
              className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset
            </Link>
          )}
        </form>

        {/* Salary Client Component with Modals */}
        <SalaryClient salaries={salaries} activeUsers={activeUsers} />
      </div>
    </AppShell>
  );
}
