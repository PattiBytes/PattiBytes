/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  User, Mail, Phone, Save, Crown, Shield,
  Lock, Eye, EyeOff, Camera, AlertCircle, KeyRound,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { uploadToStorage } from '@/lib/storage';

type Tab = 'profile' | 'security';

export default function SuperAdminProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
  });

  const [emailForm, setEmailForm] = useState({ new_email: '' });
  const [pwForm, setPwForm] = useState({ new_password: '', confirm_password: '' });

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'superadmin') {
      router.push(`/${user.role}/profile`);
      return;
    }
    setProfileForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      avatar_url: user.avatar_url || '',
    });
    setEmailForm({ new_email: user.email || '' });
  }, [user, router]);

  // ── Avatar upload ──────────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setUploading(true);
      const url = await uploadToStorage(file, `superadmin/${user.id}/avatar`);
      setProfileForm((f) => ({ ...f, avatar_url: url }));
      // Save immediately so it persists
      await supabase.from('profiles').update({ avatar_url: url, updated_at: new Date().toISOString() }).eq('id', user.id);
      toast.success('Avatar updated');
      await refreshUser?.();
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── Profile save ───────────────────────────────────────────────────
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone || null,
          avatar_url: profileForm.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('✅ Profile saved');
      await refreshUser?.();
    } catch (err: any) {
      toast.error(err?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Email change ───────────────────────────────────────────────────
  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.new_email.trim()) return;
    if (emailForm.new_email === user?.email) {
      toast.info('That is already your current email');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: emailForm.new_email });
      if (error) throw error;
      toast.success('📧 Confirmation sent to both old and new email. Please confirm both.');
    } catch (err: any) {
      toast.error(err?.message || 'Email change failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Password change ────────────────────────────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.new_password });
      if (error) throw error;
      toast.success('🔒 Password changed successfully');
      setPwForm({ new_password: '', confirm_password: '' });
    } catch (err: any) {
      toast.error(err?.message || 'Password change failed');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'superadmin') return null;

  const initial = (user.full_name?.[0] || 'S').toUpperCase();
  const pwsMatch = !pwForm.confirm_password || pwForm.new_password === pwForm.confirm_password;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* Hero banner */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            {/* Avatar with upload */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/50 bg-yellow-300 flex items-center justify-center">
                {profileForm.avatar_url ? (
                  <Image src={profileForm.avatar_url} alt="Avatar" fill className="object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-yellow-800">{initial}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                title="Change avatar"
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
              >
                {uploading
                  ? <span className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  : <Camera size={13} className="text-yellow-600" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">{user.full_name || 'Super Admin'}</h1>
              <p className="text-yellow-100 text-sm">{user.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <Crown size={13} />
                <span className="text-xs font-semibold tracking-wide">SUPER ADMINISTRATOR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {([
            ['profile', 'Profile Info', User],
            ['security', 'Email & Password', KeyRound],
          ] as [Tab, string, any][]).map(([t, label, Icon]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5
                ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ── */}
        {tab === 'profile' && (
          <form onSubmit={handleProfileSave} className="bg-white rounded-2xl shadow p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b">
              <Shield className="text-yellow-500" size={18} />
              <h2 className="font-bold text-gray-900">Profile Information</h2>
            </div>

            {/* Full name */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Email (read-only in this tab) */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <AlertCircle size={11} />
                Change email in the &quot;Email &amp; Password&quot; tab
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white py-3 rounded-xl
                font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-700"
            >
              <Save size={16} />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        )}

        {/* ── Security Tab ── */}
        {tab === 'security' && (
          <div className="space-y-5">

            {/* Email change */}
            <form onSubmit={handleEmailChange} className="bg-white rounded-2xl shadow p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                <Mail className="text-yellow-500" size={18} />
                <h2 className="font-bold text-gray-900">Change Email</h2>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>Supabase will send a <strong>confirmation link to both</strong> your old and new email. Both must be confirmed for the change to take effect.</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">New Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type="email"
                    value={emailForm.new_email}
                    onChange={(e) => setEmailForm({ new_email: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Mail size={15} /> {saving ? 'Sending…' : 'Send Confirmation'}
              </button>
            </form>

            {/* Password change */}
            <form onSubmit={handlePasswordChange} className="bg-white rounded-2xl shadow p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                <Lock className="text-yellow-500" size={18} />
                <h2 className="font-bold text-gray-900">Change Password</h2>
              </div>

              {/* New password */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={pwForm.new_password}
                    onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                    placeholder="Min 8 characters"
                    minLength={8}
                    className="w-full pl-9 pr-10 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                    required
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-3 text-gray-400">
                    {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* Strength indicator */}
                {pwForm.new_password && (
                  <div className="flex gap-1 mt-1.5">
                    {[4, 6, 8, 12].map((len) => (
                      <div key={len} className={`h-1 flex-1 rounded-full ${pwForm.new_password.length >= len ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={pwForm.confirm_password}
                    onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))}
                    placeholder="Repeat new password"
                    className={`w-full pl-9 pr-10 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400
                      ${!pwsMatch ? 'border-red-400' : ''}`}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-3 text-gray-400">
                    {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {!pwsMatch && <p className="text-xs text-red-500 mt-1">Passwords don&apos;t match</p>}
              </div>

              <button
                type="submit"
                disabled={saving || !pwsMatch || pwForm.new_password.length < 8}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Lock size={15} /> {saving ? 'Saving…' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* Privileges card */}
        <div className="mt-5 bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Crown className="text-yellow-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Super Admin Privileges</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {[
                  'Full system access across all branches',
                  'Manage all users, roles, and permissions',
                  'Add / remove admins and assign areas',
                  'Override any order, merchant, or driver action',
                  'System configuration, app settings & database',
                ].map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <span className="text-green-500 font-bold">✓</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
