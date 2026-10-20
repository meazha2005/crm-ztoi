'use client';

import React, { useState } from 'react';
import { Eye, History, Shield, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';

interface AuditLogItem {
  id: number;
  action: string;
  table_name: string;
  record_id?: number | null;
  old_values?: any;
  new_values?: any;
  user_id?: number | null;
  user_name?: string | null;
  user_role?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export function AuditLogsClient({ logs }: { logs: AuditLogItem[] }) {
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  function getActionBadgeVariant(action: string): 'success' | 'danger' | 'warning' | 'accent' | 'neutral' {
    switch (action.toLowerCase()) {
      case 'create':
      case 'pay':
        return 'success';
      case 'delete':
        return 'danger';
      case 'update':
      case 'update_profile':
      case 'update_settings':
        return 'accent';
      case 'password_change':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Target Entity</th>
                <th className="py-2.5 px-4">Record ID</th>
                <th className="py-2.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <History className="w-8 h-8 mx-auto mb-2 text-gray-300 stroke-[1.5]" />
                    <p className="text-xs font-medium">No audit events found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      System modifications and financial activities will appear here
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-gray-600">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-2.5 px-4">
                      {log.user_name ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900">{log.user_name}</span>
                          <span className="text-[10px] text-gray-400">({log.user_role})</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">System Process</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-gray-600">
                      {log.table_name.replace('ztoi_mgmnt_system_', '')}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-gray-500">
                      {log.record_id ? `#${log.record_id}` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Trail Inspection: Event #${selectedLog?.id}`}
      >
        {selectedLog && (
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Actor</span>
                <span className="font-semibold text-gray-800">
                  {selectedLog.user_name || 'System'} ({selectedLog.user_role || 'Automation'})
                </span>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Action</span>
                <span className="font-mono font-bold text-gray-800 uppercase">
                  {selectedLog.action}
                </span>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Target Table</span>
                <span className="font-mono text-gray-800">{selectedLog.table_name}</span>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Record ID</span>
                <span className="font-mono text-gray-800">#{selectedLog.record_id || 'N/A'}</span>
              </div>
            </div>

            {selectedLog.new_values && (
              <div>
                <span className="text-[11px] font-semibold text-gray-700 mb-1 block">
                  Action Data Payload:
                </span>
                <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-56">
                  {typeof selectedLog.new_values === 'string'
                    ? selectedLog.new_values
                    : JSON.stringify(selectedLog.new_values, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.old_values && (
              <div>
                <span className="text-[11px] font-semibold text-gray-700 mb-1 block">
                  Previous State (Before Update):
                </span>
                <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48">
                  {typeof selectedLog.old_values === 'string'
                    ? selectedLog.old_values
                    : JSON.stringify(selectedLog.old_values, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
