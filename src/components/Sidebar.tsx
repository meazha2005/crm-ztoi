'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  CreditCard,
  BookOpen,
  Receipt,
  Users2,
  TrendingUp,
  FileSpreadsheet,
  PieChart,
  UserCheck,
  Settings,
  History,
  X,
  LogOut,
  Repeat,
} from 'lucide-react';
import { AuthUser } from '@/lib/auth';
import { Avatar } from './Avatar';

interface SidebarProps {
  user: AuthUser;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ user, isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.role === 'admin';

  const navLinks = [
    {
      group: 'OVERVIEW',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Projects', href: '/projects', icon: FolderKanban },
      ],
    },
    ...(isAdmin
      ? [
          {
            group: 'FINANCE & PAYMENTS',
            items: [
              { label: 'EMI / Payments', href: '/emis', icon: CreditCard },
              { label: 'Maintenance Fees', href: '/maintenance', icon: Repeat },
              { label: 'General Ledger', href: '/ledger', icon: BookOpen },
              { label: 'Expenses', href: '/expenses', icon: Receipt },
              { label: 'Salaries', href: '/salaries', icon: Users2 },
            ],
          },
          {
            group: 'ANALYTICS & REPORTS',
            items: [
              { label: 'Profit & Loss', href: '/reports/profit-loss', icon: TrendingUp },
              { label: 'EMI Report', href: '/emis/report', icon: FileSpreadsheet },
              { label: 'Expense Report', href: '/expenses/report', icon: PieChart },
            ],
          },
          {
            group: 'MANAGEMENT',
            items: [
              { label: 'Team & Users', href: '/users', icon: UserCheck },
              { label: 'Settings', href: '/settings', icon: Settings },
              { label: 'Audit Logs', href: '/audit-logs', icon: History },
            ],
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 group"
          >
            <img
              src="/logo.png"
              alt="ZTOI TECH"
              className="w-8 h-8 object-contain group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-michroma font-bold text-base tracking-wider text-[#FF4D00]">
                ZTOI TECH
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-gray-400 font-medium -mt-1">
                Management System
              </span>
            </div>
          </Link>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navLinks.map((section, sIdx) => (
            <div key={sIdx}>
              <div className="px-2 pb-1.5 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                {section.group}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item, iIdx) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={iIdx}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-[#FF4D00] text-white shadow-xs font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Card at Bottom */}
        <div className="p-3 border-t border-gray-100 shrink-0 bg-gray-50/50">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/profile"
              onClick={onCloseMobile}
              className="flex items-center gap-2 min-w-0 group"
            >
              <Avatar src={user.avatar} name={user.full_name} size="lg" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-[#FF4D00] transition-colors">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-gray-400 capitalize truncate">
                  {user.role === 'admin' ? 'Administrator' : 'Team Member'}
                </p>
              </div>
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                title="Logout"
                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
