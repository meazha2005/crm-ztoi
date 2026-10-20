import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { AppShell } from '@/components/AppShell';
import { ProjectForm } from '@/components/ProjectForm';

export default async function EditProjectPage({
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

  const teamMembers = await query<any>(
    'SELECT id, full_name, role FROM ztoi_mgmnt_system_users WHERE status = "active" ORDER BY role, full_name'
  );

  const assignedRows = await query<any>(
    'SELECT user_id FROM ztoi_mgmnt_system_project_assignments WHERE project_id = ?',
    [projectId]
  );
  const assignedUserIds = assignedRows.map((r) => r.user_id);

  return (
    <AppShell user={user} title={`Edit ${project.project_code}`}>
      <ProjectForm
        initialData={project}
        teamMembers={teamMembers}
        assignedUserIds={assignedUserIds}
      />
    </AppShell>
  );
}
