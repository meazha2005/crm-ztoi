'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Building2,
  Tag,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import {
  updateSettingsAction,
  createExpenseCategoryAction,
  deleteExpenseCategoryAction,
} from '@/lib/actions';
import { Modal } from '@/components/Modal';

interface Category {
  id: number;
  name: string;
  description?: string;
  color?: string;
}

interface SettingsClientProps {
  initialSettings: Record<string, string>;
  categories: Category[];
}

export function SettingsClient({ initialSettings, categories }: SettingsClientProps) {
  const router = useRouter();

  // Settings form
  const [settings, setSettings] = useState<Record<string, string>>({
    company_name: initialSettings.company_name || 'ZTOI TECHNOLOGIES',
    company_email: initialSettings.company_email || 'contact@ztoi.tech',
    company_phone: initialSettings.company_phone || '+91 90807 06050',
    company_address: initialSettings.company_address || 'India',
    company_gstin: initialSettings.company_gstin || '',
    currency_symbol: initialSettings.currency_symbol || '₹',
    reminder_days_before: initialSettings.reminder_days_before || '7',
    grace_period_days: initialSettings.grace_period_days || '3',
  });

  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Category modal & form
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catColor, setCatColor] = useState('#FF4D00');
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState('');

  // Delete category
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);

  function handleChange(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');
    setSettingsLoading(true);

    try {
      const res = await updateSettingsAction(settings);
      if (!res.success) throw new Error(res.error || 'Failed to update settings');

      setSettingsSuccess('Settings updated successfully');
      router.refresh();
    } catch (err: any) {
      setSettingsError(err.message || 'Error updating settings');
    } finally {
      setSettingsLoading(false);
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setCatError('');

    if (!catName.trim()) {
      setCatError('Category name is required');
      return;
    }

    setCatLoading(true);
    try {
      const res = await createExpenseCategoryAction(catName, catDesc, catColor);
      if (!res.success) throw new Error(res.error || 'Failed to create category');

      setIsCatOpen(false);
      setCatName('');
      setCatDesc('');
      router.refresh();
    } catch (err: any) {
      setCatError(err.message || 'Error saving category');
    } finally {
      setCatLoading(false);
    }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm('Are you sure you want to delete this expense category?')) return;

    try {
      const res = await deleteExpenseCategoryAction(id);
      if (!res.success) {
        alert(res.error || 'Cannot delete category');
        return;
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting category');
    }
  }

  return (
    <div className="space-y-4">
      {/* Company & Agency Config */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
          <Building2 className="w-4 h-4 text-[#FF4D00]" />
          <h3 className="font-michroma text-xs font-bold text-gray-900 tracking-wide">
            Agency & Organization Details
          </h3>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          {settingsError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{settingsError}</span>
            </div>
          )}
          {settingsSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{settingsSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Organization / Brand Name
              </label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Official Contact Email
              </label>
              <input
                type="email"
                value={settings.company_email}
                onChange={(e) => handleChange('company_email', e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Official Phone Number
              </label>
              <input
                type="text"
                value={settings.company_phone}
                onChange={(e) => handleChange('company_phone', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                GSTIN / Tax ID (Optional)
              </label>
              <input
                type="text"
                value={settings.company_gstin}
                onChange={(e) => handleChange('company_gstin', e.target.value)}
                placeholder="33AAAAA0000A1Z5"
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Registered Physical Address
            </label>
            <textarea
              rows={2}
              value={settings.company_address}
              onChange={(e) => handleChange('company_address', e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={settings.currency_symbol}
                onChange={(e) => handleChange('currency_symbol', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                EMI Due Reminder Window (Days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.reminder_days_before}
                onChange={(e) => handleChange('reminder_days_before', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Overdue Grace Period (Days)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={settings.grace_period_days}
                onChange={(e) => handleChange('grace_period_days', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={settingsLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {settingsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save System Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* Expense Categories Management */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#FF4D00]" />
            <h3 className="font-michroma text-xs font-bold text-gray-900 tracking-wide">
              Expense Categories
            </h3>
          </div>

          <button
            onClick={() => {
              setCatError('');
              setIsCatOpen(true);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {categories.map((c) => (
            <div
              key={c.id}
              className="p-3 bg-gray-50/70 rounded-lg border border-gray-100 flex items-center justify-between group hover:border-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: c.color || '#FF4D00' }}
                />
                <div className="min-w-0">
                  <div className="font-medium text-xs text-gray-900 truncate">{c.name}</div>
                  {c.description && (
                    <div className="text-[10px] text-gray-400 truncate">{c.description}</div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDeleteCategory(c.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all shrink-0 cursor-pointer"
                title="Delete Category"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ADD CATEGORY MODAL */}
      <Modal
        isOpen={isCatOpen}
        onClose={() => setIsCatOpen(false)}
        title="Create Expense Category"
      >
        <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
          {catError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{catError}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Server & Cloud Hosting"
              required
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="e.g. AWS, Vercel, Supabase invoices"
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={catColor}
                onChange={(e) => setCatColor(e.target.value)}
                className="w-9 h-9 p-0.5 rounded border border-gray-200 cursor-pointer"
              />
              <span className="font-mono text-gray-600">{catColor}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCatOpen(false)}
              className="px-3.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={catLoading}
              className="px-4 py-1.5 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {catLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Category</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
