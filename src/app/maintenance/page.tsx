import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { AppShell } from '@/components/AppShell';
import { MaintenanceClient } from '@/components/MaintenanceClient';

export default async function MaintenancePage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');

  // 1. Fetch projects with maintenance enabled or configured
  const maintenanceProjects = await query<any>(
    `SELECT p.*,
       (SELECT COUNT(*) FROM ztoi_mgmnt_system_maintenance_payments mp WHERE mp.project_id = p.id) as payment_count,
       (SELECT COALESCE(SUM(amount), 0) FROM ztoi_mgmnt_system_maintenance_payments mp WHERE mp.project_id = p.id) as total_collected,
       (SELECT MAX(payment_date) FROM ztoi_mgmnt_system_maintenance_payments mp WHERE mp.project_id = p.id) as last_payment_date
     FROM ztoi_mgmnt_system_projects p
     WHERE p.has_maintenance = 1
     ORDER BY
       CASE
         WHEN p.maintenance_status = 'active' AND p.maintenance_next_due_date <= CURDATE() THEN 1
         WHEN p.maintenance_status = 'active' THEN 2
         WHEN p.maintenance_status = 'paused' THEN 3
         ELSE 4
       END,
       p.maintenance_next_due_date ASC`
  );

  // 2. Fetch all historical maintenance payments
  const payments = await query<any>(
    `SELECT mp.*,
       p.project_code, p.title as project_title, p.client_name, p.client_phone, p.client_email,
       u.full_name as created_by_name
     FROM ztoi_mgmnt_system_maintenance_payments mp
     JOIN ztoi_mgmnt_system_projects p ON mp.project_id = p.id
     LEFT JOIN ztoi_mgmnt_system_users u ON mp.created_by = u.id
     ORDER BY mp.payment_date DESC, mp.id DESC
     LIMIT 200`
  );

  // 3. Fetch all active projects (for manual collection selector or enabling maintenance)
  const allProjects = await query<any>(
    `SELECT id, project_code, title, client_name, client_phone, client_email,
       has_maintenance, maintenance_amount, maintenance_frequency,
       maintenance_custom_days, maintenance_start_date, maintenance_next_due_date,
       maintenance_status, deadline_date, start_date
     FROM ztoi_mgmnt_system_projects
     WHERE status != 'cancelled'
     ORDER BY project_code ASC`
  );

  // 4. Team members for received by list
  const teamMembers = await query<any>(
    `SELECT id, full_name, role FROM ztoi_mgmnt_system_users WHERE status = 'active' ORDER BY full_name ASC`
  );

  return (
    <AppShell user={user} title="Maintenance Fee Collection">
      <MaintenanceClient
        maintenanceProjects={maintenanceProjects}
        payments={payments}
        allProjects={allProjects}
        teamMembers={teamMembers}
        currentUserId={user.id}
      />
    </AppShell>
  );
}
