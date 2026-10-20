'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Repeat,
  ShieldCheck,
  CreditCard,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Receipt,
  Download,
  ExternalLink,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Paperclip,
  ArrowUpRight,
  Check,
  Building,
  User,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  formatFrequency,
  calculateNextMaintenanceDueDate,
  calculatePeriodEnd,
} from '@/lib/utils';
import {
  recordMaintenancePaymentAction,
  updateMaintenanceTermsAction,
  deleteMaintenancePaymentAction,
} from '@/lib/actions';
import { Modal } from '@/components/Modal';
import { ReceiptModal, ReceiptData } from '@/components/ReceiptModal';
import { Badge } from '@/components/Badge';

interface MaintenanceProject {
  id: number;
  project_code: string;
  title: string;
  client_name: string;
  client_phone?: string | null;
  client_email?: string | null;
  total_amount: number;
  has_maintenance: number;
  maintenance_amount: number;
  maintenance_frequency: string;
  maintenance_custom_days?: number | null;
  maintenance_start_date?: string | null;
  maintenance_next_due_date?: string | null;
  maintenance_status: string;
  payment_count?: number;
  total_collected?: number;
  last_payment_date?: string | null;
}

interface MaintenancePaymentRecord {
  id: number;
  project_id: number;
  project_code: string;
  project_title: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  amount: number;
  billing_period_start?: string | null;
  billing_period_end?: string | null;
  payment_date: string;
  due_date?: string | null;
  payment_method: string;
  transaction_id?: string | null;
  reference_number?: string | null;
  received_by?: string | null;
  receipt_url?: string | null;
  ledger_id?: number | null;
  status: string;
  notes?: string | null;
  created_by_name?: string | null;
}

interface MaintenanceClientProps {
  maintenanceProjects: MaintenanceProject[];
  payments: MaintenancePaymentRecord[];
  allProjects: any[];
  teamMembers: Array<{ id: number; full_name: string; role: string }>;
  currentUserId: number;
}

export function MaintenanceClient({
  maintenanceProjects,
  payments,
  allProjects,
  teamMembers,
  currentUserId,
}: MaintenanceClientProps) {
  // Navigation & Filter state
  const [activeTab, setActiveTab] = useState<'contracts' | 'history'>('contracts');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  // Receipt Modal state
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Collection Form state
  const [selectedProjectId, setSelectedProjectId] = useState<number>(0);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectPaymentDate, setCollectPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [billingPeriodStart, setBillingPeriodStart] = useState<string>('');
  const [billingPeriodEnd, setBillingPeriodEnd] = useState<string>('');
  const [collectPaymentMethod, setCollectPaymentMethod] = useState<
    'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'card' | 'other'
  >('upi');
  const [collectTransactionId, setCollectTransactionId] = useState('');
  const [collectReferenceNumber, setCollectReferenceNumber] = useState('');
  const [collectReceivedBy, setCollectReceivedBy] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [advanceNextDueDate, setAdvanceNextDueDate] = useState(true);
  const [collectProofUrl, setCollectProofUrl] = useState('');
  const [proofUploading, setProofUploading] = useState(false);
  const [collectLoading, setCollectLoading] = useState(false);
  const [collectError, setCollectError] = useState('');

  // Terms Edit Form state
  const [editHasMaintenance, setEditHasMaintenance] = useState(true);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editFrequency, setEditFrequency] = useState<string>('monthly');
  const [editCustomDays, setEditCustomDays] = useState<number>(30);
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editNextDueDate, setEditNextDueDate] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState('');

  const proofFileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to open Collection modal for a specific project
  function openCollectModal(project?: any) {
    const target = project || maintenanceProjects[0] || allProjects[0];
    if (!target) return;

    setSelectedProjectId(target.id);
    setCollectAmount(Number(target.maintenance_amount || 0));
    setCollectPaymentDate(todayStr);

    const baseStart = target.maintenance_next_due_date || target.maintenance_start_date || todayStr;
    setBillingPeriodStart(baseStart);
    setBillingPeriodEnd(
      calculatePeriodEnd(baseStart, target.maintenance_frequency || 'monthly', target.maintenance_custom_days)
    );

    setCollectPaymentMethod('upi');
    setCollectTransactionId('');
    setCollectReferenceNumber('');
    setCollectReceivedBy('');
    setCollectNotes('');
    setAdvanceNextDueDate(true);
    setCollectProofUrl('');
    setCollectError('');
    setIsCollectModalOpen(true);
  }

  // Helper when changing selected project in collection modal
  function handleSelectProject(projId: number) {
    setSelectedProjectId(projId);
    const p = allProjects.find((x) => x.id === projId);
    if (p) {
      setCollectAmount(Number(p.maintenance_amount || 0));
      const baseStart = p.maintenance_next_due_date || p.maintenance_start_date || todayStr;
      setBillingPeriodStart(baseStart);
      setBillingPeriodEnd(
        calculatePeriodEnd(baseStart, p.maintenance_frequency || 'monthly', p.maintenance_custom_days)
      );
    }
  }

  // Helper to open Terms Edit modal
  function openTermsModal(project: any) {
    setSelectedProject(project);
    setEditHasMaintenance(Boolean(project.has_maintenance));
    setEditAmount(Number(project.maintenance_amount || 0));
    setEditFrequency(project.maintenance_frequency || 'monthly');
    setEditCustomDays(Number(project.maintenance_custom_days || 30));
    setEditStartDate(
      project.maintenance_start_date
        ? new Date(project.maintenance_start_date).toISOString().split('T')[0]
        : todayStr
    );
    setEditNextDueDate(
      project.maintenance_next_due_date
        ? new Date(project.maintenance_next_due_date).toISOString().split('T')[0]
        : todayStr
    );
    setEditStatus(project.maintenance_status || 'active');
    setTermsError('');
    setIsTermsModalOpen(true);
  }

  // Handle Proof Upload to Vercel Blob
  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setCollectError('Proof file must be under 10 MB');
      return;
    }

    setProofUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'maintenance_receipts');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload document');
      }

      setCollectProofUrl(data.url);
    } catch (err: any) {
      setCollectError(err.message || 'File upload failed');
    } finally {
      setProofUploading(false);
      if (proofFileInputRef.current) proofFileInputRef.current.value = '';
    }
  }

  // Submit Collection
  async function handleCollectSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCollectError('');
    setCollectLoading(true);

    try {
      if (!selectedProjectId) throw new Error('Please select a project');
      if (collectAmount <= 0) throw new Error('Please enter a valid collection amount');
      if (!collectPaymentDate) throw new Error('Payment date is required');

      const res = await recordMaintenancePaymentAction({
        projectId: selectedProjectId,
        amount: collectAmount,
        paymentDate: collectPaymentDate,
        billingPeriodStart: billingPeriodStart || undefined,
        billingPeriodEnd: billingPeriodEnd || undefined,
        paymentMethod: collectPaymentMethod,
        transactionId: collectTransactionId || undefined,
        referenceNumber: collectReferenceNumber || undefined,
        receivedBy: collectReceivedBy || undefined,
        receipt_url: collectProofUrl || undefined,
        notes: collectNotes || undefined,
        advanceNextDueDate,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to record maintenance payment');
      }

      setIsCollectModalOpen(false);

      // Open digital receipt voucher
      if (res.receiptData) {
        setReceiptData(res.receiptData);
        setIsReceiptOpen(true);
      }
    } catch (err: any) {
      setCollectError(err.message || 'Operation failed');
    } finally {
      setCollectLoading(false);
    }
  }

  // Submit Terms Update
  async function handleTermsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject) return;

    setTermsError('');
    setTermsLoading(true);

    try {
      const res = await updateMaintenanceTermsAction(selectedProject.id, {
        has_maintenance: editHasMaintenance,
        maintenance_amount: editHasMaintenance ? editAmount : 0,
        maintenance_frequency: editFrequency as any,
        maintenance_custom_days: editFrequency === 'custom' ? editCustomDays : undefined,
        maintenance_start_date: editStartDate || undefined,
        maintenance_next_due_date: editNextDueDate || undefined,
        maintenance_status: editStatus as any,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to update maintenance terms');
      }

      setIsTermsModalOpen(false);
    } catch (err: any) {
      setTermsError(err.message || 'Operation failed');
    } finally {
      setTermsLoading(false);
    }
  }

  // Delete Payment Record
  async function handleDeletePayment(payment: MaintenancePaymentRecord) {
    if (
      !confirm(
        `Are you sure you want to delete maintenance voucher ${payment.id} (₹${payment.amount})? This will also archive its General Ledger entry.`
      )
    ) {
      return;
    }

    try {
      const res = await deleteMaintenancePaymentAction(payment.id, 'Deleted by administrator');
      if (!res.success) {
        alert(res.error || 'Failed to delete payment');
      }
    } catch (err: any) {
      alert(err.message || 'Delete operation failed');
    }
  }

  // Open existing payment voucher receipt
  function openPaymentReceipt(payment: MaintenancePaymentRecord) {
    const periodDesc = payment.billing_period_start
      ? ` (${formatDate(payment.billing_period_start)}${payment.billing_period_end ? ' to ' + formatDate(payment.billing_period_end) : ''})`
      : '';

    setReceiptData({
      type: 'income',
      receiptNo: `MNT-${String(payment.id).padStart(5, '0')}`,
      date: payment.payment_date,
      title: 'Maintenance Fee Collection Voucher',
      partyName: payment.client_name,
      partyContact: payment.client_phone || payment.client_email,
      projectCode: payment.project_code,
      projectTitle: payment.project_title,
      category: 'Maintenance Fee',
      description: `Maintenance fee retainer payment${periodDesc}`,
      amount: Number(payment.amount),
      paymentMethod: payment.payment_method,
      transactionId: payment.transaction_id || undefined,
      referenceNumber: payment.reference_number || undefined,
      handledBy: payment.received_by || payment.created_by_name || undefined,
      notes: payment.notes || undefined,
      attachedFileUrl: payment.receipt_url || undefined,
    });
    setIsReceiptOpen(true);
  }

  // KPI Calculations
  const activeContractsCount = useMemo(
    () => maintenanceProjects.filter((p) => p.maintenance_status === 'active').length,
    [maintenanceProjects]
  );

  const totalCollectedSum = useMemo(
    () => payments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0),
    [payments]
  );

  const overdueProjects = useMemo(
    () =>
      maintenanceProjects.filter(
        (p) =>
          p.maintenance_status === 'active' &&
          p.maintenance_next_due_date &&
          p.maintenance_next_due_date <= todayStr
      ),
    [maintenanceProjects, todayStr]
  );

  const monthlyRunRate = useMemo(() => {
    return maintenanceProjects
      .filter((p) => p.maintenance_status === 'active')
      .reduce((sum, p) => {
        const amt = Number(p.maintenance_amount || 0);
        switch (p.maintenance_frequency) {
          case 'monthly':
            return sum + amt;
          case '2_months':
            return sum + amt / 2;
          case 'quarterly':
            return sum + amt / 3;
          case 'half_yearly':
            return sum + amt / 6;
          case 'yearly':
            return sum + amt / 12;
          case 'custom':
            const days = Number(p.maintenance_custom_days) || 30;
            return sum + (amt / days) * 30;
          default:
            return sum + amt;
        }
      }, 0);
  }, [maintenanceProjects]);

  // Filtering contracts
  const filteredContracts = useMemo(() => {
    return maintenanceProjects.filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        p.project_code.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q) ||
        (p.client_phone && p.client_phone.includes(q)) ||
        (p.client_email && p.client_email.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') return p.maintenance_status === 'active';
      if (statusFilter === 'paused') return p.maintenance_status === 'paused';
      if (statusFilter === 'overdue') {
        return (
          p.maintenance_status === 'active' &&
          p.maintenance_next_due_date &&
          p.maintenance_next_due_date <= todayStr
        );
      }
      return true;
    });
  }, [maintenanceProjects, searchTerm, statusFilter, todayStr]);

  // Filtering payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchTerm.toLowerCase();
      return (
        !q ||
        p.project_code.toLowerCase().includes(q) ||
        p.project_title.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q) ||
        (p.transaction_id && p.transaction_id.toLowerCase().includes(q)) ||
        (p.reference_number && p.reference_number.toLowerCase().includes(q))
      );
    });
  }, [payments, searchTerm]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-michroma text-base sm:text-lg font-bold text-gray-900 tracking-wide">
              Maintenance Fee Collection
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF4D00]/10 text-[#FF4D00] border border-[#FF4D00]/20">
              SLA / AMC Retainer
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Collect recurring maintenance fees, manage billing schedules, and export payment vouchers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openCollectModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Collection</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Active Retainers */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Retainers</span>
            <div className="p-1 rounded-md bg-orange-50 text-[#FF4D00]">
              <Repeat className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-michroma text-lg sm:text-xl font-bold text-gray-900">
            {activeContractsCount}
          </div>
          <span className="text-[10px] text-gray-400">Total contracts configured</span>
        </div>

        {/* 2. Monthly Run-Rate (MRR) */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Normalized MRR</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-michroma text-lg sm:text-xl font-bold text-emerald-600">
            {formatCurrency(monthlyRunRate)}
          </div>
          <span className="text-[10px] text-gray-400">Monthly recurring run-rate</span>
        </div>

        {/* 3. Total Collected */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Collected</span>
            <div className="p-1 rounded-md bg-blue-50 text-blue-600">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-michroma text-lg sm:text-xl font-bold text-gray-900">
            {formatCurrency(totalCollectedSum)}
          </div>
          <span className="text-[10px] text-gray-400">{payments.length} collection transaction(s)</span>
        </div>

        {/* 4. Overdue / Due Now */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Due / Overdue</span>
            <div className="p-1 rounded-md bg-rose-50 text-rose-600">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-michroma text-lg sm:text-xl font-bold text-rose-600">
            {overdueProjects.length}
          </div>
          <span className="text-[10px] text-gray-400">
            {overdueProjects.length > 0 ? 'Requires collection action' : 'All contracts up to date'}
          </span>
        </div>
      </div>

      {/* View Tabs & Search Filter Controls */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Sub-Tabs Switch */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'contracts'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Repeat className="w-3.5 h-3.5 text-[#FF4D00]" />
            <span>Active Contracts & Retainers</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 text-gray-700">
              {filteredContracts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-[#FF4D00]" />
            <span>Collection History & Vouchers</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 text-gray-700">
              {filteredPayments.length}
            </span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search project or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          {activeTab === 'contracts' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="overdue">Overdue / Due Now</option>
              <option value="paused">Paused</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: Active Contracts & Retainers */}
      {activeTab === 'contracts' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          {filteredContracts.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 space-y-2">
              <Repeat className="w-8 h-8 text-gray-300 mx-auto stroke-1" />
              <p className="font-semibold text-gray-700">No maintenance retainer contracts found</p>
              <p className="text-gray-400">
                Enable Maintenance Fee when creating or editing a project to establish recurring retainers.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 text-[11px] uppercase font-semibold">
                    <th className="py-2.5 px-4">Project & Client</th>
                    <th className="py-2.5 px-4">Recurring Fee</th>
                    <th className="py-2.5 px-4">Billing Cycle</th>
                    <th className="py-2.5 px-4">Next Due Date</th>
                    <th className="py-2.5 px-4">Contract Status</th>
                    <th className="py-2.5 px-4 text-right">Collected to Date</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContracts.map((proj) => {
                    const nextDue = proj.maintenance_next_due_date;
                    const isOverdue = nextDue && nextDue < todayStr;
                    const isDueToday = nextDue === todayStr;

                    return (
                      <tr key={proj.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Project & Client */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/projects/${proj.id}`}
                                className="font-mono font-bold text-[#FF4D00] hover:underline"
                              >
                                {proj.project_code}
                              </Link>
                              <span className="font-semibold text-gray-900 truncate max-w-[200px]">
                                {proj.title}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 flex items-center gap-2">
                              <span>{proj.client_name}</span>
                              {proj.client_phone && (
                                <span className="text-gray-400 font-mono text-[10px]">
                                  {proj.client_phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Recurring Fee */}
                        <td className="py-3 px-4 font-michroma font-bold text-gray-900 whitespace-nowrap">
                          {formatCurrency(proj.maintenance_amount)}
                        </td>

                        {/* Billing Cycle */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            <Clock className="w-3 h-3 text-[#FF4D00]" />
                            <span>
                              {formatFrequency(
                                proj.maintenance_frequency,
                                proj.maintenance_custom_days
                              )}
                            </span>
                          </span>
                        </td>

                        {/* Next Due Date & Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {nextDue ? (
                            <div className="space-y-0.5">
                              <div className="font-mono text-gray-800 text-xs font-semibold">
                                {formatDate(nextDue)}
                              </div>
                              {isOverdue && proj.maintenance_status === 'active' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  <span>Overdue</span>
                                </span>
                              )}
                              {isDueToday && proj.maintenance_status === 'active' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>Due Today</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Not scheduled</span>
                          )}
                        </td>

                        {/* Contract Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              proj.maintenance_status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : proj.maintenance_status === 'paused'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {proj.maintenance_status}
                          </span>
                        </td>

                        {/* Collected to Date */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="font-michroma text-xs font-bold text-emerald-600">
                            {formatCurrency(proj.total_collected || 0)}
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {proj.payment_count || 0} collection(s)
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openCollectModal(proj)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                              title="Record Maintenance Collection"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Collect</span>
                            </button>

                            <button
                              onClick={() => openTermsModal(proj)}
                              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Retainer Terms"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <Link
                              href={`/projects/${proj.id}`}
                              className="p-1.5 text-gray-400 hover:text-[#FF4D00] hover:bg-orange-50 rounded-lg transition-colors"
                              title="View Project Details"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
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
      )}

      {/* TAB 2: Collection History & Vouchers */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          {filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 space-y-2">
              <Receipt className="w-8 h-8 text-gray-300 mx-auto stroke-1" />
              <p className="font-semibold text-gray-700">No collection history yet</p>
              <p className="text-gray-400">
                Recorded maintenance fee payments will appear here with downloadable receipts.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 text-[11px] uppercase font-semibold">
                    <th className="py-2.5 px-4">Receipt #</th>
                    <th className="py-2.5 px-4">Payment Date</th>
                    <th className="py-2.5 px-4">Project & Client</th>
                    <th className="py-2.5 px-4">Billing Period</th>
                    <th className="py-2.5 px-4">Particulars</th>
                    <th className="py-2.5 px-4 text-right">Amount Paid</th>
                    <th className="py-2.5 px-4 text-right">Voucher & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Receipt No */}
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                        MNT-{String(p.id).padStart(5, '0')}
                      </td>

                      {/* Payment Date */}
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap font-mono text-[11px]">
                        {formatDate(p.payment_date)}
                      </td>

                      {/* Project & Client */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{p.client_name}</div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          {p.project_code} • {p.project_title}
                        </div>
                      </td>

                      {/* Billing Period */}
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap text-[11px] font-mono">
                        {p.billing_period_start ? (
                          <span>
                            {formatDate(p.billing_period_start)}
                            {p.billing_period_end && ` → ${formatDate(p.billing_period_end)}`}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Particulars & Method */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold uppercase font-mono text-gray-800 text-[11px]">
                          {p.payment_method.replace('_', ' ')}
                        </span>
                        {p.transaction_id && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            Txn: {p.transaction_id}
                          </div>
                        )}
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3 px-4 text-right font-michroma font-bold text-gray-900 text-sm whitespace-nowrap">
                        {formatCurrency(p.amount)}
                      </td>

                      {/* Voucher & Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openPaymentReceipt(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="Download Official Voucher (PDF / PNG)"
                          >
                            <Receipt className="w-3.5 h-3.5 text-[#FF4D00]" />
                            <span>Voucher</span>
                          </button>

                          {p.receipt_url && (
                            <a
                              href={p.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-gray-400 hover:text-[#FF4D00] transition-colors"
                              title="View Attached Proof (Vercel Blob)"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => handleDeletePayment(p)}
                            className="p-1 text-gray-300 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Payment Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Record Maintenance Payment */}
      <Modal
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        title="Record Maintenance Fee Collection"
      >
        <form onSubmit={handleCollectSubmit} className="space-y-3.5 text-xs">
          {collectError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{collectError}</span>
            </div>
          )}

          {/* Project Selector */}
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Select Client Project *
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleSelectProject(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            >
              <option value="">-- Choose Project --</option>
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code} • {p.client_name} - {p.title}{' '}
                  {p.has_maintenance ? `(Retainer: ₹${p.maintenance_amount})` : '(No Retainer)'}
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Payment Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Collection Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-gray-500">₹</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={collectAmount || ''}
                  onChange={(e) => setCollectAmount(parseFloat(e.target.value) || 0)}
                  required
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={collectPaymentDate}
                onChange={(e) => setCollectPaymentDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          {/* Billing Period Start & End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Billing Period Start
              </label>
              <input
                type="date"
                value={billingPeriodStart}
                onChange={(e) => setBillingPeriodStart(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Billing Period End
              </label>
              <input
                type="date"
                value={billingPeriodEnd}
                onChange={(e) => setBillingPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          {/* Payment Method & UTR */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Payment Method *
              </label>
              <select
                value={collectPaymentMethod}
                onChange={(e) => setCollectPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              >
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="bank_transfer">Bank Transfer (IMPS/NEFT)</option>
                <option value="cash">Cash Payment</option>
                <option value="card">Card Payment</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other Method</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                UTR / Transaction ID
              </label>
              <input
                type="text"
                value={collectTransactionId}
                onChange={(e) => setCollectTransactionId(e.target.value)}
                placeholder="e.g. 4293021938"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          {/* Received By Staff */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Received / Handled By
              </label>
              <select
                value={collectReceivedBy}
                onChange={(e) => setCollectReceivedBy(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              >
                <option value="">Select Team Member</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.full_name}>
                    {m.full_name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Receipt Reference No
              </label>
              <input
                type="text"
                value={collectReferenceNumber}
                onChange={(e) => setCollectReferenceNumber(e.target.value)}
                placeholder="Optional Ref #"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          {/* Proof / Document Attachment via Vercel Blob */}
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Proof of Payment / Bank Slip (Vercel Blob Storage)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={proofFileInputRef}
                onChange={handleProofUpload}
                accept="image/*,.pdf"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => proofFileInputRef.current?.click()}
                disabled={proofUploading}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {proofUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5" />
                )}
                <span>{collectProofUrl ? 'Change Attachment' : 'Upload File / Receipt'}</span>
              </button>

              {collectProofUrl && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium truncate max-w-[220px]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <a
                    href={collectProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:underline"
                  >
                    Uploaded to Vercel Blob
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Checkbox: Advance Next Due Date */}
          <label className="flex items-center gap-2 p-2 bg-orange-50/50 rounded-lg border border-[#FF4D00]/20 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={advanceNextDueDate}
              onChange={(e) => setAdvanceNextDueDate(e.target.checked)}
              className="accent-[#FF4D00] rounded w-4 h-4 cursor-pointer"
            />
            <span className="font-semibold text-gray-800">
              Advance project's next due date by 1 recurring cycle automatically
            </span>
          </label>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Internal Notes / Remarks
            </label>
            <textarea
              rows={2}
              value={collectNotes}
              onChange={(e) => setCollectNotes(e.target.value)}
              placeholder="e.g. Paid for server hosting and annual maintenance..."
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCollectModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={collectLoading}
              className="px-4 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {collectLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Confirm & Generate Voucher</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Configure / Edit Maintenance Contract Terms */}
      <Modal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        title={
          selectedProject
            ? `Retainer Terms: ${selectedProject.project_code} - ${selectedProject.client_name}`
            : 'Configure Maintenance Retainer'
        }
      >
        <form onSubmit={handleTermsSubmit} className="space-y-3.5 text-xs">
          {termsError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{termsError}</span>
            </div>
          )}

          {/* Enable / Disable Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <span className="font-bold text-gray-900 block text-xs">
                Recurring Maintenance Contract
              </span>
              <span className="text-[11px] text-gray-500">
                Turn on recurring maintenance retainer fee collection
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={editHasMaintenance}
              onClick={() => setEditHasMaintenance(!editHasMaintenance)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                editHasMaintenance ? 'bg-[#FF4D00]' : 'bg-gray-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  editHasMaintenance ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {editHasMaintenance && (
            <>
              {/* Fee Amount & Frequency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Retainer Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={editAmount || ''}
                    onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                    required={editHasMaintenance}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Frequency Cycle *
                  </label>
                  <select
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                  >
                    <option value="monthly">Monthly (1 Month)</option>
                    <option value="2_months">Every 2 Months</option>
                    <option value="quarterly">Quarterly (3 Months)</option>
                    <option value="half_yearly">Half-Yearly (6 Months)</option>
                    <option value="yearly">Yearly (12 Months)</option>
                    <option value="custom">Custom Day Count</option>
                  </select>
                </div>
              </div>

              {/* Custom days (if selected) */}
              {editFrequency === 'custom' && (
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Custom Interval in Days *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="730"
                    value={editCustomDays || ''}
                    onChange={(e) => setEditCustomDays(parseInt(e.target.value) || 30)}
                    required
                    placeholder="e.g. 45"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>
              )}

              {/* Start Date & Next Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Contract Start Date
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Next Due Date *
                  </label>
                  <input
                    type="date"
                    value={editNextDueDate}
                    onChange={(e) => setEditNextDueDate(e.target.value)}
                    required={editHasMaintenance}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>
              </div>

              {/* Contract Status */}
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Contract Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                >
                  <option value="active">Active Retainer</option>
                  <option value="paused">Paused / Temporarily Suspended</option>
                  <option value="cancelled">Cancelled Contract</option>
                </select>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsTermsModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={termsLoading}
              className="px-4 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {termsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Retainer Terms</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Official Voucher / Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        data={receiptData}
      />
    </div>
  );
}
