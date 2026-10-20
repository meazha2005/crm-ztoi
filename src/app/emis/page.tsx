import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CreditCard, Search, Calendar, FileText, Plus } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { EmiListClient } from '@/components/EmiListClient';

export default async function EmisPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  const resolvedParams = await searchParams;
  const search = (resolvedParams.search || '').trim();
  const statusFilter = (resolvedParams.status || '').trim();
  const monthFilter = (resolvedParams.month || '').trim();

  // Summary Metrics
  const summaryRow = await queryOne<{
    total_unpaid: number;
    pending_amount: number;
    partial_paid: number;
  }>(`
    SELECT 
      COUNT(*) as total_unpaid,
      COALESCE(SUM(amount - paid_amount), 0) as pending_amount,
      COALESCE(SUM(paid_amount), 0) as partial_paid
    FROM ztoi_mgmnt_system_emis
    WHERE status != 'paid'
  `);

  // Build filter query
  const whereConditions: string[] = [];
  const params: any[] = [];

  if (search) {
    whereConditions.push('(p.title LIKE ? OR p.client_name LIKE ? OR p.project_code LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (statusFilter && statusFilter !== 'all') {
    whereConditions.push('e.status = ?');
    params.push(statusFilter);
  }

  if (monthFilter) {
    whereConditions.push("DATE_FORMAT(e.due_date, '%Y-%m') = ?");
    params.push(monthFilter);
  }

  const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Fetch all EMIs matching filter with project info
  const emiRows = await query<any>(
    `SELECT e.*, p.project_code, p.title as project_title, p.client_name
     FROM ztoi_mgmnt_system_emis e
     JOIN ztoi_mgmnt_system_projects p ON e.project_id = p.id
     ${whereSql}
     ORDER BY p.id DESC, e.due_date ASC`,
    params
  );

  // Group by Project
  const groupsMap: Record<number, any> = {};
  for (const row of emiRows) {
    if (!groupsMap[row.project_id]) {
      groupsMap[row.project_id] = {
        project_id: row.project_id,
        project_code: row.project_code,
        project_title: row.project_title,
        client_name: row.client_name,
        total_emis: 0,
        total_amount: 0,
        total_paid: 0,
        pending_amount: 0,
        pending_count: 0,
        emis: [],
      };
    }
    const g = groupsMap[row.project_id];
    g.total_emis += 1;
    g.total_amount += Number(row.amount);
    g.total_paid += Number(row.paid_amount);
    const pend = Number(row.amount) - Number(row.paid_amount);
    if (pend > 0.01) {
      g.pending_amount += pend;
      g.pending_count += 1;
    }
    g.emis.push(row);
  }

  const groups = Object.values(groupsMap);

  return (
    <AppShell user={user} title="EMI / Payments">
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#FF4D00]" />
              <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
                EMI & Installment Schedules
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Track project milestones, pending collections, and record installment payments
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/emis/report"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Full EMI Report</span>
            </Link>
          </div>
        </div>

        {/* Top Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Pending Installments"
            value={summaryRow?.total_unpaid || 0}
            variant="warning"
          />
          <StatCard
            label="Total Pending Amount"
            value={formatCurrency(summaryRow?.pending_amount || 0)}
            variant="danger"
          />
          <StatCard
            label="Partially Collected"
            value={formatCurrency(summaryRow?.partial_paid || 0)}
            variant="success"
          />
        </div>

        {/* Filters Form */}
        <form
          method="GET"
          className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by code, title or client..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF4D00] placeholder:text-gray-400"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              name="status"
              defaultValue={statusFilter || 'all'}
              className="px-2.5 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            >
              <option value="all">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>

            <input
              type="month"
              name="month"
              defaultValue={monthFilter}
              className="px-2.5 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />

            <button
              type="submit"
              className="px-3 py-1.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors"
            >
              Filter
            </button>

            {(search || statusFilter || monthFilter) && (
              <Link
                href="/emis"
                className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reset
              </Link>
            )}
          </div>
        </form>

        {/* Accordion Group List */}
        {groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center mx-auto mb-3">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="font-michroma text-sm font-bold text-gray-900 mb-1">
              No Payment Records Found
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
              {search || statusFilter || monthFilter
                ? 'No installments match your selected filter criteria.'
                : 'Projects configured with EMI or one-time payment terms will show their schedules here.'}
            </p>
          </div>
        ) : (
          <EmiListClient groups={groups} />
        )}
      </div>
    </AppShell>
  );
}
