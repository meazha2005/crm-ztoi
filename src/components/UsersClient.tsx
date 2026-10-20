'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  UserCheck,
  Edit2,
  Eye,
  Shield,
  User,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  Lock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { createUserAction, updateUserAction } from '@/lib/actions';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';

interface UserRecord {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'team_member';
  phone?: string | null;
  avatar?: string | null;
  status: 'active' | 'inactive';
  last_login?: string | null;
  created_at: string;
}

interface UsersClientProps {
  users: UserRecord[];
  currentUserId: number;
}

export function UsersClient({ users, currentUserId }: UsersClientProps) {
  const router = useRouter();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);

  // Form states - Add
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'team_member'>('team_member');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Form states - Edit
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'team_member'>('team_member');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      setError('Please fill all mandatory fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await createUserAction({
        full_name: fullName,
        username,
        email,
        password,
        role,
        phone,
        status,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to create user account');
      }

      setIsAddOpen(false);
      setFullName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setPhone('');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setError('');

    if (!editFullName.trim() || !editUsername.trim() || !editEmail.trim()) {
      setError('Name, username, and email are required');
      return;
    }

    if (editPassword && editPassword.length < 6) {
      setError('Password must be at least 6 characters if updating');
      return;
    }

    setLoading(true);
    try {
      const res = await updateUserAction(editUser.id, {
        full_name: editFullName,
        username: editUsername,
        email: editEmail,
        password: editPassword.trim() ? editPassword : undefined,
        role: editRole,
        phone: editPhone,
        status: editStatus,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to update user');
      }

      setEditUser(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Update failed');
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
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Username</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Contact</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4">Last Activity</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const initials = u.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={u.avatar} name={u.full_name} size="md" />
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                            <span>{u.full_name}</span>
                            {u.id === currentUserId && (
                              <span className="text-[9px] px-1 py-0.2 bg-gray-100 text-gray-600 rounded font-normal">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-gray-700">{u.username}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200/50'
                            : 'bg-blue-50 text-blue-700 border border-blue-200/50'
                        }`}
                      >
                        {u.role === 'admin' ? (
                          <Shield className="w-2.5 h-2.5" />
                        ) : (
                          <User className="w-2.5 h-2.5" />
                        )}
                        <span>{u.role === 'admin' ? 'Administrator' : 'Team Member'}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 font-mono text-[11px]">
                      {u.phone || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <Badge variant={u.status === 'active' ? 'success' : 'neutral'}>
                        {u.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-gray-400 text-[11px]">
                      {u.last_login ? formatDate(u.last_login) : 'Never'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setError('');
                          setEditUser(u);
                          setEditFullName(u.full_name);
                          setEditUsername(u.username);
                          setEditEmail(u.email);
                          setEditPassword('');
                          setEditRole(u.role);
                          setEditPhone(u.phone || '');
                          setEditStatus(u.status);
                        }}
                        className="p-1.5 text-gray-400 hover:text-[#FF4D00] hover:bg-[#FF4D00]/5 rounded-md transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Create User */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create Team Member Account"
      >
        <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              required
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                required
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Password * (min 6 chars)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                System Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              >
                <option value="team_member">Team Member</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Account Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
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
              <span>Create Account</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Edit User */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title={`Edit User: ${editUser?.full_name}`}
      >
        <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Reset Password (leave empty to retain current)
            </label>
            <input
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as any)}
                disabled={editUser?.id === currentUserId}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00] disabled:bg-gray-100"
              >
                <option value="admin">Administrator</option>
                <option value="team_member">Team Member</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                disabled={editUser?.id === currentUserId}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00] disabled:bg-gray-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {editUser?.id === currentUserId && (
            <p className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded">
              You cannot demote or deactivate your currently logged-in administrator account.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setEditUser(null)}
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
    </>
  );
}
