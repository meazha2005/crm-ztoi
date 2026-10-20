import React from 'react';
import { redirect } from 'next/navigation';
import { UserCheck, Shield, Users, Clock } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { UsersClient } from '@/components/UsersClient';

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') redirect('/dashboard');

  const users = await query<any>(
    'SELECT id, username, email, full_name, role, phone, avatar, status, last_login, created_at FROM ztoi_mgmnt_system_users ORDER BY role ASC, full_name ASC'
  );

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'admin' && u.status === 'active').length;
  const memberCount = users.filter((u) => u.role === 'team_member' && u.status === 'active').length;

  return (
    <AppShell user={user} title="Team & Users">
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#FF4D00]" />
              <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
                User Management & Access Control
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Control administrative privileges, employee accounts, and system access
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Total Accounts"
            value={totalUsers}
            variant="default"
            subValue="Registered team credentials"
          />
          <StatCard
            label="Active Administrators"
            value={adminCount}
            variant="accent"
            subValue="Full financial & system control"
          />
          <StatCard
            label="Active Team Members"
            value={memberCount}
            variant="success"
            subValue="Project assigned personnel"
          />
        </div>

        {/* Users Client Component with Modals */}
        <UsersClient users={users} currentUserId={user.id} />
      </div>
    </AppShell>
  );
}
