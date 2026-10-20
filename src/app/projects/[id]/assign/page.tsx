import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { AppShell } from '@/components/AppShell';
import { AssignTeamClient } from '@/components/AssignTeamClient';

export default async function AssignTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') redirect('/projects');

  const { id } = await params;
  const projectId = parseInt(id, 10);
  if (isNaN(projectId)) notFound();

  const project = await queryOne<any>(
    'SELECT * FROM ztoi_mgmnt_system_projects WHERE id = ?',
    [projectId]
  );
  if (!project) notFound();

  const allUsers = await query<any>(
    'SELECT id, full_name, email, role, avatar FROM ztoi_mgmnt_system_users WHERE status = "active" ORDER BY role, full_name'
  );

  const assignedRows = await query<any>(
    'SELECT user_id FROM ztoi_mgmnt_system_project_assignments WHERE project_id = ?',
    [projectId]
  );
  const currentlyAssigned = assignedRows.map((r) => r.user_id);

  return (
    <AppShell user={user} title={`Assign Team: ${project.project_code}`}>
      <AssignTeamClient
        project={project}
        allUsers={allUsers}
        currentlyAssigned={currentlyAssigned}
      />
    </AppShell>
  );
}
