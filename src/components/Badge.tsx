import React from 'react';

interface BadgeProps {
  status?: string;
  type?: 'project' | 'payment' | 'priority' | 'role' | 'active_inactive';
  variant?: 'success' | 'danger' | 'warning' | 'accent' | 'neutral' | 'info' | 'primary' | 'default';
  children?: React.ReactNode;
  className?: string;
}

export function Badge({
  status,
  type = 'project',
  variant,
  children,
  className = '',
}: BadgeProps) {
  // If children + variant are passed directly
  if (variant || children) {
    let colorStyle = 'bg-gray-100 text-gray-800 border-gray-200';
    switch (variant) {
      case 'success':
        colorStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'danger':
        colorStyle = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      case 'warning':
        colorStyle = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'accent':
      case 'primary':
        colorStyle = 'bg-[#FF4D00]/10 text-[#FF4D00] border-[#FF4D00]/30 font-semibold';
        break;
      case 'info':
        colorStyle = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'neutral':
      default:
        colorStyle = 'bg-gray-100 text-gray-700 border-gray-200';
        break;
    }

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorStyle} ${className}`}
      >
        {children || status}
      </span>
    );
  }

  // Otherwise, use status-based lookup
  const normalized = (status || '').toLowerCase().trim();

  let text = status || '';
  let colorStyle = 'bg-gray-100 text-gray-800 border-gray-200';

  if (type === 'project') {
    switch (normalized) {
      case 'new':
        text = 'New';
        colorStyle = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'in_progress':
        text = 'In Progress';
        colorStyle = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'on_hold':
        text = 'On Hold';
        colorStyle = 'bg-purple-50 text-purple-700 border-purple-200';
        break;
      case 'completed':
        text = 'Completed';
        colorStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'cancelled':
        text = 'Cancelled';
        colorStyle = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
    }
  } else if (type === 'payment') {
    switch (normalized) {
      case 'paid':
        text = 'Paid';
        colorStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'partial':
        text = 'Partial';
        colorStyle = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'unpaid':
      case 'pending':
        text = normalized === 'pending' ? 'Pending' : 'Unpaid';
        colorStyle = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
    }
  } else if (type === 'priority') {
    switch (normalized) {
      case 'urgent':
        text = 'Urgent';
        colorStyle = 'bg-[#FF4D00]/10 text-[#FF4D00] border-[#FF4D00]/30 font-semibold';
        break;
      case 'high':
        text = 'High';
        colorStyle = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      case 'medium':
        text = 'Medium';
        colorStyle = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'low':
        text = 'Low';
        colorStyle = 'bg-slate-50 text-slate-600 border-slate-200';
        break;
    }
  } else if (type === 'role') {
    if (normalized === 'admin') {
      text = 'Admin';
      colorStyle = 'bg-[#FF4D00] text-white border-[#FF4D00] font-semibold';
    } else {
      text = 'Team Member';
      colorStyle = 'bg-gray-100 text-gray-700 border-gray-200';
    }
  } else if (type === 'active_inactive') {
    if (normalized === 'active') {
      text = 'Active';
      colorStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else {
      text = 'Inactive';
      colorStyle = 'bg-rose-50 text-rose-700 border-rose-200';
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorStyle} ${className}`}
    >
      {text}
    </span>
  );
}
