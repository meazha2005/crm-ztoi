import React from 'react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import {
  FolderKanban,
  ArrowLeft,
  Calendar,
  CreditCard,
  User,
  Users,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Edit,
  UserCheck,
  Send,
  AlertCircle,
  Repeat,
  ShieldCheck,
  DollarSign,
} from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { formatCurrency, formatDate, getDeadlineStatus, formatFrequency } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { updateProjectSubmissionAction } from '@/lib/actions';

export default async function ProjectViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const projectId = parseInt(id, 10);
  if (isNaN(projectId)) notFound();

  const isAdmin = user.role === 'admin';

  // Fetch Project
  const project = await queryOne<any>(
    `SELECT p.*, u.full_name as creator_name
     FROM ztoi_mgmnt_system_projects p
     LEFT JOIN ztoi_mgmnt_system_users u ON p.created_by = u.id
     WHERE p.id = ?`,
    [projectId]
  );
  if (!project) notFound();

  // If team member, check if assigned
  if (!isAdmin) {
    const isAssigned = await queryOne(
      'SELECT id FROM ztoi_mgmnt_system_project_assignments WHERE project_id = ? AND user_id = ?',
      [projectId, user.id]
    );
    if (!isAssigned) {
      redirect('/projects');
    }
  }

  // Fetch Team Assignments
  const teamMembers = await query<any>(
    `SELECT u.id, u.full_name, u.email, u.role, u.avatar
     FROM ztoi_mgmnt_system_project_assignments pa
     JOIN ztoi_mgmnt_system_users u ON pa.user_id = u.id
     WHERE pa.project_id = ?
     ORDER BY u.role, u.full_name`,
    [projectId]
  );

  // Fetch EMIs
  const emis = await query<any>(
    'SELECT * FROM ztoi_mgmnt_system_emis WHERE project_id = ? ORDER BY emi_number ASC',
    [projectId]
  );

  // Fetch Maintenance Payments
  const maintenancePayments = await query<any>(
    `SELECT mp.*, u.full_name as created_by_name
     FROM ztoi_mgmnt_system_maintenance_payments mp
     LEFT JOIN ztoi_mgmnt_system_users u ON mp.created_by = u.id
     WHERE mp.project_id = ?
     ORDER BY mp.payment_date DESC`,
    [projectId]
  );
  const totalMaintenanceCollected = maintenancePayments.reduce(
    (acc, curr) => acc + Number(curr.amount || 0),
    0
  );

  // Financial calculations
  const totalAmount = Number(project.total_amount || 0);
  const totalPaid = emis.reduce((acc, curr) => acc + Number(curr.paid_amount || 0), 0);
  const pendingAmount = Math.max(0, totalAmount - totalPaid);
  const percentPaid = totalAmount > 0 ? Math.min(100, (totalPaid / totalAmount) * 100) : 0;

  const deadlineInfo = getDeadlineStatus(project.deadline_date, project.submitted_date);

  // Handle Mark as Submitted (Server action inline handler)
  async function handleMarkSubmitted(formData: FormData) {
    'use server';
    const subDate = formData.get('submitted_date') as string;
    if (subDate) {
      await updateProjectSubmissionAction(projectId, subDate);
    }
  }

  return (
    <AppShell user={user} title={project.project_code}>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-michroma font-bold text-xs px-2 py-0.5 rounded bg-[#FF4D00]/10 text-[#FF4D00] border border-[#FF4D00]/20">
                  {project.project_code}
                </span>
                <Badge status={project.status} type="project" />
                <Badge status={project.priority} type="priority" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-1 line-clamp-1">
                {project.title}
              </h2>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <Link
                href={`/projects/${project.id}/assign`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Team</span>
              </Link>
              <Link
                href={`/projects/${project.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </Link>
            </div>
          )}
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Project Details & Timelines */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-xs font-michroma font-bold text-gray-900 uppercase tracking-wide">
              <Calendar className="w-4 h-4 text-[#FF4D00]" />
              <span>Project Timelines</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Start Date</span>
                <span className="text-gray-800 font-semibold">{formatDate(project.start_date)}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Target Deadline</span>
                <span className="text-gray-800 font-semibold">{formatDate(project.deadline_date)}</span>
              </div>
            </div>

            {project.submitted_date ? (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Delivered On
                  </span>
                  <span className="font-semibold text-emerald-950">
                    {formatDate(project.submitted_date)}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border ${deadlineInfo.badgeClass}`}
                >
                  {deadlineInfo.label}
                </span>
              </div>
            ) : (
              project.status !== 'completed' && (
                <form
                  action={handleMarkSubmitted}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-600 block">
                      Mark as Completed
                    </span>
                    <input
                      type="date"
                      name="submitted_date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      required
                      className="px-2 py-1 bg-white border border-gray-200 rounded text-xs mt-1"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Submit Project
                  </button>
                </form>
              )
            )}

            {project.description && (
              <div>
                <span className="text-[11px] uppercase font-bold text-gray-400 block mb-1">
                  Description
                </span>
                <p className="text-xs text-gray-700 whitespace-pre-line bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                  {project.description}
                </p>
              </div>
            )}

            {project.notes && (
              <div>
                <span className="text-[11px] uppercase font-bold text-gray-400 block mb-1">
                  Internal Notes
                </span>
                <p className="text-xs text-gray-700 whitespace-pre-line bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                  {project.notes}
                </p>
              </div>
            )}
          </div>

          {/* Right: Client Details & Financial Overview */}
          <div className="space-y-4">
            {/* Client Card */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-xs font-michroma font-bold text-gray-900 uppercase tracking-wide">
                <User className="w-4 h-4 text-[#FF4D00]" />
                <span>Client Information</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Client Name:</span>
                  <span className="font-semibold text-gray-900">{project.client_name}</span>
                </div>
                {project.client_email && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email:
                    </span>
                    <a
                      href={`mailto:${project.client_email}`}
                      className="text-gray-700 hover:text-[#FF4D00]"
                    >
                      {project.client_email}
                    </a>
                  </div>
                )}
                {project.client_phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Phone:
                    </span>
                    <a
                      href={`tel:${project.client_phone}`}
                      className="text-gray-700 hover:text-[#FF4D00]"
                    >
                      {project.client_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Overview (Admin Only) */}
            {isAdmin && (
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs font-michroma font-bold text-gray-900 uppercase tracking-wide">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#FF4D00]" />
                    <span>Contract & Financials</span>
                  </div>
                  <span className="text-gray-500 capitalize">{project.payment_type}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-gray-50 border border-gray-100">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Total</span>
                    <span className="font-michroma font-bold text-gray-900">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 uppercase font-bold block">Collected</span>
                    <span className="font-michroma font-bold text-emerald-700">
                      {formatCurrency(totalPaid)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-rose-50 border border-rose-100">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Pending</span>
                    <span className="font-michroma font-bold text-rose-700">
                      {formatCurrency(pendingAmount)}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-gray-500 mb-1 font-medium">
                    <span>Payment Progress</span>
                    <span>{percentPaid.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#FF4D00] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentPaid}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Team Members Section */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-michroma font-bold text-gray-900 uppercase tracking-wide">
              <Users className="w-4 h-4 text-[#FF4D00]" />
              <span>Assigned Team Members ({teamMembers.length})</span>
            </div>
            {isAdmin && (
              <Link
                href={`/projects/${project.id}/assign`}
                className="text-xs text-[#FF4D00] hover:underline font-semibold"
              >
                Manage Team
              </Link>
            )}
          </div>

          {teamMembers.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No team members assigned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {teamMembers.map((m) => (
                <div
                  key={m.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs"
                >
                  <Avatar src={m.avatar} name={m.full_name} size="sm" />
                  <div>
                    <span className="font-semibold text-gray-900 block leading-tight">
                      {m.full_name}
                    </span>
                    <span className="text-[10px] text-gray-400 capitalize">
                      {m.role === 'admin' ? 'Administrator' : 'Team Member'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* EMI & Payment Schedule (Admin Only) */}
        {isAdmin && emis.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-michroma text-xs sm:text-sm font-bold text-gray-900 tracking-wide">
                  Payment Schedule & Installments
                </h3>
                <p className="text-[11px] text-gray-500">
                  {emis.length} total installment(s) configured
                </p>
              </div>
              <Link
                href="/emis"
                className="text-xs text-[#FF4D00] hover:underline font-semibold"
              >
                Go to EMI Dashboard &rarr;
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-100 text-[11px] text-gray-500 font-semibold tracking-wider uppercase">
                    <th className="py-2.5 px-4">Installment</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Paid</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {emis.map((emi) => (
                    <tr key={emi.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">
                        {emi.emi_number === 0 ? 'Down Payment' : `EMI #${emi.emi_number}`}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600">
                        {formatDate(emi.due_date)}
                      </td>
                      <td className="py-2.5 px-4 font-michroma font-bold text-gray-900">
                        {formatCurrency(emi.amount)}
                      </td>
                      <td className="py-2.5 px-4 font-michroma font-semibold text-emerald-600">
                        {formatCurrency(emi.paid_amount)}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge status={emi.status} type="payment" />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/emis/${emi.id}`}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-medium"
                          >
                            Details
                          </Link>
                          {emi.status !== 'paid' && (
                            <Link
                              href={`/emis/${emi.id}?pay=1`}
                              className="px-2 py-1 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded text-[11px] font-medium"
                            >
                              Pay
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recurring Maintenance Retainer Contract (Admin Only) */}
        {isAdmin && project.has_maintenance === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-50 text-[#FF4D00]">
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-michroma text-xs sm:text-sm font-bold text-gray-900 tracking-wide">
                    Recurring Maintenance Retainer (AMC)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Billed at {formatCurrency(project.maintenance_amount)} ({formatFrequency(project.maintenance_frequency, project.maintenance_custom_days)})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/maintenance"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Collect Retainer Fee</span>
                </Link>
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Edit Terms
                </Link>
              </div>
            </div>

            {/* Retainer KPI overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50/50 border-b border-gray-100 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Retainer Fee</span>
                <span className="font-michroma font-bold text-gray-900 text-sm">
                  {formatCurrency(project.maintenance_amount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Cycle Frequency</span>
                <span className="font-semibold text-gray-800">
                  {formatFrequency(project.maintenance_frequency, project.maintenance_custom_days)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Next Due Date</span>
                <span className="font-mono font-bold text-gray-900">
                  {formatDate(project.maintenance_next_due_date)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Collected</span>
                <span className="font-michroma font-bold text-emerald-600 text-sm">
                  {formatCurrency(totalMaintenanceCollected)}
                </span>
              </div>
            </div>

            {/* Collection History Table */}
            {maintenancePayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/75 border-b border-gray-100 text-[11px] text-gray-500 font-semibold tracking-wider uppercase">
                      <th className="py-2.5 px-4">Receipt #</th>
                      <th className="py-2.5 px-4">Payment Date</th>
                      <th className="py-2.5 px-4">Billing Period</th>
                      <th className="py-2.5 px-4">Method & Txn</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {maintenancePayments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-gray-900">
                          MNT-{String(p.id).padStart(5, '0')}
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 font-mono text-[11px]">
                          {formatDate(p.payment_date)}
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 text-[11px] font-mono">
                          {p.billing_period_start ? (
                            <span>
                              {formatDate(p.billing_period_start)}
                              {p.billing_period_end && ` → ${formatDate(p.billing_period_end)}`}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-4 uppercase font-mono text-[11px] text-gray-700">
                          {p.payment_method.replace('_', ' ')}
                          {p.transaction_id && ` (${p.transaction_id})`}
                        </td>
                        <td className="py-2.5 px-4 text-right font-michroma font-bold text-emerald-600">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-gray-400">
                No maintenance fee collections recorded yet for this project.
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
