'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AuthUser } from '@/lib/auth';

interface AppShellProps {
  user: AuthUser;
  title?: string;
  unreadNotificationsCount?: number;
  children: React.ReactNode;
}

export function AppShell({
  user,
  title,
  unreadNotificationsCount = 0,
  children,
}: AppShellProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Sidebar for Desktop & Slide-over for Mobile */}
      <Sidebar
        user={user}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen">
        <Topbar
          user={user}
          onOpenMobile={() => setIsOpenMobile(true)}
          title={title}
          unreadNotificationsCount={unreadNotificationsCount}
        />
        <main className="flex-1 p-3.5 sm:p-6 bg-white overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
