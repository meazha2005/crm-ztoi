'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserCheck, CheckCircle2, Users, Loader2, AlertCircle } from 'lucide-react';
import { updateProjectAction } from '@/lib/actions';
import { Avatar } from './Avatar';

interface AssignTeamProps {
  project: any;
  allUsers: Array<{
    id: number;
    full_name: string;
    email: string;
    role: string;
    avatar?: string;
  }>;
  currentlyAssigned: number[];
}

export function AssignTeamClient({
  project,
  allUsers,
  currentlyAssigned,
}: AssignTeamProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>(currentlyAssigned);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function toggleUser(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedIds(allUsers.map((u) => u.id));
  }

  function deselectAll() {
    setSelectedIds([]);
  }

  function selectAdmins() {
    setSelectedIds(allUsers.filter((u) => u.role === 'admin').map((u) => u.id));
  }

  function selectTeamOnly() {
    setSelectedIds(allUsers.filter((u) => u.role === 'team_member').map((u) => u.id));
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const payload = {
        client_name: project.client_name,
        client_email: project.client_email,
        client_phone: project.client_phone,
        title: project.title,
        description: project.description,
        total_amount: Number(project.total_amount),
        initial_payment: Number(project.initial_payment),
        initial_payment_mode: project.initial_payment_mode,
        initial_payment_received_by: project.initial_payment_received_by,
        payment_type: project.payment_type,
        emi_count: project.emi_count,
        emi_frequency: project.emi_frequency,
        start_date: project.start_date,
        deadline_date: project.deadline_date,
        status: project.status,
        priority: project.priority,
        notes: project.notes,
        assigned_users: selectedIds,
      };

      const res = await updateProjectAction(project.id, payload as any);
      if (!res.success) throw new Error(res.error || 'Failed to update assignments');

      setSuccess(true);
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save assignments');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${project.id}`}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="font-michroma text-sm sm:text-base font-bold text-gray-900 tracking-wide">
              Assign Team &bull; {project.project_code}
            </h2>
            <p className="text-[11px] text-gray-500">{project.title}</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Assignments ({selectedIds.length})</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Select Actions */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-gray-200 shadow-xs text-xs">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
          Quick Filters:
        </span>
        <button
          onClick={selectAll}
          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
        >
          Select All
        </button>
        <button
          onClick={deselectAll}
          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
        >
          Deselect All
        </button>
        <button
          onClick={selectAdmins}
          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
        >
          Admins Only
        </button>
        <button
          onClick={selectTeamOnly}
          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
        >
          Team Members Only
        </button>
      </div>

      {/* User Selection Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {allUsers.map((u) => {
          const isSelected = selectedIds.includes(u.id);

          return (
            <div
              key={u.id}
              onClick={() => toggleUser(u.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isSelected
                  ? 'border-[#FF4D00] bg-[#FF4D00]/5 ring-1 ring-[#FF4D00]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar src={u.avatar} name={u.full_name} size="lg" />
                <div className="min-w-0">
                  <span className="font-semibold text-gray-900 block truncate text-xs">
                    {u.full_name}
                  </span>
                  <span className="text-[10px] text-gray-400 block truncate">
                    {u.email}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-medium uppercase ${
                    u.role === 'admin'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {u.role === 'admin' ? 'Admin' : 'Team'}
                </span>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-[#FF4D00] bg-[#FF4D00] text-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
