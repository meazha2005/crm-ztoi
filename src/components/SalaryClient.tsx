'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Users2,
  Eye,
  Edit2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createSalaryAction, updateSalaryAction, paySalaryAction } from '@/lib/actions';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';

interface SalaryRecord {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_phone?: string;
  month_year: string;
  base_salary: number;
  bonus: number;
  deductions: number;
  net_salary: number;
  status: 'pending' | 'paid';
  payment_mode?: string;
  paid_date?: string;
  notes?: string;
  created_at: string;
}

interface SalaryClientProps {
  salaries: SalaryRecord[];
  activeUsers: Array<{ id: number; full_name: string; email: string }>;
}

export function SalaryClient({ salaries, activeUsers }: SalaryClientProps) {
  const router = useRouter();

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<SalaryRecord | null>(null);
  const [payRecord, setPayRecord] = useState<SalaryRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<SalaryRecord | null>(null);

  // Form states - Create
  const currentMonthYear = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [userId, setUserId] = useState<number>(activeUsers[0]?.id || 0);
  const [monthYear, setMonthYear] = useState(currentMonthYear);
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [bonus, setBonus] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Form states - Edit
  const [editBase, setEditBase] = useState<number>(0);
  const [editBonus, setEditBonus] = useState<number>(0);
  const [editDeductions, setEditDeductions] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');

  // Form states - Payout
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState('bank_transfer');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Net calculation helpers
  const calculatedCreateNet = Math.max(0, Number(baseSalary || 0) + Number(bonus || 0) - Number(deductions || 0));
  const calculatedEditNet = Math.max(0, Number(editBase || 0) + Number(editBonus || 0) - Number(editDeductions || 0));

  async function handleCreateSalary(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!userId || !monthYear || baseSalary <= 0) {
      setError('Please select an employee, valid month, and base salary > 0');
      return;
    }

    setLoading(true);
    try {
      const res = await createSalaryAction({
        user_id: userId,
        month_year: monthYear,
        base_salary: baseSalary,
        bonus,
        deductions,
        notes,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to generate salary record');
      }

      setIsAddOpen(false);
      setBaseSalary(0);
      setBonus(0);
      setDeductions(0);
      setNotes('');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateSalary(e: React.FormEvent) {
    e.preventDefault();
    if (!editRecord) return;
    setError('');

    setLoading(true);
    try {
      const res = await updateSalaryAction(editRecord.id, {
        base_salary: editBase,
        bonus: editBonus,
        deductions: editDeductions,
        notes: editNotes,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to update salary');
      }

      setEditRecord(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  async function handlePaySalary(e: React.FormEvent) {
    e.preventDefault();
    if (!payRecord) return;
    setError('');

    setLoading(true);
    try {
      const res = await paySalaryAction(payRecord.id, payDate, payMode);
      if (!res.success) {
        throw new Error(res.error || 'Failed to process salary payout');
      }

      setPayRecord(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Payout failed');
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
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Salary Voucher</span>
        </button>
      </div>

      {/* Salary Records Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4">Month</th>
                <th className="py-2.5 px-4 text-right">Base Salary</th>
                <th className="py-2.5 px-4 text-right">Bonus</th>
                <th className="py-2.5 px-4 text-right">Deductions</th>
                <th className="py-2.5 px-4 text-right">Net Payable</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salaries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Users2 className="w-8 h-8 mx-auto mb-2 text-gray-300 stroke-[1.5]" />
                    <p className="text-xs font-medium">No salary records generated yet</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Generate monthly payroll vouchers for team members
                    </p>
                  </td>
                </tr>
              ) : (
                salaries.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-gray-900">{s.user_name}</div>
                      <div className="text-[10px] text-gray-400">{s.user_email}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-gray-700">
                      {s.month_year}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-gray-600">
                      {formatCurrency(s.base_salary)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600">
                      {s.bonus > 0 ? `+${formatCurrency(s.bonus)}` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-600">
                      {s.deductions > 0 ? `-${formatCurrency(s.deductions)}` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">
                      {formatCurrency(s.net_salary)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <Badge
                        variant={s.status === 'paid' ? 'success' : 'warning'}
                      >
                        {s.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewRecord(s)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {s.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setError('');
                                setEditRecord(s);
                                setEditBase(s.base_salary);
                                setEditBonus(s.bonus);
                                setEditDeductions(s.deductions);
                                setEditNotes(s.notes || '');
                              }}
                              className="p-1.5 text-gray-400 hover:text-[#FF4D00] hover:bg-[#FF4D00]/5 rounded-md transition-colors"
                              title="Edit Salary"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setError('');
                                setPayRecord(s);
                                setPayDate(new Date().toISOString().split('T')[0]);
                                setPayMode('bank_transfer');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-[11px] font-semibold transition-colors"
                              title="Disburse / Pay Salary"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Disburse</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Generate Salary Voucher */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Generate Salary Voucher"
      >
        <form onSubmit={handleCreateSalary} className="space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Select Employee *
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            >
              {activeUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Salary Month (YYYY-MM) *
            </label>
            <input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Base Salary (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={baseSalary || ''}
                onChange={(e) => setBaseSalary(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Bonus / Inc (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bonus || ''}
                onChange={(e) => setBonus(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Deductions (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={deductions || ''}
                onChange={(e) => setDeductions(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          {/* Calculated Net Preview */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-600">Net Payable Salary:</span>
            <span className="font-michroma text-base font-bold text-gray-900">
              {formatCurrency(calculatedCreateNet)}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Notes / Particulars (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Performance incentive for Q3 deliverable"
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Voucher</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Edit Salary Record */}
      <Modal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title={`Edit Salary: ${editRecord?.user_name} (${editRecord?.month_year})`}
      >
        <form onSubmit={handleUpdateSalary} className="space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Base Salary (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editBase || ''}
                onChange={(e) => setEditBase(parseFloat(e.target.value) || 0)}
                required
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Bonus / Inc (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editBonus || ''}
                onChange={(e) => setEditBonus(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Deductions (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editDeductions || ''}
                onChange={(e) => setEditDeductions(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-600">Updated Net Payable:</span>
            <span className="font-michroma text-base font-bold text-gray-900">
              {formatCurrency(calculatedEditNet)}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setEditRecord(null)}
              className="px-3.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Disburse Salary Payout */}
      <Modal
        isOpen={!!payRecord}
        onClose={() => setPayRecord(null)}
        title="Disburse Salary Payout"
      >
        <form onSubmit={handlePaySalary} className="space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-emerald-800 font-semibold">{payRecord?.user_name}</span>
              <span className="font-mono text-emerald-700">{payRecord?.month_year}</span>
            </div>
            <div className="text-xl font-michroma font-bold text-emerald-900">
              {formatCurrency(payRecord?.net_salary || 0)}
            </div>
            <p className="text-[11px] text-emerald-700">
              Disbursing will finalize this salary voucher and automatically record an expense debit in the General Ledger.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Disbursement Date *
            </label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Payment Mode *
            </label>
            <select
              value={payMode}
              onChange={(e) => setPayMode(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            >
              <option value="bank_transfer">Bank Transfer / NEFT / IMPS</option>
              <option value="upi">UPI / GPay / PhonePe</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setPayRecord(null)}
              className="px-3.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm & Disburse</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: View Salary Details */}
      <Modal
        isOpen={!!viewRecord}
        onClose={() => setViewRecord(null)}
        title="Salary Voucher Details"
      >
        {viewRecord && (
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <div className="font-semibold text-gray-900 text-sm">{viewRecord.user_name}</div>
                <div className="text-[11px] text-gray-500">{viewRecord.user_email}</div>
              </div>
              <Badge variant={viewRecord.status === 'paid' ? 'success' : 'warning'}>
                {viewRecord.status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-gray-50/50 rounded-lg border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Month</span>
                <span className="font-mono font-medium text-gray-800">{viewRecord.month_year}</span>
              </div>
              <div className="p-2.5 bg-gray-50/50 rounded-lg border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Base Salary</span>
                <span className="font-mono font-medium text-gray-800">{formatCurrency(viewRecord.base_salary)}</span>
              </div>
              <div className="p-2.5 bg-gray-50/50 rounded-lg border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Bonus / Incentive</span>
                <span className="font-mono font-medium text-emerald-700">+{formatCurrency(viewRecord.bonus)}</span>
              </div>
              <div className="p-2.5 bg-gray-50/50 rounded-lg border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Deductions</span>
                <span className="font-mono font-medium text-rose-700">-{formatCurrency(viewRecord.deductions)}</span>
              </div>
            </div>

            <div className="p-3 bg-orange-50/40 border border-[#FF4D00]/20 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-gray-800">Net Disbursed Amount:</span>
              <span className="font-michroma text-base font-bold text-[#FF4D00]">
                {formatCurrency(viewRecord.net_salary)}
              </span>
            </div>

            {viewRecord.status === 'paid' && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
                <div className="text-[11px] text-gray-500">
                  Paid Date: <strong className="text-gray-800">{formatDate(viewRecord.paid_date)}</strong>
                </div>
                <div className="text-[11px] text-gray-500">
                  Payment Mode: <strong className="text-gray-800 uppercase">{viewRecord.payment_mode || 'Bank'}</strong>
                </div>
              </div>
            )}

            {viewRecord.notes && (
              <div className="p-2.5 bg-gray-50/50 rounded-lg border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Notes</span>
                <p className="text-gray-700 mt-0.5">{viewRecord.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setViewRecord(null)}
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
