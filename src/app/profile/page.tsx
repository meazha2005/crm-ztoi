import React from 'react';
import { redirect } from 'next/navigation';
import { UserCheck } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';
import { ProfileClient } from '@/components/ProfileClient';

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <AppShell user={user} title="My Profile">
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#FF4D00]" />
            <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
              Account Profile & Security
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your personal profile details, contact preferences, and login credentials
          </p>
        </div>

        <ProfileClient user={user} />
      </div>
    </AppShell>
  );
}
