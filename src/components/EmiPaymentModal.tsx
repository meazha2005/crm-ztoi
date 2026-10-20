'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  UploadCloud,
  FileCheck,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { recordEmiPaymentAction } from '@/lib/actions';
import { Modal } from '@/components/Modal';

interface EmiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  emi: {
    id: number;
    emi_number: number;
    amount: number;
    paid_amount: number;
    due_date: string;
    project_code?: string;
    project_title?: string;
    client_name?: string;
  } | null;
}

export function EmiPaymentModal({ isOpen, onClose, emi }: EmiPaymentModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const total = Number(emi?.amount || 0);
  const currentPaid = Number(emi?.paid_amount || 0);
  const pending = Math.max(0, total - currentPaid);

  const [paymentAmount, setPaymentAmount] = useState<number>(pending);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'card' | 'other'
  >('upi');
  const [transactionId, setTransactionId] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Keep form fields synced whenever a new EMI is selected or modal opens
  useEffect(() => {
    if (emi && isOpen) {
      const emiTotal = Number(emi.amount || 0);
      const emiPaid = Number(emi.paid_amount || 0);
      setPaymentAmount(Math.max(0, emiTotal - emiPaid));
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('upi');
      setTransactionId('');
      setReceivedBy('');
      setReferenceNumber('');
      setReceiptUrl('');
      setNotes('');
      setError('');
      setLoading(false);
      setUploadingFile(false);
    }
  }, [emi, isOpen]);

  if (!isOpen || !emi) return null;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'payments');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload payment receipt');
      }

      setReceiptUrl(data.url);
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!emi) return;
    setError('');
    setLoading(true);

    try {
      if (!paymentAmount || paymentAmount <= 0) {
        throw new Error('Please enter a valid payment amount');
      }
      if (paymentAmount > pending + 0.01) {
        throw new Error(`Amount cannot exceed pending balance of ${formatCurrency(pending)}`);
      }
      if (paymentMethod === 'cash' && !receivedBy.trim()) {
        throw new Error('Please enter the name of the staff member who received the cash');
      }
      if (
        (paymentMethod === 'upi' || paymentMethod === 'bank_transfer') &&
        !transactionId.trim()
      ) {
        throw new Error('Please enter the Transaction ID / UTR Number for online payments');
      }

      const res = await recordEmiPaymentAction({
        emiId: emi.id,
        paymentAmount,
        paymentDate,
        paymentMethod,
        transactionId,
        receivedBy,
        referenceNumber,
        receipt_url: receiptUrl.trim() || undefined,
        notes,
      });

      if (!res.success) throw new Error(res.error || 'Payment failed');

      onClose();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Payment recording failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        emi.emi_number === 0
          ? 'Record Down Payment Receipt'
          : `Record Installment Payment • EMI #${emi.emi_number}`
      }
      maxWidth="md"
    >
      <form onSubmit={handlePayment} className="space-y-3.5">
        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* EMI Context Banner */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
          <div>
            <div className="font-semibold text-gray-900">
              {emi.project_code} • {emi.client_name}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Due Date: {formatDate(emi.due_date)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-gray-400">
              Pending Balance
            </div>
            <div className="text-sm font-michroma font-bold text-[#FF4D00]">
              {formatCurrency(pending)}
            </div>
          </div>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={pending}
              required
              value={paymentAmount || ''}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00] font-semibold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
            Payment Mode *
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          >
            <option value="upi">UPI / GPay / PhonePe</option>
            <option value="bank_transfer">Bank Transfer (NEFT / IMPS / RTGS)</option>
            <option value="cash">Cash in Hand</option>
            <option value="cheque">Bank Cheque / DD</option>
            <option value="card">Credit / Debit Card</option>
            <option value="other">Other Mode</option>
          </select>
        </div>

        {/* Dynamic Fields Based on Method */}
        {paymentMethod === 'cash' ? (
          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
              Received By (Staff Name) *
            </label>
            <input
              type="text"
              required
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Name of person who accepted cash"
              className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Transaction ID / UTR *
              </label>
              <input
                type="text"
                required
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="UTR / Txn Ref number"
                className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Optional bank ref / cheque no."
                className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>
        )}

        {/* Attach Payment Proof / Screenshot (Vercel Blob) */}
        <div>
          <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
            Attach Payment Proof / Screenshot (Optional)
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-lg text-xs font-medium text-gray-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {uploadingFile ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF4D00]" />
                  <span>Uploading to Vercel Blob...</span>
                </>
              ) : receiptUrl ? (
                <>
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold truncate">
                    Payment Proof Uploaded
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5 text-gray-500" />
                  <span>Upload Screenshot or PDF Receipt</span>
                </>
              )}
            </button>
          </div>
        </div>

        {receiptUrl && (
          <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
            <span className="text-emerald-800 font-medium truncate max-w-xs">
              Stored in Vercel Blob
            </span>
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-[#FF4D00] hover:underline shrink-0"
            >
              Preview File
            </a>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
            Payment Remarks / Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any verification note or remarks..."
            className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploadingFile}
            className="px-4 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Recording...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Payment</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
