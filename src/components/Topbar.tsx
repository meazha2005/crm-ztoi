'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Bell, User, Plus } from 'lucide-react';
import { AuthUser } from '@/lib/auth';
import { Avatar } from './Avatar';

interface TopbarProps {
  user: AuthUser;
  onOpenMobile: () => void;
  title?: string;
  unreadNotificationsCount?: number;
}

export function Topbar({
  user,
  onOpenMobile,
  title,
  unreadNotificationsCount = 0,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-xs border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenMobile}
          className="p-1.5 -ml-1 text-gray-500 hover:text-gray-900 rounded-lg lg:hidden hover:bg-gray-100 cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Indicator */}
        <div className="flex items-center gap-1.5 lg:hidden mr-1">
          <img src="/logo.png" alt="ZTOI TECH" className="w-6 h-6 object-contain" />
          <span className="font-michroma font-bold text-xs tracking-wider text-[#FF4D00]">
            ZTOI TECH
          </span>
        </div>

        {title && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-gray-300">/</span>
            <h1 className="font-michroma text-xs sm:text-sm font-bold text-gray-900 tracking-wide truncate max-w-[160px] sm:max-w-md">
              {title}
            </h1>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Action Button for Admin */}
        {user.role === 'admin' && (
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Project</span>
          </Link>
        )}

        {/* Notifications Icon with Badge */}
        <Link
          href="/notifications"
          className="relative p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF4D00] ring-2 ring-white animate-pulse" />
          )}
        </Link>

        {/* Profile Avatar Pill */}
        <Link
          href="/profile"
          className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <Avatar src={user.avatar} name={user.full_name} size="md" />
          <span className="text-xs font-medium text-gray-800 hidden md:inline truncate max-w-[100px]">
            {user.full_name?.split(' ')[0]}
          </span>
        </Link>
      </div>
    </header>
  );
}
