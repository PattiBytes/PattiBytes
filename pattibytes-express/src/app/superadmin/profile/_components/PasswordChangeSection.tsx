/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface Props { email: string; }

function strengthScore(pw: string): number {
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0–5
}

const STRENGTH_LABEL = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLOR = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-emerald-500'];

export default function PasswordChangeSection({ email }: Props) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);

  const score = strengthScore(form.next);
  const mismatch = form.confirm.length > 0 && form.next !== form.confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.next.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (score < 2) { toast.error('Please choose a stronger password'); return; }

    setLoading(true);
    try {
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: form.current });
      if (signInError) throw new Error('Current password is incorrect');

      // Update to new password
      const { error } = await supabase.auth.updateUser({ password: form.next });
      if (error) throw error;

      toast.success('✅ Password changed successfully');
      setForm({ current: '', next: '', confirm: '' });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    id, label, value, showKey, onChange,
  }: {
    id: keyof typeof show; label: string;
    value: string; showKey: keyof typeof show;
    onChange: (v: string) => void;
  }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type={show[showKey] ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm
            focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
        />
        <button type="button" onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show[showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b">
        <ShieldCheck size={20} className="text-yellow-500" />
        <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field id="current" showKey="current" label="Current Password"
          value={form.current} onChange={v => setForm(s => ({ ...s, current: v }))} />

        <Field id="next" showKey="next" label="New Password"
          value={form.next} onChange={v => setForm(s => ({ ...s, next: v }))} />

        {/* Strength meter */}
        {form.next.length > 0 && (
          <div>
            <div className="flex gap-1 mb-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors
                  ${i <= score ? STRENGTH_COLOR[score] : 'bg-gray-200'}`} />
              ))}
            </div>
            <p className={`text-xs font-semibold ${score >= 4 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-500'}`}>
              {STRENGTH_LABEL[score]}
            </p>
            <ul className="mt-1 text-xs text-gray-500 space-y-0.5">
              {[
                [form.next.length >= 8,  '8+ characters'],
                [/[A-Z]/.test(form.next),'Uppercase letter'],
                [/[0-9]/.test(form.next),'Number'],
                [/[^A-Za-z0-9]/.test(form.next), 'Special character (@#$!…)'],
              ].map(([ok, label], i) => (
                <li key={i} className={ok ? 'text-green-600' : ''}>{ok ? '✓' : '○'} {label as string}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <Field id="confirm" showKey="confirm" label="Confirm New Password"
            value={form.confirm} onChange={v => setForm(s => ({ ...s, confirm: v }))} />
          {mismatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
        </div>

        <button type="submit" disabled={loading || mismatch || !form.current || !form.next}
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r
            from-yellow-400 to-yellow-600 text-white px-4 py-2.5 rounded-lg font-semibold
            text-sm hover:from-yellow-500 hover:to-yellow-700 disabled:opacity-50 transition-all">
          <ShieldCheck size={16} />
          {loading ? 'Updating password…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
