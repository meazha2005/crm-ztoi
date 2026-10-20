'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FolderKanban,
  ArrowLeft,
  Calendar,
  CreditCard,
  User,
  Users,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Repeat,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { formatCurrency, formatDate, calculateEmiSchedule, addMonthsSafely, formatFrequency, calculateNextMaintenanceDueDate } from '@/lib/utils';
import { createProjectAction, updateProjectAction } from '@/lib/actions';

interface ProjectFormProps {
  initialData?: any;
  teamMembers: Array<{ id: number; full_name: string; role: string }>;
  assignedUserIds?: number[];
}

export function ProjectForm({
  initialData,
  teamMembers,
  assignedUserIds = [],
}: ProjectFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData?.id);

  // Form State
  const [clientName, setClientName] = useState(initialData?.client_name || '');
  const [clientEmail, setClientEmail] = useState(initialData?.client_email || '');
  const [clientPhone, setClientPhone] = useState(initialData?.client_phone || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [startDate, setStartDate] = useState(
    initialData?.start_date
      ? new Date(initialData.start_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [deadlineDate, setDeadlineDate] = useState(
    initialData?.deadline_date
      ? new Date(initialData.deadline_date).toISOString().split('T')[0]
      : ''
  );
  const [status, setStatus] = useState(initialData?.status || 'new');
  const [priority, setPriority] = useState(initialData?.priority || 'medium');

  // Payment configuration
  const [paymentType, setPaymentType] = useState<'one_time' | 'emi' | 'undecided'>(
    initialData?.payment_type || 'one_time'
  );
  const [totalAmount, setTotalAmount] = useState<number>(
    initialData?.total_amount ? Number(initialData.total_amount) : 0
  );
  const [initialPayment, setInitialPayment] = useState<number>(
    initialData?.initial_payment ? Number(initialData.initial_payment) : 0
  );
  const [initialPaymentMode, setInitialPaymentMode] = useState(
    initialData?.initial_payment_mode || 'upi'
  );
  const [initialPaymentReceivedBy, setInitialPaymentReceivedBy] = useState<number | ''>(
    initialData?.initial_payment_received_by || ''
  );
  const [emiCount, setEmiCount] = useState<number>(initialData?.emi_count || 3);
  const [emiFrequency, setEmiFrequency] = useState<number>(initialData?.emi_frequency || 1);
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>(
    initialData?.first_payment_date || addMonthsSafely(startDate, 1)
  );

  // Maintenance fee configuration
  const [hasMaintenance, setHasMaintenance] = useState<boolean>(
    Boolean(initialData?.has_maintenance)
  );
  const [maintenanceAmount, setMaintenanceAmount] = useState<number>(
    initialData?.maintenance_amount ? Number(initialData.maintenance_amount) : 0
  );
  const [maintenanceFrequency, setMaintenanceFrequency] = useState<
    'monthly' | '2_months' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom'
  >(initialData?.maintenance_frequency || 'monthly');
  const [maintenanceCustomDays, setMaintenanceCustomDays] = useState<number>(
    initialData?.maintenance_custom_days ? Number(initialData.maintenance_custom_days) : 30
  );
  const [maintenanceStartDate, setMaintenanceStartDate] = useState<string>(
    initialData?.maintenance_start_date
      ? new Date(initialData.maintenance_start_date).toISOString().split('T')[0]
      : (deadlineDate || startDate || new Date().toISOString().split('T')[0])
  );
  const [maintenanceStatus, setMaintenanceStatus] = useState<'active' | 'paused' | 'cancelled'>(
    initialData?.maintenance_status || 'active'
  );

  // Assigned team members
  const [selectedUsers, setSelectedUsers] = useState<number[]>(assignedUserIds);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Real-time EMI schedule calculation
  const emiSchedule = useMemo(() => {
    if (paymentType !== 'emi' && paymentType !== 'one_time') return [];
    return calculateEmiSchedule({
      totalAmount,
      initialPayment,
      emiCount: paymentType === 'one_time' ? 1 : emiCount,
      emiFrequency,
      startDate,
      firstInstallmentDate: firstPaymentDate,
    });
  }, [totalAmount, initialPayment, emiCount, emiFrequency, startDate, firstPaymentDate, paymentType]);

  const remainingBalance = Math.max(0, totalAmount - initialPayment);

  function toggleUser(uid: number) {
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!title.trim() || !clientName.trim() || !startDate || !deadlineDate) {
        throw new Error('Please fill in all required fields (Client Name, Title, Dates)');
      }

      if (hasMaintenance && (!maintenanceAmount || maintenanceAmount <= 0)) {
        throw new Error('Please enter a valid Maintenance Fee amount');
      }

      const payload = {
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        title,
        description,
        total_amount: totalAmount,
        initial_payment: initialPayment,
        initial_payment_mode: initialPaymentMode,
        initial_payment_received_by: initialPaymentReceivedBy ? Number(initialPaymentReceivedBy) : undefined,
        payment_type: paymentType,
        has_maintenance: hasMaintenance,
        maintenance_amount: hasMaintenance ? maintenanceAmount : 0,
        maintenance_frequency: maintenanceFrequency,
        maintenance_custom_days: maintenanceFrequency === 'custom' ? maintenanceCustomDays : undefined,
        maintenance_start_date: hasMaintenance ? (maintenanceStartDate || deadlineDate || startDate) : undefined,
        maintenance_status: maintenanceStatus,
        emi_count: emiCount,
        emi_frequency: emiFrequency,
        first_payment_date: firstPaymentDate,
        start_date: startDate,
        deadline_date: deadlineDate,
        status,
        priority,
        notes,
        assigned_users: selectedUsers,
      };

      if (isEditing) {
        const res = await updateProjectAction(initialData.id, payload as any);
        if (!res.success) throw new Error(res.error || 'Failed to update project');
        router.push(`/projects/${initialData.id}`);
      } else {
        const res = await createProjectAction(payload as any);
        if (!res.success) throw new Error(res.error || 'Failed to create project');
        router.push(`/projects/${res.projectId}`);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <Link
            href="/projects"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="font-michroma text-sm sm:text-base font-bold text-gray-900 tracking-wide">
              {isEditing ? `Edit Project: ${initialData.project_code}` : 'Create New Project'}
            </h2>
            <p className="text-[11px] text-gray-500">
              Configure project scope, client contact and dynamic payment terms
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Client Information */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-xs font-michroma font-bold text-gray-900 uppercase tracking-wide">
            <User className="w-4 h-4 text-[#FF4D00]" />
            <span>Client Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Corp / John Doe"
                className="w-full px-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Client Email
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full px-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Client Phone
              </label>
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Project Specifications */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-xs font-michroma font-bold text-gray-900 uppercase tracking-wide">
            <FolderKanban className="w-4 h-4 text-[#FF4D00]" />
            <span>Project Scope & Timeline</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Project Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Full-Stack Web App Development"
                className="w-full px-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Outline project deliverables, requirements, and tech stack..."
                className="w-full px-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                  Deadline Date *
                </label>
                <input
                  type="date"
                  required
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Payment Configuration & EMI Calculator */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-michroma font-bold text-gray-900 uppercase tracking-wide">
              <CreditCard className="w-4 h-4 text-[#FF4D00]" />
              <span>Payment Terms & EMI Schedule</span>
            </div>
            {totalAmount > 0 && (
              <span className="text-xs font-bold font-michroma text-[#FF4D00]">
                Balance: {formatCurrency(remainingBalance)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Payment Type *
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              >
                <option value="one_time">One-time Payment</option>
                <option value="emi">EMI Installment Plan</option>
                <option value="undecided">Undecided / Later</option>
              </select>
            </div>

            {paymentType !== 'undecided' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                    Total Project Value (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={totalAmount || ''}
                    onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                    Initial / Down Payment (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    step="0.01"
                    value={initialPayment || ''}
                    onChange={(e) => setInitialPayment(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>
              </>
            )}
          </div>

          {paymentType !== 'undecided' && initialPayment > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-gray-50/70 rounded-lg border border-gray-100">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                  Down Payment Mode
                </label>
                <select
                  value={initialPaymentMode}
                  onChange={(e) => setInitialPaymentMode(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                >
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                  Down Payment Received By
                </label>
                <select
                  value={initialPaymentReceivedBy}
                  onChange={(e) => setInitialPaymentReceivedBy(Number(e.target.value) || '')}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                >
                  <option value="">Select Staff Member</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.role === 'admin' ? 'Admin' : 'Team'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {paymentType === 'emi' && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                    Number of Installments
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={emiCount}
                    onChange={(e) => setEmiCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                    Frequency
                  </label>
                  <select
                    value={emiFrequency}
                    onChange={(e) => setEmiFrequency(parseInt(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                  >
                    <option value="1">Monthly (Every Month)</option>
                    <option value="2">Bi-Monthly (Every 2 Months)</option>
                    <option value="3">Quarterly (Every 3 Months)</option>
                    <option value="6">Semi-Annually (Every 6 Months)</option>
                    <option value="12">Annually (Every Year)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                    1st Installment Due Date
                  </label>
                  <input
                    type="date"
                    value={firstPaymentDate}
                    onChange={(e) => setFirstPaymentDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>
              </div>

              {/* Dynamic Live Schedule Preview Box */}
              {emiSchedule.length > 0 && (
                <div className="bg-gray-50/80 rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider font-michroma">
                      Payment Schedule Preview
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {emiSchedule.length} total installment(s)
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-200 text-xs">
                    {emiSchedule.map((item, idx) => (
                      <div
                        key={idx}
                        className="py-1.5 px-2 flex items-center justify-between hover:bg-white rounded transition-colors"
                      >
                        <span className="font-medium text-gray-700">
                          {item.isDownPayment ? 'Initial Down Payment' : `Installment #${item.emiNumber}`}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">{formatDate(item.dueDate)}</span>
                          <span className="font-michroma font-bold text-gray-900">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section: Recurring Maintenance Fee Contract */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#FF4D00]/10 text-[#FF4D00]">
                <Repeat className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-michroma font-bold text-gray-900 uppercase tracking-wide">
                  Recurring Maintenance Fee (AMC / Retainer)
                </h3>
                <p className="text-[11px] text-gray-500">
                  Enable recurring maintenance, cloud hosting, or SLA retainer billing
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <span className="text-xs font-semibold text-gray-700">
                {hasMaintenance ? (
                  <span className="text-[#FF4D00] font-bold">Enabled</span>
                ) : (
                  <span className="text-gray-400">Disabled</span>
                )}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={hasMaintenance}
                onClick={() => setHasMaintenance(!hasMaintenance)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hasMaintenance ? 'bg-[#FF4D00]' : 'bg-gray-200'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    hasMaintenance ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {hasMaintenance && (
            <div className="space-y-4 animate-in fade-in-50 duration-200 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* 1. Maintenance Amount */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                    Maintenance Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-gray-500 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required={hasMaintenance}
                      value={maintenanceAmount || ''}
                      onChange={(e) => setMaintenanceAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                    />
                  </div>
                </div>

                {/* 2. Billing Frequency */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                    Billing Cycle / Frequency *
                  </label>
                  <select
                    value={maintenanceFrequency}
                    onChange={(e) => setMaintenanceFrequency(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                  >
                    <option value="monthly">Monthly (Every 1 Month)</option>
                    <option value="2_months">Every 2 Months</option>
                    <option value="quarterly">Quarterly (Every 3 Months)</option>
                    <option value="half_yearly">Half-Yearly (Every 6 Months)</option>
                    <option value="yearly">Yearly (Every 12 Months)</option>
                    <option value="custom">Custom Day Count</option>
                  </select>
                </div>

                {/* 3. Custom Days or Start Date */}
                {maintenanceFrequency === 'custom' ? (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                      Custom Interval (Number of Days) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="730"
                      required={hasMaintenance && maintenanceFrequency === 'custom'}
                      value={maintenanceCustomDays || ''}
                      onChange={(e) => setMaintenanceCustomDays(parseInt(e.target.value) || 30)}
                      placeholder="e.g. 45"
                      className="w-full px-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                      Maintenance Start / First Due Date *
                    </label>
                    <input
                      type="date"
                      required={hasMaintenance}
                      value={maintenanceStartDate}
                      onChange={(e) => setMaintenanceStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                    />
                  </div>
                )}
              </div>

              {/* Extra row when custom days is selected */}
              {maintenanceFrequency === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                      Maintenance Start / First Due Date *
                    </label>
                    <input
                      type="date"
                      required={hasMaintenance}
                      value={maintenanceStartDate}
                      onChange={(e) => setMaintenanceStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                      Contract Status
                    </label>
                    <select
                      value={maintenanceStatus}
                      onChange={(e) => setMaintenanceStatus(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                    >
                      <option value="active">Active Retainer</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Live Contract Summary Card */}
              {maintenanceAmount > 0 && (
                <div className="p-3 bg-orange-50/50 rounded-xl border border-[#FF4D00]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-0.5">
                      Configured Maintenance Cycle
                    </span>
                    <p className="text-gray-800">
                      Client will be billed <span className="font-michroma font-bold text-[#FF4D00]">{formatCurrency(maintenanceAmount)}</span> on a <span className="font-semibold text-gray-900">{formatFrequency(maintenanceFrequency, maintenanceCustomDays)}</span> cycle.
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-[#FF4D00]/20 text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      First Due Date
                    </span>
                    <span className="font-mono font-bold text-gray-900 text-xs">
                      {formatDate(maintenanceStartDate)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Team Member Assignments */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-michroma font-bold text-gray-900 uppercase tracking-wide">
              <Users className="w-4 h-4 text-[#FF4D00]" />
              <span>Assigned Team Members</span>
            </div>
            <span className="text-xs text-gray-400">
              {selectedUsers.length} member(s) selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {teamMembers.map((member) => {
              const isSelected = selectedUsers.includes(member.id);
              return (
                <label
                  key={member.id}
                  onClick={() => toggleUser(member.id)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#FF4D00] bg-[#FF4D00]/5 text-gray-900 font-semibold'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isSelected ? 'bg-[#FF4D00] text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {member.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{member.full_name}</span>
                  </div>
                  {member.role === 'admin' ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-900 text-white font-medium uppercase shrink-0">
                      Admin
                    </span>
                  ) : (
                    <span className="text-[9px] text-gray-400 uppercase shrink-0">Team</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Section 5: Internal Notes */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <label className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
            Internal Notes & Client Remarks
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key agreements, payment terms remarks, client preferences..."
            className="w-full px-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
          />
        </div>

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Link
            href={isEditing ? `/projects/${initialData.id}` : '/projects'}
            className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-michroma font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditing ? 'Save Changes' : 'Create Project'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
