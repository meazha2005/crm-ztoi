'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Camera,
  Trash2,
} from 'lucide-react';
import { updateProfileAction, changePasswordAction } from '@/lib/actions';
import { AuthUser } from '@/lib/auth';
import { getAvatarUrl } from '@/lib/utils';

interface ProfileClientProps {
  user: AuthUser;
}

export function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile details state
  const [fullName, setFullName] = useState(user.full_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please upload a valid image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Avatar image must be under 5 MB');
      return;
    }

    setAvatarUploading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'avatars');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image to blob storage');
      }

      const uploadedUrl = data.url;
      setAvatar(uploadedUrl);

      // Save directly to user profile
      const updateRes = await updateProfileAction({
        full_name: fullName,
        email,
        phone,
        avatar: uploadedUrl,
      });

      if (!updateRes.success) {
        throw new Error(updateRes.error || 'Failed to save updated avatar');
      }

      setProfileSuccess('Profile picture updated and saved to Vercel Blob storage');
      router.refresh();
    } catch (err: any) {
      setProfileError(err.message || 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveAvatar() {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    setAvatarUploading(true);
    try {
      const updateRes = await updateProfileAction({
        full_name: fullName,
        email,
        phone,
        avatar: '',
      });

      if (!updateRes.success) throw new Error(updateRes.error);

      setAvatar('');
      setProfileSuccess('Profile picture removed');
      router.refresh();
    } catch (err: any) {
      setProfileError(err.message || 'Failed to remove avatar');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!fullName.trim() || !email.trim()) {
      setProfileError('Full name and email are required');
      return;
    }

    setProfileLoading(true);
    try {
      const res = await updateProfileAction({
        full_name: fullName,
        email,
        phone,
        avatar,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to update profile');
      }

      setProfileSuccess('Profile details updated successfully');
      router.refresh();
    } catch (err: any) {
      setProfileError(err.message || 'Update failed');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill all password fields');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changePasswordAction(currentPassword, newPassword, confirmPassword);
      if (!res.success) {
        throw new Error(res.error || 'Failed to update password');
      }

      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Password update failed');
    } finally {
      setPasswordLoading(false);
    }
  }

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* User Card Summary with Avatar Management */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col items-center text-center">
        {/* Avatar Circle with Upload Trigger */}
        <div className="relative group mb-3">
          <div className="w-20 h-20 rounded-full bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center font-michroma text-2xl font-bold border-2 border-[#FF4D00]/30 overflow-hidden shadow-xs relative select-none">
            <span>{initials}</span>
            {avatar && (
              <img
                src={getAvatarUrl(avatar)}
                alt={user.full_name}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white z-10">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
          </div>

          {/* Upload Button Overlay */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#FF4D00] text-white hover:bg-[#e04400] shadow-md transition-all cursor-pointer"
            title="Upload Profile Picture"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] font-semibold text-[#FF4D00] hover:underline cursor-pointer"
          >
            Change Photo
          </button>
          {avatar && (
            <>
              <span className="text-gray-300">•</span>
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-[11px] font-medium text-gray-400 hover:text-rose-600 cursor-pointer"
              >
                Remove
              </button>
            </>
          )}
        </div>

        <h3 className="font-michroma text-sm font-bold text-gray-900">{user.full_name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">@{user.username}</p>

        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-50 text-[#FF4D00] border border-[#FF4D00]/20">
          <Shield className="w-3 h-3" />
          <span>{user.role === 'admin' ? 'Administrator' : 'Team Member'}</span>
        </div>

        <div className="w-full mt-6 pt-4 border-t border-gray-100 text-left space-y-2.5 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          {user.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{user.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Profile Form & Password Form */}
      <div className="lg:col-span-2 space-y-4">
        {/* Personal Details */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <User className="w-4 h-4 text-[#FF4D00]" />
            <h3 className="font-michroma text-xs font-bold text-gray-900 tracking-wide">
              Personal Information
            </h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
            {profileError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}
            {profileSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
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

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF4D00] hover:bg-[#e04400] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {profileLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <KeyRound className="w-4 h-4 text-[#FF4D00]" />
            <h3 className="font-michroma text-xs font-bold text-gray-900 tracking-wide">
              Security & Credentials
            </h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            {passwordError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  New Password * (min 6 chars)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4D00]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {passwordLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
