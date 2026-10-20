'use client';

import React, { useState } from 'react';
import { Receipt, FileCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReceiptModal, ReceiptData } from '@/components/ReceiptModal';

interface PaymentItem {
  id: number;
  transaction_date: string;
  amount: number;
  payment_method: string;
  transaction_id?: string;
  received_by?: string;
  reference_number?: string;
  receipt_url?: string;
  notes?: string;
  recorded_by_name?: string;
}

interface EmiPaymentHistoryClientProps {
  payments: PaymentItem[];
  emi: {
    id: number;
    emi_number: number;
    project_code: string;
    project_title: string;
    client_name: string;
    client_phone?: string;
  };
}

export function EmiPaymentHistoryClient({
  payments,
  emi,
}: EmiPaymentHistoryClientProps) {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  function handleOpenReceipt(p: PaymentItem) {
    setReceiptData({
      type: 'payment',
      receiptNo: `REC-${p.id.toString().padStart(5, '0')}`,
      date: p.transaction_date,
      title: 'OFFICIAL PAYMENT RECEIPT',
      partyName: emi.client_name,
      partyContact: emi.client_phone,
      projectCode: emi.project_code,
      projectTitle: emi.project_title,
      installmentNo: emi.emi_number,
      description:
        emi.emi_number === 0
          ? `Down Payment Receipt • ${emi.project_title}`
          : `Installment #${emi.emi_number} Receipt • ${emi.project_title}`,
      amount: Number(p.amount),
      paymentMethod: p.payment_method || 'Bank Transfer',
      transactionId: p.transaction_id,
      referenceNumber: p.reference_number,
      handledBy: p.received_by,
      notes: p.notes,
      attachedFileUrl: p.receipt_url,
    });
  }

  if (payments.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 text-xs">
        No payments recorded yet for this installment.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
              <th className="py-2.5 px-4">Date</th>
              <th className="py-2.5 px-4">Amount</th>
              <th className="py-2.5 px-4">Method</th>
              <th className="py-2.5 px-4">Txn / UTR / Staff</th>
              <th className="py-2.5 px-4">Recorded By</th>
              <th className="py-2.5 px-4 text-right">Receipt / Voucher</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="py-2.5 px-4 font-medium text-gray-800">
                  {formatDate(p.transaction_date)}
                </td>
                <td className="py-2.5 px-4 font-michroma font-bold text-emerald-600">
                  {formatCurrency(p.amount)}
                </td>
                <td className="py-2.5 px-4 uppercase font-semibold text-[10px] text-gray-600">
                  {p.payment_method}
                </td>
                <td className="py-2.5 px-4 text-gray-600">
                  {p.payment_method === 'cash'
                    ? `Received by: ${p.received_by || 'Staff'}`
                    : `Txn: ${p.transaction_id || '-'}`}
                </td>
                <td className="py-2.5 px-4 text-gray-500">
                  {p.recorded_by_name || 'System Admin'}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {p.receipt_url && (
                      <a
                        href={p.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF4D00] hover:underline"
                        title="View Uploaded Proof in Vercel Blob"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Proof</span>
                      </a>
                    )}
                    <button
                      onClick={() => handleOpenReceipt(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                      title="Download Official Receipt (PDF / Image)"
                    >
                      <Receipt className="w-3 h-3 text-[#FF4D00]" />
                      <span>Download Receipt</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => setReceiptData(null)}
        data={receiptData}
      />
    </>
  );
}
