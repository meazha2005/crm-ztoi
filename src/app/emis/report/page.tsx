import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileSpreadsheet, ArrowLeft, Filter, Search } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import { CsvExportButton } from '@/components/CsvExportButton';

export default async function EmiReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') redirect('/dashboard');

  const resolved = await searchParams;
  const projectId = resolved.project_id ? parseInt(resolved.project_id, 10) : 0;
  const status = resolved.status || '';
  const startDate = resolved.start_date || '';
  const endDate = resolved.end_date || '';

  // Projects dropdown
  const allProjects = await query<any>(
    'SELECT id, project_code, title FROM ztoi_mgmnt_system_projects ORDER BY title ASC'
  );

  // Build filter query
  const where: string[] = ['1=1'];
  const params: any[] = [];

  if (projectId > 0) {
    where.push('e.project_id = ?');
    params.push(projectId);
  }
  if (status && status !== 'all') {
    where.push('e.status = ?');
    params.push(status);
  }
  if (startDate && endDate) {
    where.push('e.due_date BETWEEN ? AND ?');
    params.push(startDate, endDate);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const emis = await query<any>(
    `SELECT e.*, p.title as project_title, p.project_code, p.client_name 
     FROM ztoi_mgmnt_system_emis e 
     LEFT JOIN ztoi_mgmnt_system_projects p ON e.project_id = p.id 
     ${whereSql} 
     ORDER BY p.id DESC, e.due_date ASC`,
    params
  );

  // Summary Metrics
  const summary = await queryOne<any>(`
    SELECT 
      COUNT(*) as total_emis,
      COALESCE(SUM(e.amount), 0) as total_amount,
      COALESCE(SUM(e.paid_amount), 0) as total_paid,
      COALESCE(SUM(CASE WHEN e.status = 'paid' THEN 1 ELSE 0 END), 0) as paid_count,
      COALESCE(SUM(CASE WHEN e.status = 'partial' THEN 1 ELSE 0 END), 0) as partial_count,
      COALESCE(SUM(CASE WHEN e.status = 'unpaid' THEN 1 ELSE 0 END), 0) as unpaid_count
    FROM ztoi_mgmnt_system_emis e
    LEFT JOIN ztoi_mgmnt_system_projects p ON e.project_id = p.id
    ${whereSql}
  `, params);

  const totalAmount = Number(summary?.total_amount || 0);
  const totalPaid = Number(summary?.total_paid || 0);
  const pendingAmount = Math.max(0, totalAmount - totalPaid);

  // CSV Data Prep
  const csvHeaders = [
    'Project Code',
    'Project Title',
    'Client',
    'EMI #',
    'Due Date',
    'Amount (INR)',
    'Paid Amount (INR)',
    'Status',
    'Paid Date',
  ];
  const csvRows = emis.map((e) => [
    e.project_code,
    e.project_title,
    e.client_name,
    e.emi_number === 0 ? 'Down Payment' : e.emi_number,
    e.due_date,
    e.amount,
    e.paid_amount,
    e.status,
    e.paid_date || '-',
  ]);

  return (
    <AppShell user={user} title="EMI Report">
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/emis"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
                EMI Collection Report
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Comprehensive audit of client installments, payments, and balances
              </p>
            </div>
          </div>

          <CsvExportButton
            filename={`EMI_Report_${new Date().toISOString().split('T')[0]}`}
            headers={csvHeaders}
            rows={csvRows}
          />
        </div>

        {/* Top Summary Stat Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total EMIs"
            value={summary?.total_emis || 0}
            subValue={`${summary?.paid_count || 0} Paid • ${summary?.partial_count || 0} Partial`}
          />
          <StatCard
            label="Contracted Total"
            value={formatCurrency(totalAmount)}
            variant="default"
          />
          <StatCard
            label="Total Collected"
            value={formatCurrency(totalPaid)}
            variant="success"
          />
          <StatCard
            label="Total Pending"
            value={formatCurrency(pendingAmount)}
            variant="danger"
          />
        </div>

        {/* Filters */}
        <form
          method="GET"
          className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-2.5 text-xs"
        >
          <select
            name="project_id"
            defaultValue={projectId || ''}
            className="px-2.5 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          >
            <option value="">All Projects</option>
            {allProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_code} - {p.title}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={status || 'all'}
            className="px-2.5 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          >
            <option value="all">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>

          <div className="flex items-center gap-1.5 text-gray-400">
            <span>Due Between:</span>
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

          {(projectId > 0 || status || startDate || endDate) && (
            <Link
              href="/emis/report"
              className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset
            </Link>
          )}
        </form>

        {/* Results Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Project & Client</th>
                  <th className="py-2.5 px-4">Installment</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Collected</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {emis.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      No records matched the filter criteria.
                    </td>
                  </tr>
                ) : (
                  emis.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-4 font-michroma font-bold text-[#FF4D00]">
                        {item.project_code}
                      </td>
                      <td className="py-2.5 px-4 max-w-[200px]">
                        <span className="font-semibold text-gray-900 block truncate">
                          {item.project_title}
                        </span>
                        <span className="text-[11px] text-gray-500 block truncate">
                          {item.client_name}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-gray-800">
                        {item.emi_number === 0 ? 'Down Payment' : `EMI #${item.emi_number}`}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600">
                        {formatDate(item.due_date)}
                      </td>
                      <td className="py-2.5 px-4 font-michroma font-bold text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-2.5 px-4 font-michroma font-semibold text-emerald-600">
                        {formatCurrency(item.paid_amount)}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge status={item.status} type="payment" />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Link
                          href={`/emis/${item.id}`}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-medium"
                        >
                          View
                        </Link>
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
