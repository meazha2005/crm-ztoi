import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Download,
  FolderKanban,
  UserCheck,
  Calendar,
  AlertCircle,
  Eye,
  Edit,
  Users,
} from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { formatCurrency, formatDate, getDeadlineStatus } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const resolvedParams = await searchParams;
  const search = (resolvedParams.search || '').trim();
  const statusFilter = (resolvedParams.status || '').trim();
  const isAdmin = user.role === 'admin';

  // Build Query
  const whereConditions: string[] = [];
  const queryParams: any[] = [];

  if (search) {
    whereConditions.push('(title LIKE ? OR client_name LIKE ? OR project_code LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (statusFilter && statusFilter !== 'all') {
    whereConditions.push('status = ?');
    queryParams.push(statusFilter);
  }

  if (!isAdmin) {
    whereConditions.push('id IN (SELECT project_id FROM ztoi_mgmnt_system_project_assignments WHERE user_id = ?)');
    queryParams.push(user.id);
  }

  const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const projects = await query<any>(
    `SELECT * FROM ztoi_mgmnt_system_projects ${whereSql} ORDER BY created_at DESC`,
    queryParams
  );

  // Fetch all assignments for these projects
  let assignmentsMap: Record<number, any[]> = {};
  if (projects.length > 0) {
    const projectIds = projects.map((p) => p.id);
    const placeholders = projectIds.map(() => '?').join(',');
    const assignRows = await query<any>(
      `SELECT pa.project_id, u.id, u.full_name, u.avatar, u.role
       FROM ztoi_mgmnt_system_project_assignments pa
       JOIN ztoi_mgmnt_system_users u ON pa.user_id = u.id
       WHERE pa.project_id IN (${placeholders})
       ORDER BY u.role, u.full_name`,
      projectIds
    );

    for (const a of assignRows) {
      if (!assignmentsMap[a.project_id]) assignmentsMap[a.project_id] = [];
      assignmentsMap[a.project_id].push(a);
    }
  }

  // Summary counts
  const totalCount = projects.length;

  return (
    <AppShell user={user} title="Projects">
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-[#FF4D00]" />
              <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
                Projects Portfolio
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {isAdmin
                ? 'Manage deliverables, client contracts, and installment schedules'
                : 'All projects assigned to your schedule'}
            </p>
          </div>

          {isAdmin && (
            <Link
              href="/projects/new"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </Link>
          )}
        </div>

        {/* Filters and Search Bar */}
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
              placeholder="Search by code, title or client name..."
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
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              type="submit"
              className="px-3 py-1.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors"
            >
              Filter
            </button>

            {(search || statusFilter) && (
              <Link
                href="/projects"
                className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reset
              </Link>
            )}
          </div>
        </form>

        {/* Empty State */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center mx-auto mb-3">
              <FolderKanban className="w-6 h-6" />
            </div>
            <h3 className="font-michroma text-sm font-bold text-gray-900 mb-1">
              No Projects Found
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
              {search || statusFilter
                ? 'Try adjusting your filters or search keywords to find what you are looking for.'
                : 'Get started by creating your first project with client and payment details.'}
            </p>
            {isAdmin && (
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF4D00] text-white rounded-lg text-xs font-semibold hover:bg-[#e04400]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Project</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            {/* Desktop Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-100 text-[11px] text-gray-500 font-semibold tracking-wider uppercase">
                    <th className="py-2.5 px-3 sm:px-4">Code</th>
                    <th className="py-2.5 px-3 sm:px-4">Project & Client</th>
                    <th className="py-2.5 px-3 sm:px-4">Assigned Team</th>
                    <th className="py-2.5 px-3 sm:px-4">Status</th>
                    <th className="py-2.5 px-3 sm:px-4">Priority</th>
                    <th className="py-2.5 px-3 sm:px-4">Deadline</th>
                    {isAdmin && <th className="py-2.5 px-3 sm:px-4 text-right">Value</th>}
                    <th className="py-2.5 px-3 sm:px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projects.map((proj) => {
                    const assigned = assignmentsMap[proj.id] || [];
                    const deadlineInfo = getDeadlineStatus(
                      proj.deadline_date,
                      proj.submitted_date
                    );

                    return (
                      <tr
                        key={proj.id}
                        className="hover:bg-gray-50/60 transition-colors group"
                      >
                        <td className="py-2.5 px-3 sm:px-4 font-michroma font-bold text-[#FF4D00] whitespace-nowrap">
                          {proj.project_code}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 max-w-[220px]">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/projects/${proj.id}`}
                              className="font-semibold text-gray-900 group-hover:text-[#FF4D00] transition-colors line-clamp-1"
                            >
                              {proj.title}
                            </Link>
                            {proj.has_maintenance === 1 && (
                              <span
                                className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-50 text-[#FF4D00] border border-[#FF4D00]/20 shrink-0"
                                title={`Recurring Retainer: ${formatCurrency(proj.maintenance_amount)}`}
                              >
                                AMC
                              </span>
                            )}
                          </div>
                          <span className="block text-[11px] text-gray-500 truncate">
                            {proj.client_name}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4">
                          {assigned.length === 0 ? (
                            <span className="text-[11px] text-gray-400">Unassigned</span>
                          ) : (
                            <div className="flex items-center -space-x-1.5 overflow-hidden">
                              {assigned.slice(0, 3).map((m, idx) => (
                                <Avatar
                                  key={idx}
                                  src={m.avatar}
                                  name={m.full_name}
                                  size="sm"
                                  ring
                                />
                              ))}
                              {assigned.length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[9px] font-bold ring-2 ring-white shrink-0">
                                  +{assigned.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap">
                          <Badge status={proj.status} type="project" />
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap">
                          <Badge status={proj.priority} type="priority" />
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-700">{formatDate(proj.deadline_date)}</span>
                            {proj.status !== 'completed' && deadlineInfo.status !== 'normal' && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${deadlineInfo.badgeClass}`}
                              >
                                {deadlineInfo.label}
                              </span>
                            )}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 px-3 sm:px-4 text-right font-semibold text-gray-900 whitespace-nowrap">
                            {formatCurrency(proj.total_amount)}
                          </td>
                        )}
                        <td className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              href={`/projects/${proj.id}`}
                              title="View Project"
                              className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-[#FF4D00] transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            {isAdmin && (
                              <>
                                <Link
                                  href={`/projects/${proj.id}/edit`}
                                  title="Edit Project"
                                  className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-[#FF4D00] transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </Link>
                                <Link
                                  href={`/projects/${proj.id}/assign`}
                                  title="Assign Team"
                                  className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-[#FF4D00] transition-colors"
                                >
                                  <Users className="w-4 h-4" />
                                </Link>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
              <span>Showing {projects.length} project(s)</span>
              <span className="font-michroma text-[10px] text-gray-400">ZTOI MANAGEMENT</span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
