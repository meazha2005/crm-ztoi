import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  FolderKanban,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CreditCard,
  Plus,
  Receipt,
  BookOpen,
} from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import { IncomeExpenseBarChart } from '@/components/Charts';

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const isAdmin = user.role === 'admin';

  // 1. Unread notifications
  const notifRow = await queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM ztoi_mgmnt_system_notifications WHERE user_id = ? AND is_read = 0',
    [user.id]
  );
  const unreadCount = Number(notifRow?.cnt || 0);

  // 2. Project counts
  let projectWhere = '';
  let projectParams: any[] = [];
  if (!isAdmin) {
    projectWhere = 'WHERE id IN (SELECT project_id FROM ztoi_mgmnt_system_project_assignments WHERE user_id = ?)';
    projectParams = [user.id];
  }

  const totalProjRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM ztoi_mgmnt_system_projects ${projectWhere}`,
    projectParams
  );
  const activeProjRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM ztoi_mgmnt_system_projects ${projectWhere ? projectWhere + ' AND' : 'WHERE'} status IN ('new', 'in_progress')`,
    projectParams
  );
  const completedProjRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM ztoi_mgmnt_system_projects ${projectWhere ? projectWhere + ' AND' : 'WHERE'} status = 'completed'`,
    projectParams
  );
  const holdProjRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM ztoi_mgmnt_system_projects ${projectWhere ? projectWhere + ' AND' : 'WHERE'} status = 'on_hold'`,
    projectParams
  );

  // 3. Admin Financial Metrics
  let netFund = 0;
  let monthlyIncome = 0;
  let monthlyExpense = 0;
  let pendingEmiAmount = 0;
  let chartData: { label: string; income: number; expense: number }[] = [];

  if (isAdmin) {
    const netRow = await queryOne<{ total_income: number; total_expense: number }>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' AND status = 'active' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'active' THEN amount ELSE 0 END), 0) as total_expense
      FROM ztoi_mgmnt_system_ledger
    `);
    netFund = Number(netRow?.total_income || 0) - Number(netRow?.total_expense || 0);

    const monthLedger = await queryOne<{ income: number; expense: number }>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
      FROM ztoi_mgmnt_system_ledger
      WHERE status = 'active'
        AND MONTH(transaction_date) = MONTH(CURRENT_DATE)
        AND YEAR(transaction_date) = YEAR(CURRENT_DATE)
    `);
    monthlyIncome = Number(monthLedger?.income || 0);
    monthlyExpense = Number(monthLedger?.expense || 0);

    const pendingEmiRow = await queryOne<{ total_pending: number }>(`
      SELECT COALESCE(SUM(amount - paid_amount), 0) as total_pending
      FROM ztoi_mgmnt_system_emis
      WHERE status != 'paid'
    `);
    pendingEmiAmount = Number(pendingEmiRow?.total_pending || 0);

    // 6 Month Trend
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = d.toLocaleDateString('en-IN', { month: 'short' });

      const mRes = await queryOne<{ inc: number; exp: number }>(
        `SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as inc,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as exp
         FROM ztoi_mgmnt_system_ledger
         WHERE status = 'active' AND DATE_FORMAT(transaction_date, '%Y-%m') = ?`,
        [ym]
      );

      chartData.push({
        label: mLabel,
        income: Number(mRes?.inc || 0),
        expense: Number(mRes?.exp || 0),
      });
    }
  }

  // 4. Upcoming Deadlines (next 7 days)
  const upcomingDeadlines = await query<any>(
    `SELECT * FROM ztoi_mgmnt_system_projects 
     ${projectWhere ? projectWhere + ' AND' : 'WHERE'} status IN ('new', 'in_progress')
       AND deadline_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY)
     ORDER BY deadline_date ASC LIMIT 5`,
    projectParams
  );

  // 5. Recent Projects
  const recentProjects = await query<any>(
    `SELECT * FROM ztoi_mgmnt_system_projects 
     ${projectWhere}
     ORDER BY created_at DESC LIMIT 5`,
    projectParams
  );

  return (
    <AppShell
      user={user}
      title="Dashboard"
      unreadNotificationsCount={unreadCount}
    >
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Welcome & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div>
            <h2 className="text-base sm:text-lg font-michroma font-bold text-gray-900 tracking-wide">
              Welcome back, <span className="text-[#FF4D00]">{user.full_name}</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Agency overview, financial health and active project timelines
            </p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Project</span>
              </Link>
              <Link
                href="/emis"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5 text-[#FF4D00]" />
                <span>Record Payment</span>
              </Link>
              <Link
                href="/expenses"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <Receipt className="w-3.5 h-3.5 text-[#FF4D00]" />
                <span>Add Expense</span>
              </Link>
            </div>
          )}
        </div>

        {/* Project KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Projects"
            value={totalProjRow?.cnt || 0}
            icon={<FolderKanban className="w-4 h-4 text-gray-400" />}
          />
          <StatCard
            label="Active Projects"
            value={activeProjRow?.cnt || 0}
            variant="warning"
            icon={<Clock className="w-4 h-4 text-amber-500" />}
          />
          <StatCard
            label="Completed"
            value={completedProjRow?.cnt || 0}
            variant="success"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          />
          <StatCard
            label="On Hold"
            value={holdProjRow?.cnt || 0}
            icon={<AlertOctagon className="w-4 h-4 text-gray-400" />}
          />
        </div>

        {/* Admin Financial Stats Grid */}
        {isAdmin && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Net Available Fund"
              value={formatCurrency(netFund)}
              variant={netFund >= 0 ? 'primary' : 'danger'}
              icon={<Wallet className="w-4 h-4 text-[#FF4D00]" />}
              subValue="Dynamic Ledger Balance"
            />
            <StatCard
              label="This Month Income"
              value={formatCurrency(monthlyIncome)}
              variant="success"
              icon={<ArrowUpRight className="w-4 h-4 text-emerald-600" />}
            />
            <StatCard
              label="This Month Expense"
              value={formatCurrency(monthlyExpense)}
              variant="danger"
              icon={<ArrowDownRight className="w-4 h-4 text-rose-600" />}
            />
            <StatCard
              label="Pending EMI Amount"
              value={formatCurrency(pendingEmiAmount)}
              variant="warning"
              icon={<CreditCard className="w-4 h-4 text-amber-600" />}
              subValue="Uncollected Installments"
            />
          </div>
        )}

        {/* Charts and Upcoming Deadlines Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 6 Month Cashflow Bar Chart (Admin Only) */}
          {isAdmin ? (
            <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-michroma text-xs sm:text-sm font-bold text-gray-900 tracking-wide">
                    Income vs Expense
                  </h3>
                  <p className="text-[11px] text-gray-500">Last 6 months cashflow trend</p>
                </div>
                <Link
                  href="/reports/profit-loss"
                  className="text-xs text-[#FF4D00] hover:underline font-semibold"
                >
                  View P&L Report
                </Link>
              </div>
              <IncomeExpenseBarChart data={chartData} />
            </div>
          ) : (
            <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-center items-center text-center py-12">
              <FolderKanban className="w-12 h-12 text-[#FF4D00]/40 mb-3" />
              <h3 className="font-michroma text-base font-bold text-gray-900">
                Team Member Workspace
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                You are viewing projects assigned directly to you. Track timelines and submit deliverables on time.
              </p>
              <Link
                href="/projects"
                className="mt-4 px-4 py-1.5 bg-[#FF4D00] text-white text-xs font-semibold rounded-lg hover:bg-[#e04400]"
              >
                View My Projects
              </Link>
            </div>
          )}

          {/* Upcoming Deadlines (Next 7 Days) */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#FF4D00]" />
                  <h3 className="font-michroma text-xs sm:text-sm font-bold text-gray-900 tracking-wide">
                    Upcoming Deadlines
                  </h3>
                </div>
                <Link
                  href="/projects"
                  className="text-xs text-[#FF4D00] hover:underline font-semibold"
                >
                  View All
                </Link>
              </div>

              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">No deadlines in the next 7 days</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingDeadlines.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="block p-2.5 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-[#FF4D00]/50 transition-all duration-150"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          {p.title}
                        </span>
                        <Badge status={p.priority} type="priority" />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span className="truncate">{p.client_name}</span>
                        <span className="font-medium text-rose-600 shrink-0">
                          Due {formatDate(p.deadline_date)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 text-center">
              Target delivery milestones for the current week
            </div>
          </div>
        </div>

        {/* Recent Projects Table Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-michroma text-xs sm:text-sm font-bold text-gray-900 tracking-wide">
                Recent Projects
              </h3>
              <p className="text-[11px] text-gray-400">Latest active agency deliverables</p>
            </div>
            <Link
              href="/projects"
              className="text-xs text-[#FF4D00] hover:underline font-semibold"
            >
              All Projects &rarr;
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FolderKanban className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">No projects created yet</p>
              {isAdmin && (
                <Link
                  href="/projects/new"
                  className="mt-3 inline-block px-3 py-1.5 bg-[#FF4D00] text-white text-xs font-semibold rounded-lg hover:bg-[#e04400]"
                >
                  Create First Project
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-100 text-[11px] text-gray-500 font-semibold tracking-wider uppercase">
                    <th className="py-2.5 px-4">Code</th>
                    <th className="py-2.5 px-4">Project Title</th>
                    <th className="py-2.5 px-4">Client</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Deadline</th>
                    {isAdmin && <th className="py-2.5 px-4 text-right">Value</th>}
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentProjects.map((proj) => (
                    <tr
                      key={proj.id}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-michroma font-bold text-[#FF4D00]">
                        {proj.project_code}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-gray-900 max-w-[200px] truncate">
                        {proj.title}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 truncate max-w-[150px]">
                        {proj.client_name}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge status={proj.status} type="project" />
                      </td>
                      <td className="py-2.5 px-4 text-gray-600">
                        {formatDate(proj.deadline_date)}
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 px-4 text-right font-semibold text-gray-900">
                          {formatCurrency(proj.total_amount)}
                        </td>
                      )}
                      <td className="py-2.5 px-4 text-right">
                        <Link
                          href={`/projects/${proj.id}`}
                          className="inline-flex items-center px-2 py-1 bg-gray-100 hover:bg-[#FF4D00] hover:text-white rounded text-[11px] font-medium transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
