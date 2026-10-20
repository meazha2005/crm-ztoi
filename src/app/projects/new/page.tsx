import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser, requireAdminUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { AppShell } from '@/components/AppShell';
import { ProjectForm } from '@/components/ProjectForm';

export default async function NewProjectPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    redirect('/projects');
  }

  const teamMembers = await query<any>(
    'SELECT id, full_name, role FROM ztoi_mgmnt_system_users WHERE status = "active" ORDER BY role, full_name'
  );

  return (
    <AppShell user={user} title="New Project">
      <ProjectForm teamMembers={teamMembers} />
    </AppShell>
  );
}
