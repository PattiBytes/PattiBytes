/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { ArrowLeft, Star, Send, CheckCircle2, ShoppingBag } from 'lucide-react';
import { supabasePublic } from '@/lib/supabasePublic';

const APP_STORE_URL = 'https://apps.apple.com/in/app/pattibytes-express/id6761598840';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.pattibytes.express';

// ── Star picker ───────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const labels: Record<number, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Great',
    5: 'Excellent 🎉',
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          aria-label={`Rate ${star} stars`}
          className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            size={34}
            className={`transition-colors ${
              star <= (hovered || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-200 fill-gray-100'
            }`}
          />
        </button>
      ))}
      {(hovered || value) > 0 && (
        <span className="text-sm font-semibold text-gray-600 ml-1">
          {labels[hovered || value]}
        </span>
      )}
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
function ThankYouScreen({ rating }: { rating: number }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative inline-block">
          <CheckCircle2 size={72} className="text-green-500 mx-auto" />
          {rating === 5 && (
            <span className="absolute -top-2 -right-2 text-2xl animate-bounce">🎉</span>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">Thank you! 🙏</h2>
          <p className="text-gray-500 mt-2 leading-relaxed text-sm">
            Your feedback has been submitted successfully and will be reviewed shortly.
          </p>
        </div>

        <div className="flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={22}
              className={s <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-200'}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Also rate us on the app stores:</p>

          <div className="space-y-3">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-black text-white px-5 py-3 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors w-full"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Rate on App Store
            </a>

            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#01875f] text-white px-5 py-3 rounded-xl font-medium text-sm hover:bg-[#016d4e] transition-colors w-full"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M3.18 23.76c.3.16.65.18.97.07l11.65-6.73-2.6-2.6-10.02 9.26zM.35 1.56C.13 1.9 0 2.33 0 2.86v18.28c0 .53.14.97.36 1.3l.07.07 10.24-10.24v-.24L.42 1.49l-.07.07zM20.8 9.98l-2.95-1.7-2.92 2.92 2.92 2.92 2.97-1.72c.84-.49.84-1.93-.02-2.42zM3.18.24l10.65 10.64-2.6 2.6L.35.31C.66.19 1.01.22 1.34.4l1.84 1.06L3.18.24z" />
              </svg>
              Rate on Google Play
            </a>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-orange-600 text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>
    </div>
  );
}

// ── Review form ───────────────────────────────────────────────────────────────
export default function ReviewPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', rating: 0, review: '' });

  const set = (k: keyof typeof formData, v: any) =>
    setFormData((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.rating === 0) {
      toast.error('Please select a star rating');
      return;
    }

    if (formData.review.trim().length < 10) {
      toast.error('Please write at least a short sentence');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabasePublic
        .from('app_reviews')
        .insert({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          rating: formData.rating,
          review: formData.review.trim(),
          is_published: false,
        });

      if (error) throw error;

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return <ThankYouScreen rating={formData.rating} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-600 mb-6 transition-colors text-sm"
        >
          <ArrowLeft size={18} /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-2xl mb-3">
              <ShoppingBag className="text-orange-500" size={26} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Share Your Feedback</h1>
            <p className="text-gray-400 text-sm mt-1">Help us improve PattiBytes Express</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Gurpreet Singh"
                required
                minLength={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all text-sm outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">We&apos;ll never share your email.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Rating <span className="text-red-400">*</span>
              </label>
              <StarPicker value={formData.rating} onChange={(v) => set('rating', v)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your Review <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.review}
                onChange={(e) => set('review', e.target.value)}
                rows={5}
                required
                minLength={10}
                maxLength={2000}
                placeholder="Tell us what you liked, what can be improved, or any feature requests…"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all text-sm outline-none resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{formData.review.length} / 2000</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send size={16} /> Submit Feedback
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center space-y-3">
            <p className="text-xs text-gray-400">Also rate us on the app stores:</p>

            <div className="flex flex-row flex-wrap gap-2 justify-center">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600 px-3 py-2 rounded-lg transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                App Store
              </a>

              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600 px-3 py-2 rounded-lg transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
                  <path d="M3.18 23.76c.3.16.65.18.97.07l11.65-6.73-2.6-2.6-10.02 9.26zM.35 1.56C.13 1.9 0 2.33 0 2.86v18.28c0 .53.14.97.36 1.3l.07.07 10.24-10.24v-.24L.42 1.49l-.07.07zM20.8 9.98l-2.95-1.7-2.92 2.92 2.92 2.92 2.97-1.72c.84-.49.84-1.93-.02-2.42zM3.18.24l10.65 10.64-2.6 2.6L.35.31C.66.19 1.01.22 1.34.4l1.84 1.06L3.18.24z" />
                </svg>
                Google Play
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}