import React from 'react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import {
  CreditCard,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  FolderKanban,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/Badge';
import { EmiPaymentHistoryClient } from '@/components/EmiPaymentHistoryClient';

export default async function EmiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') redirect('/dashboard');

  const { id } = await params;
  const emiId = parseInt(id, 10);
  if (isNaN(emiId)) notFound();

  // Fetch EMI details with Project
  const emi = await queryOne<any>(
    `SELECT e.*, 
            p.project_code, 
            p.title as project_title, 
            p.client_name, 
            p.client_email, 
            p.client_phone,
            p.total_amount as project_amount
     FROM ztoi_mgmnt_system_emis e
     JOIN ztoi_mgmnt_system_projects p ON e.project_id = p.id
     WHERE e.id = ?`,
    [emiId]
  );
  if (!emi) notFound();

  // Fetch Payment Ledger History
  const payments = await query<any>(
    `SELECT l.*, u.full_name as recorded_by_name
     FROM ztoi_mgmnt_system_ledger l
     LEFT JOIN ztoi_mgmnt_system_users u ON l.created_by = u.id
     WHERE l.reference_type = 'emi' AND l.reference_id = ?
     ORDER BY l.transaction_date DESC, l.id DESC`,
    [emiId]
  );

  const amount = Number(emi.amount || 0);
  const paidAmount = Number(emi.paid_amount || 0);
  const remaining = Math.max(0, amount - paidAmount);
  const percent = amount > 0 ? Math.min(100, (paidAmount / amount) * 100) : 0;
  const isOverdue = emi.status !== 'paid' && emi.due_date < new Date().toISOString().split('T')[0];

  return (
    <AppShell user={user} title={`EMI #${emi.emi_number} • ${emi.project_code}`}>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/emis"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-michroma font-bold text-xs text-[#FF4D00]">
                  {emi.project_code}
                </span>
                <span className="text-xs font-semibold text-gray-800">
                  {emi.emi_number === 0 ? 'Initial Down Payment' : `Installment #${emi.emi_number}`}
                </span>
                <Badge status={emi.status} type="payment" />
              </div>
              <h2 className="text-base font-bold text-gray-900 mt-0.5">
                {emi.project_title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${emi.project_id}`}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Project Details
            </Link>
          </div>
        </div>

        {/* 2-Column Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Amount & Progress */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-xs font-michroma font-bold text-gray-900 uppercase tracking-wide">
              <CreditCard className="w-4 h-4 text-[#FF4D00]" />
              <span>Installment Status</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Target Amount</span>
                <span className="font-michroma font-bold text-sm text-gray-900">
                  {formatCurrency(amount)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] text-emerald-700 uppercase font-bold block">Paid Amount</span>
                <span className="font-michroma font-bold text-sm text-emerald-700">
                  {formatCurrency(paidAmount)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                <span className="text-[10px] text-rose-700 uppercase font-bold block">Remaining</span>
                <span className="font-michroma font-bold text-sm text-rose-700">
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-gray-500 mb-1 font-medium">
                <span>Collection Progress</span>
                <span>{percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-500 font-medium">Due Date:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-900">{formatDate(emi.due_date)}</span>
                {isOverdue && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Overdue
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Client Info */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-xs font-michroma font-bold text-gray-900 uppercase tracking-wide">
              <User className="w-4 h-4 text-[#FF4D00]" />
              <span>Client & Contract</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Client Name:</span>
                <span className="font-semibold text-gray-900">{emi.client_name}</span>
              </div>
              {emi.client_email && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-gray-700">{emi.client_email}</span>
                </div>
              )}
              {emi.client_phone && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone:</span>
                  <span className="text-gray-700">{emi.client_phone}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-gray-100">
                <span className="text-gray-400">Total Project Value:</span>
                <span className="font-michroma font-bold text-gray-900">
                  {formatCurrency(emi.project_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History Table with Downloadable Receipt / Voucher */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-michroma text-xs sm:text-sm font-bold text-gray-900 tracking-wide">
              Payment Audit History ({payments.length})
            </h3>
            <span className="text-xs text-gray-400">Official verified vouchers</span>
          </div>

          <EmiPaymentHistoryClient payments={payments} emi={emi} />
        </div>
      </div>
    </AppShell>
  );
}
