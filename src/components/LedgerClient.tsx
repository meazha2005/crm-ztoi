'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  BookOpen,
  Eye,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { addManualIncomeAction, deleteLedgerEntryAction } from '@/lib/actions';
import { Modal } from '@/components/Modal';
import { ReceiptModal, ReceiptData } from '@/components/ReceiptModal';

interface LedgerClientProps {
  entries: any[];
  activeUsers: Array<{ id: number; full_name: string }>;
  currentUserName: string;
}

export function LedgerClient({
  entries,
  activeUsers,
  currentUserName,
}: LedgerClientProps) {
  const router = useRouter();

  // Modals state
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState<any | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<number | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  function openReceiptModal(item: any) {
    setReceiptData({
      type: item.type === 'income' ? 'income' : 'expense',
      receiptNo: `LED-${item.id.toString().padStart(5, '0')}`,
      date: item.transaction_date,
      title: item.type === 'income' ? 'OFFICIAL INCOME RECEIPT' : 'OFFICIAL PAYMENT VOUCHER',
      partyName: item.received_by || item.description,
      category: item.category,
      description: item.description,
      amount: Number(item.amount),
      paymentMethod: item.payment_method || 'Bank Transfer',
      transactionId: item.transaction_id,
      referenceNumber: item.reference_number,
      handledBy: item.received_by,
      notes: item.notes,
      attachedFileUrl: item.receipt_url,
    });
  }

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState('Consultation & Other');
  const [receivedBy, setReceivedBy] = useState(currentUserName);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<any>('upi');
  const [referenceNumber, setReferenceNumber] = useState('');

  // Delete State
  const [deleteReason, setDeleteReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAddIncome(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!amount || amount <= 0 || !description.trim()) {
        throw new Error('Please provide a valid amount and description');
      }

      const res = await addManualIncomeAction({
        transaction_date: date,
        amount,
        category,
        received_by: receivedBy,
        description,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
      });

      if (!res.success) throw new Error('Failed to record income');

      setIsAddIncomeOpen(false);
      setAmount(0);
      setDescription('');
      setReferenceNumber('');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!deleteEntryId || !deleteReason.trim()) return;
    setLoading(true);

    try {
      const res = await deleteLedgerEntryAction(deleteEntryId, deleteReason.trim());
      if (!res.success) throw new Error(res.error || 'Failed to delete ledger entry');

      setDeleteEntryId(null);
      setDeleteReason('');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between pb-1">
        <button
          onClick={() => {
            setError('');
            setIsAddIncomeOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Manual Income</span>
        </button>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">Reference</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No active ledger entries found.
                  </td>
                </tr>
              ) : (
                entries.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-gray-700 whitespace-nowrap">
                      {formatDate(item.transaction_date)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {item.type === 'income' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ArrowUpRight className="w-3 h-3" />
                          Income
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <ArrowDownRight className="w-3 h-3" />
                          Expense
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-gray-800 whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="py-2.5 px-4 text-gray-900 max-w-[220px] truncate">
                      {item.description}
                    </td>
                    <td className="py-2.5 px-4 font-michroma font-bold whitespace-nowrap">
                      <span className={item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                        {item.type === 'income' ? '+ ' : '- '}
                        {formatCurrency(item.amount)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">
                      {item.reference_type && item.reference_id ? (
                        <span className="font-mono text-[11px] text-gray-700">
                          {item.reference_type.toUpperCase()} #{item.reference_id}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">Manual Entry</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openReceiptModal(item)}
                          title="Generate & Download Official Receipt / Voucher"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <Receipt className="w-3 h-3 text-[#FF4D00]" />
                          <span>Receipt</span>
                        </button>
                        <button
                          onClick={() => setViewEntry(item)}
                          title="View Transaction"
                          className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteReason('');
                            setDeleteEntryId(item.id);
                          }}
                          title="Soft Delete"
                          className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Manual Income Modal */}
      <Modal
        isOpen={isAddIncomeOpen}
        onClose={() => setIsAddIncomeOpen(false)}
        title="Record Manual Agency Income"
        maxWidth="md"
      >
        <form onSubmit={handleAddIncome} className="space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Income Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00] font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Consultation / Web Audit / Refund"
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Received By (Staff Name)
              </label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Name of recipient"
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
              Description / Source *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Source of funds or project advance..."
              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              >
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Reference / UPI No.
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Transaction UTR / Reference"
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddIncomeOpen(false)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Record Income</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Ledger Entry Modal */}
      {viewEntry && (
        <Modal
          isOpen={Boolean(viewEntry)}
          onClose={() => setViewEntry(null)}
          title="Ledger Transaction Audit"
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Amount</span>
                <span
                  className={`font-michroma font-bold text-base ${
                    viewEntry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {viewEntry.type === 'income' ? '+ ' : '- '}
                  {formatCurrency(viewEntry.amount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Type</span>
                <span
                  className={`font-semibold capitalize text-xs ${
                    viewEntry.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {viewEntry.type}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Date:</span>
                <span className="font-semibold text-gray-900">{formatDate(viewEntry.transaction_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Category:</span>
                <span className="font-semibold text-gray-900">{viewEntry.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payment Mode:</span>
                <span className="font-medium uppercase text-gray-800">{viewEntry.payment_method}</span>
              </div>
              {viewEntry.received_by && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Recipient Staff:</span>
                  <span className="text-gray-900 font-medium">{viewEntry.received_by}</span>
                </div>
              )}
              {viewEntry.transaction_id && (
                <div className="flex justify-between font-mono">
                  <span className="text-gray-400">Transaction ID:</span>
                  <span className="text-gray-900">{viewEntry.transaction_id}</span>
                </div>
              )}
              {viewEntry.reference_number && (
                <div className="flex justify-between font-mono">
                  <span className="text-gray-400">Reference:</span>
                  <span className="text-gray-900">{viewEntry.reference_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Description:</span>
                <span className="font-semibold text-gray-900 max-w-[240px] text-right truncate">
                  {viewEntry.description}
                </span>
              </div>
              {viewEntry.notes && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-gray-400 block mb-0.5">Notes:</span>
                  <p className="text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">
                    {viewEntry.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setViewEntry(null)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Ledger Entry Modal */}
      {deleteEntryId && (
        <Modal
          isOpen={Boolean(deleteEntryId)}
          onClose={() => setDeleteEntryId(null)}
          title="Delete Ledger Entry"
          maxWidth="sm"
        >
          <form onSubmit={handleDeleteEntry} className="space-y-3 text-xs">
            <p className="text-gray-600">
              ⚠️ Warning: This will soft-delete the transaction and automatically revert any linked EMI payments or associated records.
            </p>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-700 mb-1">
                Mandatory Reason for Deletion *
              </label>
              <textarea
                required
                rows={2}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Erroneous transaction / Bank reconciliation adjustment..."
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeleteEntryId(null)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete Entry</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Downloadable Official Receipt / Voucher Modal */}
      <ReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => setReceiptData(null)}
        data={receiptData}
      />
    </>
  );
}
