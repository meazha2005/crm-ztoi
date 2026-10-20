'use client';

import React from 'react';
import { Download } from 'lucide-react';

interface CsvExportButtonProps {
  filename: string;
  data?: Record<string, any>[];
  headers?: string[];
  rows?: (string | number)[][];
  label?: string;
  className?: string;
}

export function CsvExportButton({
  filename,
  data,
  headers,
  rows,
  label = 'Export CSV',
  className = '',
}: CsvExportButtonProps) {
  function handleExport() {
    let exportHeaders: string[] = [];
    let exportRows: (string | number)[][] = [];

    if (data && data.length > 0) {
      exportHeaders = Object.keys(data[0]);
      exportRows = data.map((item) =>
        exportHeaders.map((key) => {
          const val = item[key];
          return val === null || val === undefined ? '' : val;
        })
      );
    } else if (headers && rows) {
      exportHeaders = headers;
      exportRows = rows;
    } else {
      alert('No data to export');
      return;
    }

    const csvContent = [
      exportHeaders.map((h) => `"${h.toString().replace(/"/g, '""')}"`).join(','),
      ...exportRows.map((row) =>
        row
          .map((cell) => `"${(cell ?? '').toString().replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${className}`}
    >
      <Download className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}
