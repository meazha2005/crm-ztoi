import React from 'react';
import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { AppShell } from '@/components/AppShell';
import { NotificationsClient } from '@/components/NotificationsClient';

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const notifications = await query<any>(
    'SELECT * FROM ztoi_mgmnt_system_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [user.id]
  );

  return (
    <AppShell user={user} title="Notifications">
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#FF4D00]" />
            <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
              Activity & Notifications
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time updates regarding payments received, upcoming deadlines, and agency events
          </p>
        </div>

        <NotificationsClient notifications={notifications} />
      </div>
    </AppShell>
  );
}
