import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  subValue,
  variant = 'default',
  icon,
  className = '',
}: StatCardProps) {
  let borderColor = 'border-gray-200';
  let accentBg = 'bg-white';
  let valueColor = 'text-gray-900';

  if (variant === 'primary' || variant === 'accent') {
    borderColor = 'border-[#FF4D00]/40';
    accentBg = 'bg-[#FF4D00]/[0.02]';
    valueColor = 'text-[#FF4D00]';
  } else if (variant === 'success') {
    borderColor = 'border-emerald-200';
    accentBg = 'bg-emerald-50/[0.3]';
    valueColor = 'text-emerald-700';
  } else if (variant === 'danger') {
    borderColor = 'border-rose-200';
    accentBg = 'bg-rose-50/[0.3]';
    valueColor = 'text-rose-700';
  } else if (variant === 'warning') {
    borderColor = 'border-amber-200';
    accentBg = 'bg-amber-50/[0.3]';
    valueColor = 'text-amber-700';
  } else if (variant === 'info') {
    borderColor = 'border-blue-200';
    accentBg = 'bg-blue-50/[0.3]';
    valueColor = 'text-blue-700';
  }

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-xl border ${borderColor} ${accentBg} shadow-xs hover:border-[#FF4D00]/50 transition-all duration-150 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500 truncate">
          {label}
        </span>
        {icon && <div className="text-gray-400 shrink-0">{icon}</div>}
      </div>
      <div>
        <div className={`text-xl sm:text-2xl font-michroma font-bold tracking-tight ${valueColor} truncate`}>
          {value}
        </div>
        {subValue && (
          <p className="text-[11px] text-gray-500 mt-0.5 truncate font-medium">
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}
