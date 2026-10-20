import React from 'react';
import { redirect } from 'next/navigation';
import { Settings as SettingsIcon } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { AppShell } from '@/components/AppShell';
import { SettingsClient } from '@/components/SettingsClient';

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') redirect('/dashboard');

  const settingsRows = await query<{ setting_key: string; setting_value: string }>(
    'SELECT setting_key, setting_value FROM ztoi_mgmnt_system_settings'
  );

  const settingsMap: Record<string, string> = {};
  for (const row of settingsRows) {
    settingsMap[row.setting_key] = row.setting_value;
  }

  const categories = await query<any>(
    'SELECT id, name, description, color FROM ztoi_mgmnt_system_expense_categories WHERE status = "active" ORDER BY name ASC'
  );

  return (
    <AppShell user={user} title="System Settings">
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-[#FF4D00]" />
            <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
              System Settings & Configuration
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure agency details, financial parameters, invoice branding, and expense categories
          </p>
        </div>

        <SettingsClient initialSettings={settingsMap} categories={categories} />
      </div>
    </AppShell>
  );
}
