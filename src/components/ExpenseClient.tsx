'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Receipt,
  Eye,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ExternalLink,
  UploadCloud,
  FileText,
  FileCheck,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createExpenseAction, deleteExpenseAction } from '@/lib/actions';
import { Modal } from '@/components/Modal';
import { ReceiptModal, ReceiptData } from '@/components/ReceiptModal';

interface ExpenseClientProps {
  expenses: any[];
  categories: Array<{ id: number; name: string }>;
}

export function ExpenseClient({ expenses, categories }: ExpenseClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewExpense, setViewExpense] = useState<any | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<number | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Form State
  const [categoryId, setCategoryId] = useState<number | ''>(
    categories[0]?.id || ''
  );
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<any>('upi');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [notes, setNotes] = useState('');

  // Delete State
  const [deleteReason, setDeleteReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'bills');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload bill to blob storage');
      }

      setReceiptUrl(data.url);
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!categoryId || !amount || amount <= 0 || !description.trim()) {
        throw new Error('Please fill in Category, Amount and Description');
      }

      const res = await createExpenseAction({
        category_id: Number(categoryId),
        expense_date: expenseDate,
        amount,
        description,
        payment_method: paymentMethod,
        receipt_url: receiptUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!res.success) throw new Error(res.error || 'Failed to add expense');

      setIsAddOpen(false);
      setDescription('');
      setAmount(0);
      setReceiptUrl('');
      setNotes('');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!deleteExpenseId || !deleteReason.trim()) return;
    setLoading(true);

    try {
      const res = await deleteExpenseAction(deleteExpenseId, deleteReason.trim());
      if (!res.success) throw new Error(res.error || 'Failed to delete expense');

      setDeleteExpenseId(null);
      setDeleteReason('');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  }

  function openReceiptModal(exp: any) {
    setReceiptData({
      type: 'expense',
      receiptNo: `EXP-${exp.id.toString().padStart(5, '0')}`,
      date: exp.expense_date,
      title: 'EXPENSE VOUCHER',
      partyName: exp.description,
      category: exp.category_name,
      description: exp.description,
      amount: exp.amount,
      paymentMethod: exp.payment_method,
      notes: exp.notes,
      attachedFileUrl: exp.receipt_url,
    });
  }

  return (
    <>
      <div className="flex items-center justify-between pb-1">
        <button
          onClick={() => {
            setError('');
            setReceiptUrl('');
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Mode</th>
                <th className="py-2.5 px-4">Bill File</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300 stroke-[1.5]" />
                    <p className="text-xs font-medium">No expenses recorded</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Record operational bills, subscriptions, and overheads
                    </p>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-medium text-gray-700 whitespace-nowrap">
                      {formatDate(exp.expense_date)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800">
                        {exp.category_name}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-gray-900 max-w-xs truncate">
                      {exp.description}
                    </td>
                    <td className="py-2.5 px-4 uppercase text-gray-500 text-[10px] font-mono">
                      {exp.payment_method?.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-4">
                      {exp.receipt_url ? (
                        <a
                          href={exp.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF4D00] hover:underline"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>View Stored</span>
                        </a>
                      ) : (
                        <span className="text-gray-300 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Download & View Voucher Button */}
                        <button
                          onClick={() => openReceiptModal(exp)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Generate & Download Official Voucher (PDF / Image)"
                        >
                          <Receipt className="w-3 h-3 text-[#FF4D00]" />
                          <span>Voucher</span>
                        </button>

                        <button
                          onClick={() => setViewExpense(exp)}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteReason('');
                            setDeleteExpenseId(exp.id);
                          }}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Voucher"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL 1: Record New Expense */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Record New Expense"
        maxWidth="md"
      >
        <form onSubmit={handleAddExpense} className="space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
              Expense Category *
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00] font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
              Description / Payee *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. AWS Cloud Hosting Bill / Office Internet"
              className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              >
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="bank_transfer">Bank Transfer / NetBanking</option>
                <option value="card">Company Debit / Credit Card</option>
                <option value="cash">Petty Cash</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Vercel Blob File Upload */}
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Attach Bill / Invoice File
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
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-lg text-xs font-medium text-gray-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {uploadingFile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF4D00]" />
                      <span>Uploading to Blob...</span>
                    </>
                  ) : receiptUrl ? (
                    <>
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold truncate">
                        File Attached
                      </span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5 text-gray-500" />
                      <span>Upload Bill / Slip</span>
                    </>
                  )}
                </button>
              </div>
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
              Internal Notes / Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved by Lead Architect"
              className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingFile}
              className="px-4 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Expense Voucher</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: View Expense Details */}
      <Modal
        isOpen={Boolean(viewExpense)}
        onClose={() => setViewExpense(null)}
        title="Expense Voucher Details"
        maxWidth="md"
      >
        {viewExpense && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
                  Category
                </span>
                <span className="font-bold text-gray-900 text-sm">
                  {viewExpense.category_name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
                  Amount
                </span>
                <span className="font-michroma font-bold text-base text-rose-600">
                  {formatCurrency(viewExpense.amount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
                  Date
                </span>
                <span className="font-medium text-gray-800">
                  {formatDate(viewExpense.expense_date)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
                  Payment Method
                </span>
                <span className="font-medium uppercase text-gray-800">
                  {viewExpense.payment_method?.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
                Description / Particulars
              </span>
              <p className="mt-0.5 text-gray-700 leading-relaxed">
                {viewExpense.description}
              </p>
            </div>

            {viewExpense.receipt_url && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#FF4D00]" />
                  <span className="font-medium text-gray-700">Attached Bill / Receipt</span>
                </div>
                <a
                  href={viewExpense.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF4D00] hover:underline"
                >
                  <span>Open Stored File</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {viewExpense.notes && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                  Internal Notes
                </span>
                <p className="text-gray-600">{viewExpense.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  const exp = viewExpense;
                  setViewExpense(null);
                  openReceiptModal(exp);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Download Printable Voucher (PDF / Image)</span>
              </button>

              <button
                onClick={() => setViewExpense(null)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: Delete Confirmation */}
      <Modal
        isOpen={Boolean(deleteExpenseId)}
        onClose={() => setDeleteExpenseId(null)}
        title="Delete Expense Record"
        maxWidth="sm"
      >
        <form onSubmit={handleDeleteExpense} className="space-y-3.5">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
            <p className="font-semibold">Soft-delete safeguard active</p>
            <p className="text-[11px] text-rose-600 leading-relaxed">
              This will mark the expense inactive and automatically soft-delete its corresponding debit entry in the General Ledger.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
              Audit Reason *
            </label>
            <textarea
              required
              rows={2}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g. Duplicate entry / Incorrect billing voucher"
              className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setDeleteExpenseId(null)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Delete</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Official Downloadable Voucher / Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => setReceiptData(null)}
        data={receiptData}
      />
    </>
  );
}
