'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/Badge';
import { EmiPaymentModal } from '@/components/EmiPaymentModal';
import { ReceiptModal, ReceiptData } from '@/components/ReceiptModal';

interface ProjectEmiGroup {
  project_id: number;
  project_code: string;
  project_title: string;
  client_name: string;
  total_emis: number;
  total_amount: number;
  total_paid: number;
  pending_amount: number;
  pending_count: number;
  emis: Array<{
    id: number;
    project_id: number;
    emi_number: number;
    due_date: string;
    amount: number;
    paid_amount: number;
    status: 'unpaid' | 'partial' | 'paid';
    paid_date?: string;
    receipt_url?: string;
    notes?: string;
  }>;
}

export function EmiListClient({ groups }: { groups: ProjectEmiGroup[] }) {
  // Accordion open state (default: all open)
  const [openProjects, setOpenProjects] = useState<Record<number, boolean>>(() => {
    const map: Record<number, boolean> = {};
    groups.forEach((g) => {
      map[g.project_id] = true;
    });
    return map;
  });

  // Modal payment state
  const [activeEmiForPay, setActiveEmiForPay] = useState<any | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  function toggleProject(pid: number) {
    setOpenProjects((prev) => ({
      ...prev,
      [pid]: !prev[pid],
    }));
  }

  function handleOpenReceipt(grp: ProjectEmiGroup, emi: any) {
    setReceiptData({
      type: 'payment',
      receiptNo: `REC-EMI-${emi.id.toString().padStart(5, '0')}`,
      date: emi.paid_date || emi.due_date,
      title: 'OFFICIAL PAYMENT RECEIPT',
      partyName: grp.client_name,
      projectCode: grp.project_code,
      projectTitle: grp.project_title,
      installmentNo: emi.emi_number,
      description:
        emi.emi_number === 0
          ? `Down Payment Receipt • ${grp.project_title}`
          : `Installment #${emi.emi_number} Receipt • ${grp.project_title}`,
      amount: Number(emi.paid_amount || emi.amount),
      paymentMethod: 'Bank / Online Transfer',
      notes: emi.notes,
      attachedFileUrl: emi.receipt_url,
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <>
      <div className="space-y-3">
        {groups.map((grp) => {
          const isOpen = Boolean(openProjects[grp.project_id]);

          return (
            <div
              key={grp.project_id}
              className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden transition-all duration-150"
            >
              {/* Project Header Accordion Row */}
              <div
                onClick={() => toggleProject(grp.project_id)}
                className="px-4 py-3 bg-white hover:bg-gray-50/75 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded text-gray-400 hover:text-gray-700">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-[#FF4D00]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-michroma font-bold text-xs text-[#FF4D00]">
                        {grp.project_code}
                      </span>
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {grp.project_title}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 block truncate">
                      Client: {grp.client_name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 shrink-0 pl-7 sm:pl-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Collected / Total
                    </span>
                    <span className="text-xs font-michroma font-bold text-gray-900">
                      <span className="text-emerald-600">{formatCurrency(grp.total_paid)}</span> / {formatCurrency(grp.total_amount)}
                    </span>
                  </div>

                  {grp.pending_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      {grp.pending_count} Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Installments Table (Expanded) */}
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50/30 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100/60 text-[10px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                        <th className="py-2 px-4">Installment #</th>
                        <th className="py-2 px-4">Due Date</th>
                        <th className="py-2 px-4">Installment Amount</th>
                        <th className="py-2 px-4">Collected Amount</th>
                        <th className="py-2 px-4">Proof File</th>
                        <th className="py-2 px-4">Status</th>
                        <th className="py-2 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {grp.emis.map((emi) => {
                        const isOverdue = emi.status !== 'paid' && emi.due_date < todayStr;
                        const hasPaid = Number(emi.paid_amount || 0) > 0;

                        return (
                          <tr
                            key={emi.id}
                            className="hover:bg-gray-50/60 transition-colors"
                          >
                            <td className="py-2.5 px-4 font-semibold text-gray-800">
                              {emi.emi_number === 0 ? 'Down Payment' : `EMI #${emi.emi_number}`}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-700 font-medium">
                                  {formatDate(emi.due_date)}
                                </span>
                                {isOverdue && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    Overdue
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-michroma font-bold text-gray-900">
                              {formatCurrency(emi.amount)}
                            </td>
                            <td className="py-2.5 px-4 font-michroma font-semibold text-emerald-600">
                              {formatCurrency(emi.paid_amount)}
                            </td>
                            <td className="py-2.5 px-4">
                              {emi.receipt_url ? (
                                <a
                                  href={emi.receipt_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF4D00] hover:underline"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                  <span>Proof</span>
                                </a>
                              ) : (
                                <span className="text-gray-300 text-[11px]">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge status={emi.status} type="payment" />
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {hasPaid && (
                                  <button
                                    onClick={() => handleOpenReceipt(grp, emi)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                                    title="Download Payment Receipt (PDF / Image)"
                                  >
                                    <Receipt className="w-3 h-3 text-[#FF4D00]" />
                                    <span>Receipt</span>
                                  </button>
                                )}

                                {emi.status !== 'paid' ? (
                                  <button
                                    onClick={() =>
                                      setActiveEmiForPay({
                                        ...emi,
                                        project_code: grp.project_code,
                                        project_title: grp.project_title,
                                        client_name: grp.client_name,
                                      })
                                    }
                                    className="px-2.5 py-1 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded text-[11px] font-semibold shadow-xs cursor-pointer transition-colors"
                                  >
                                    Pay
                                  </button>
                                ) : (
                                  <Link
                                    href={`/emis/${emi.id}`}
                                    className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded text-[11px] font-medium transition-colors"
                                  >
                                    Details
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment Recording Modal */}
      {activeEmiForPay && (
        <EmiPaymentModal
          isOpen={Boolean(activeEmiForPay)}
          onClose={() => setActiveEmiForPay(null)}
          emi={activeEmiForPay}
        />
      )}

      {/* Official Downloadable Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => setReceiptData(null)}
        data={receiptData}
      />
    </>
  );
}
