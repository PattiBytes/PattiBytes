/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Mail, Send, CheckCircle, Lock } from 'lucide-react';

interface Props { currentEmail: string; }

export default function EmailChangeSection({ currentEmail }: Props) {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !password) return;
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      toast.error('New email must be different from current email'); return;
    }
    setLoading(true);
    try {
      // Re-authenticate first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password,
      });
      if (signInError) throw new Error('Current password is incorrect');

      // Request email change — Supabase sends confirmation to BOTH addresses
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim().toLowerCase() });
      if (error) throw error;

      setSent(true);
      toast.success('📧 Confirmation sent to both email addresses');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <div className="flex items-center gap-3 mb-1 pb-4 border-b">
        <Mail size={20} className="text-yellow-500" />
        <h2 className="text-lg font-bold text-gray-900">Change Email Address</h2>
      </div>

      {sent ? (
        <div className="py-6 text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
          <h3 className="font-bold text-gray-900 mb-1">Confirmation Emails Sent</h3>
          <p className="text-sm text-gray-600 max-w-sm mx-auto">
            Click the confirmation link sent to <strong>{newEmail}</strong> to complete the email change.
            A notification was also sent to your current address <strong>{currentEmail}</strong>.
          </p>
          <button onClick={() => { setSent(false); setNewEmail(''); setPassword(''); }}
            className="mt-4 text-sm text-yellow-600 hover:text-yellow-700 font-semibold underline">
            Change to a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <strong>How it works:</strong> Enter your current password to verify identity, then your new email.
            Supabase will send a confirmation link — your email only changes after you click it.
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Current Password (to verify identity)
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your current password"
                required
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm
                  focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="new@example.com"
                required
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm
                  focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>

          <button type="submit" disabled={loading || !newEmail || !password}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r
              from-yellow-400 to-yellow-600 text-white px-4 py-2.5 rounded-lg font-semibold
              text-sm hover:from-yellow-500 hover:to-yellow-700 disabled:opacity-50 transition-all">
            <Send size={15} />
            {loading ? 'Sending confirmation…' : 'Send Confirmation Email'}
          </button>
        </form>
      )}
    </div>
  );
}
