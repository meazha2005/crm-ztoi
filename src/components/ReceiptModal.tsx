'use client';

import React, { useRef, useState } from 'react';
import {
  Download,
  Printer,
  X,
  CheckCircle2,
  FileText,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface ReceiptData {
  type: 'payment' | 'expense' | 'income';
  receiptNo: string;
  date: string;
  title: string;
  partyName: string;
  partyContact?: string;
  projectCode?: string;
  projectTitle?: string;
  installmentNo?: number;
  category?: string;
  description: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  referenceNumber?: string;
  handledBy?: string;
  notes?: string;
  attachedFileUrl?: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

export function ReceiptModal({ isOpen, onClose, data }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState(false);

  if (!isOpen || !data) return null;

  async function generateImage(): Promise<string> {
    if (!receiptRef.current) throw new Error('Receipt element not ready');
    
    // Generate clean high-resolution 2x PNG data url using native SVG rasterizer
    return await toPng(receiptRef.current, {
      quality: 1.0,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });
  }

  async function handleDownloadImage() {
    setDownloadingImg(true);
    try {
      const dataUrl = await generateImage();
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `ztoi-receipt-${data?.receiptNo || 'voucher'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Image export failed:', err);
      alert('Failed to generate image. Please try the Print option or retry.');
    } finally {
      setDownloadingImg(false);
    }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const dataUrl = await generateImage();
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const img = new window.Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const margin = 10;
      const printableWidth = pdfWidth - margin * 2;
      const printableHeight = (img.height * printableWidth) / img.width;

      pdf.addImage(dataUrl, 'PNG', margin, margin, printableWidth, Math.min(printableHeight, pdfHeight - margin * 2));
      pdf.save(`ztoi-receipt-${data?.receiptNo || 'voucher'}.pdf`);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Please try Print as PDF or retry.');
    } finally {
      setDownloadingPdf(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#FF4D00]" />
            <span className="font-michroma text-xs font-bold text-gray-900 tracking-wide">
              {data.type === 'expense' ? 'Expense Voucher' : 'Payment Receipt'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || downloadingImg}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {downloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download PDF</span>
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={downloadingImg || downloadingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {downloadingImg ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5" />
              )}
              <span>Download Image</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-gray-100/50">
          {/* Printable Document Container */}
          <div
            ref={receiptRef}
            style={{ backgroundColor: '#ffffff' }}
            className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-sm max-w-xl mx-auto text-xs space-y-5 relative overflow-hidden"
          >
            {/* Top Brand Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FF4D00]" />

            {/* Header: Logo, Company Name in #FF4D00, and Document Meta */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-4 pt-1">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="ZTOI TECH"
                  className="w-12 h-12 object-contain shrink-0"
                />
                <div>
                  <h1 className="font-michroma text-lg sm:text-xl font-bold tracking-wider text-[#FF4D00]">
                    ZTOI TECH
                  </h1>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mt-0.5">
                    Technology & Software Solutions
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase mb-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>PAID & VERIFIED</span>
                </div>
                <div className="font-mono font-bold text-gray-900 text-xs">
                  {data.receiptNo}
                </div>
                <div className="text-[11px] text-gray-500 font-mono">
                  {formatDate(data.date)}
                </div>
              </div>
            </div>

            {/* Two-Column Balanced Party & Payment Information Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Left Box: Client / Party details */}
              <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                  {data.type === 'expense' ? 'Disbursed To / Vendor' : 'Billed To (Client)'}
                </span>
                <div className="font-bold text-gray-900 text-sm">{data.partyName}</div>
                {data.partyContact && (
                  <div className="text-gray-500 font-mono text-[11px]">
                    {data.partyContact}
                  </div>
                )}
                {data.projectCode && (
                  <div className="pt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF4D00]/10 text-[#FF4D00]">
                      {data.projectCode}
                    </span>
                    {data.projectTitle && (
                      <span className="truncate max-w-[180px] font-medium text-gray-800">
                        {data.projectTitle}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right Box: Payment method & IDs */}
              <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                  Payment Particulars
                </span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Method:</span>
                  <span className="font-bold text-gray-900 uppercase font-mono">
                    {data.paymentMethod.replace('_', ' ')}
                  </span>
                </div>
                {data.transactionId && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">UTR / Txn ID:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {data.transactionId}
                    </span>
                  </div>
                )}
                {data.referenceNumber && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Ref No:</span>
                    <span className="font-mono text-gray-800">
                      {data.referenceNumber}
                    </span>
                  </div>
                )}
                {data.handledBy && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Handled By:</span>
                    <span className="text-gray-800 font-medium">
                      {data.handledBy}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table with Dark Professional Header */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-900 text-white text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                    <th className="py-2.5 px-3.5">Description & Particulars</th>
                    <th className="py-2.5 px-3.5">Category</th>
                    <th className="py-2.5 px-3.5 text-right min-w-[140px] whitespace-nowrap">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td className="py-3 px-3.5 text-center text-gray-400 font-mono">01</td>
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-gray-900">{data.description}</div>
                      {data.installmentNo !== undefined && (
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {data.installmentNo === 0 ? 'Down Payment' : `Installment Milestone #${data.installmentNo}`}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-gray-600 font-medium">
                      {data.category || (data.type === 'expense' ? 'Operational Expense' : 'Project EMI')}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-gray-900 text-sm whitespace-nowrap">
                      {formatCurrency(data.amount)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-orange-50/50 border-t-2 border-[#FF4D00]/30">
                    <td colSpan={2} className="py-3 px-3.5 font-bold text-gray-900 text-right whitespace-nowrap">
                      Total Transacted:
                    </td>
                    <td colSpan={2} className="py-3 px-3.5 text-right font-michroma font-bold text-base text-[#FF4D00] whitespace-nowrap">
                      <span className="whitespace-nowrap inline-block">
                        {formatCurrency(data.amount)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Audit Remarks Box if present */}
            {data.notes && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[11px] text-gray-600 leading-relaxed">
                <span className="font-bold text-gray-700 block mb-0.5">Audit Note / Remarks:</span>
                <span>{data.notes}</span>
              </div>
            )}

            {/* Digital Seal & Electronic Verification Footer */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Authorized electronic entry • ZTOI Tech ERP System</span>
              </div>
              <div className="font-mono text-gray-400 text-[10px]">
                Generated on {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Attached Document in Vercel Blob preview box */}
          {data.attachedFileUrl && (
            <div className="max-w-xl mx-auto mt-3 p-3 bg-white rounded-xl border border-gray-200 shadow-xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#FF4D00]" />
                <span className="font-medium text-gray-800">Attached Stored File (Vercel Blob)</span>
              </div>
              <a
                href={data.attachedFileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#FF4D00] hover:underline font-semibold"
              >
                <span>View Stored File</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
