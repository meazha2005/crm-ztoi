'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  CreditCard,
  FolderKanban,
  Info,
  Clock,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { markAllNotificationsReadAction } from '@/lib/actions';

interface NotificationItem {
  id: number;
  type: 'payment_due' | 'payment_received' | 'project_deadline' | 'system';
  title: string;
  message: string;
  link?: string | null;
  is_read: number;
  created_at: string;
}

interface NotificationsClientProps {
  notifications: NotificationItem[];
}

export function NotificationsClient({ notifications }: NotificationsClientProps) {
  const router = useRouter();
  const [marking, setMarking] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filtered = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  async function handleMarkAllRead() {
    setMarking(true);
    try {
      await markAllNotificationsReadAction();
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setMarking(false);
    }
  }

  function getIcon(type: string) {
    switch (type) {
      case 'payment_received':
      case 'payment_due':
        return <CreditCard className="w-4 h-4 text-[#FF4D00]" />;
      case 'project_deadline':
        return <FolderKanban className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  }

  return (
    <div className="space-y-3">
      {/* Action Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Notifications ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={marking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {marking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs divide-y divide-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300 stroke-[1.5]" />
            <p className="font-medium text-gray-600">No notifications to display</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              You are all caught up with alerts, invoices, and deliverables
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 sm:p-4 flex items-start gap-3 transition-colors ${
                !item.is_read ? 'bg-orange-50/20' : 'hover:bg-gray-50/60'
              }`}
            >
              <div className="p-2 rounded-lg bg-gray-100 shrink-0 mt-0.5">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-gray-900">{item.title}</h4>
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#FF4D00] shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono shrink-0">
                    {formatDate(item.created_at)}
                  </span>
                </div>

                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{item.message}</p>

                {item.link && (
                  <Link
                    href={item.link}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF4D00] hover:underline mt-2"
                  >
                    <span>View Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
