import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { History, Shield, Filter } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { CsvExportButton } from '@/components/CsvExportButton';
import { AuditLogsClient } from '@/components/AuditLogsClient';

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') redirect('/dashboard');

  const resolved = await searchParams;
  const filterAction = resolved.action || '';
  const filterUserId = resolved.user_id ? parseInt(resolved.user_id, 10) : 0;
  const startDate = resolved.start_date || '';
  const endDate = resolved.end_date || '';

  // Active users for filter
  const activeUsers = await query<{ id: number; full_name: string }>(
    'SELECT id, full_name FROM ztoi_mgmnt_system_users ORDER BY full_name ASC'
  );

  // Distinct actions
  const distinctActions = await query<{ action: string }>(
    'SELECT DISTINCT action FROM ztoi_mgmnt_system_audit_logs ORDER BY action ASC'
  );

  // Build query
  const where: string[] = ['1=1'];
  const params: any[] = [];

  if (filterAction) {
    where.push('a.action = ?');
    params.push(filterAction);
  }
  if (filterUserId > 0) {
    where.push('a.user_id = ?');
    params.push(filterUserId);
  }
  if (startDate && endDate) {
    where.push('a.created_at BETWEEN ? AND ?');
    params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const logs = await query<any>(
    `SELECT a.*, u.full_name as user_name, u.role as user_role
     FROM ztoi_mgmnt_system_audit_logs a
     LEFT JOIN ztoi_mgmnt_system_users u ON a.user_id = u.id
     ${whereSql}
     ORDER BY a.id DESC
     LIMIT 150`,
    params
  );

  const csvData = logs.map((l) => ({
    'Log ID': l.id,
    Timestamp: formatDate(l.created_at),
    Actor: l.user_name || 'System Automation',
    Role: l.user_role || 'System',
    Action: l.action,
    'Target Table': l.table_name,
    'Record ID': l.record_id || 'N/A',
    'IP Address': l.ip_address || 'N/A',
  }));

  return (
    <AppShell user={user} title="System Audit Logs">
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#FF4D00]" />
              <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
                Security & System Audit Trail
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Immutable chronological record of administrative changes, ledger mutations, and access logs
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CsvExportButton
              data={csvData}
              filename={`ztoi-audit-logs-${new Date().toISOString().split('T')[0]}.csv`}
              label="Export Audit Trail"
            />
          </div>
        </div>

        {/* Filter Controls */}
        <form
          method="GET"
          className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-2.5 text-xs"
        >
          <div className="flex items-center gap-1.5 text-gray-500">
            <Filter className="w-3.5 h-3.5 text-[#FF4D00]" />
            <span>Filter By:</span>
          </div>

          <select
            name="action"
            defaultValue={filterAction}
            className="px-2.5 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          >
            <option value="">All Actions</option>
            {distinctActions.map((a) => (
              <option key={a.action} value={a.action}>
                {a.action.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            name="user_id"
            defaultValue={filterUserId || ''}
            className="px-2.5 py-1.5 bg-gray-50/60 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          >
            <option value="">All Users</option>
            {activeUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
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

          {(filterAction || filterUserId > 0 || startDate || endDate) && (
            <Link
              href="/audit-logs"
              className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset
            </Link>
          )}
        </form>

        {/* Audit Log Table Component */}
        <AuditLogsClient logs={logs} />
      </div>
    </AppShell>
  );
}
