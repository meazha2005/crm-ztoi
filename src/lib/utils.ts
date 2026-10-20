import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined, symbol = '₹'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount ?? 0);
  if (isNaN(num)) return `${symbol}\u00A00.00`;
  return `${symbol}\u00A0${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getAvatarUrl(avatar?: string | null): string {
  if (!avatar || typeof avatar !== 'string') return '';
  const trimmed = avatar.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return `/${trimmed}`;
}

export function addMonthsSafely(dateStr: string, months: number): string {
  if (months === 0) return dateStr;
  const date = new Date(dateStr);
  const startDay = date.getDate();
  
  // Set month
  date.setMonth(date.getMonth() + months);
  
  // Check if day rolled over (e.g., Jan 31 -> Mar 3)
  if (date.getDate() !== startDay) {
    date.setDate(0); // Sets to the last day of previous month
  }
  
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatFrequency(frequency?: string | null, customDays?: number | null): string {
  switch (frequency) {
    case 'monthly':
      return 'Monthly (1 Month)';
    case '2_months':
      return 'Every 2 Months';
    case 'quarterly':
      return 'Quarterly (3 Months)';
    case 'half_yearly':
      return 'Half-Yearly (6 Months)';
    case 'yearly':
      return 'Yearly (12 Months)';
    case 'custom':
      return `Every ${customDays || 30} Days`;
    default:
      return 'Monthly';
  }
}

export function calculateNextMaintenanceDueDate(
  baseDate: string,
  frequency: string,
  customDays?: number | null
): string {
  if (!baseDate) return '';
  switch (frequency) {
    case 'monthly':
      return addMonthsSafely(baseDate, 1);
    case '2_months':
      return addMonthsSafely(baseDate, 2);
    case 'quarterly':
      return addMonthsSafely(baseDate, 3);
    case 'half_yearly':
      return addMonthsSafely(baseDate, 6);
    case 'yearly':
      return addMonthsSafely(baseDate, 12);
    case 'custom':
      return addDays(baseDate, Number(customDays) || 30);
    default:
      return addMonthsSafely(baseDate, 1);
  }
}

export function calculatePeriodEnd(
  startDate: string,
  frequency: string,
  customDays?: number | null
): string {
  const nextCycle = calculateNextMaintenanceDueDate(startDate, frequency, customDays);
  return addDays(nextCycle, -1);
}

export interface EmiScheduleItem {
  emiNumber: number;
  dueDate: string;
  amount: number;
  status: 'unpaid' | 'partial' | 'paid';
  isDownPayment?: boolean;
}

export function calculateEmiSchedule(params: {
  totalAmount: number;
  initialPayment: number;
  emiCount: number;
  emiFrequency: number;
  startDate: string;
  firstInstallmentDate?: string;
}): EmiScheduleItem[] {
  const items: EmiScheduleItem[] = [];
  const { totalAmount, initialPayment, emiCount, emiFrequency, startDate, firstInstallmentDate } = params;

  if (initialPayment > 0) {
    items.push({
      emiNumber: 0,
      dueDate: startDate,
      amount: initialPayment,
      status: 'unpaid',
      isDownPayment: true,
    });
  }

  const balance = Math.max(0, totalAmount - initialPayment);
  if (balance <= 0 || emiCount <= 0) {
    return items;
  }

  const baseEmi = Math.floor((balance / emiCount) * 100) / 100;
  const remainder = Math.round((balance - baseEmi * emiCount) * 100) / 100;
  const baseFirstDate = firstInstallmentDate || addMonthsSafely(startDate, 1);

  for (let i = 0; i < emiCount; i++) {
    const isLast = i === emiCount - 1;
    const amount = isLast ? Number((baseEmi + remainder).toFixed(2)) : baseEmi;
    const dueDate = addMonthsSafely(baseFirstDate, i * emiFrequency);

    items.push({
      emiNumber: i + 1,
      dueDate,
      amount,
      status: 'unpaid',
    });
  }

  return items;
}

export function getDeadlineStatus(deadline: string, submittedDate?: string | null): {
  status: 'on_time' | 'late' | 'overdue' | 'upcoming' | 'normal';
  label: string;
  badgeClass: string;
} {
  const today = new Date().toISOString().split('T')[0];
  
  if (submittedDate) {
    if (submittedDate <= deadline) {
      return { status: 'on_time', label: 'On Time', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    return { status: 'late', label: 'Submitted Late', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
  }

  if (deadline < today) {
    return { status: 'overdue', label: 'Overdue', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
  }

  const upcomingThreshold = new Date();
  upcomingThreshold.setDate(upcomingThreshold.getDate() + 7);
  const upDate = upcomingThreshold.toISOString().split('T')[0];

  if (deadline <= upDate) {
    return { status: 'upcoming', label: 'Due Soon', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' };
  }

  return { status: 'normal', label: 'On Track', badgeClass: 'bg-slate-50 text-slate-700 border-slate-200' };
}
