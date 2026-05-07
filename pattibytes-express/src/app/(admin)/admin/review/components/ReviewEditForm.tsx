'use client'

import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { toast } from 'react-toastify'
import { supabase } from '@/lib/supabase'
import { StarPicker } from './SharedBits'
import type { Review } from '../types'

export default function ReviewEditForm({
  review,
  onSave,
  onCancel,
}: {
  review: Review
  onSave: (updated: Partial<Review>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(review.name)
  const [email, setEmail] = useState(review.email)
  const [rating, setRating] = useState(review.rating)
  const [text, setText] = useState(review.review)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Name is required')
    if (!email.trim()) return toast.error('Email is required')
    if (rating === 0) return toast.error('Please select a rating')
    if (text.trim().length < 5) return toast.error('Review is too short')

    setSaving(true)
    try {
      const patch = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        rating,
        review: text.trim(),
      }

      const { error } = await supabase.from('app_review').update(patch).eq('id', review.id)

      if (error) throw error
      toast.success('Review updated ✓')
      onSave(patch)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 border border-orange-200 rounded-xl p-4 bg-orange-50/50 space-y-3">
      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Editing Review</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 outline-none bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 outline-none bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Rating</label>
        <StarPicker value={rating} onChange={setRating} size={22} />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Review Text</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={4}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 outline-none resize-none bg-white"
        />
        <p className="text-xs text-gray-400 text-right mt-0.5">{text.length} chars</p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save size={14} />
              Save Changes
            </>
          )}
        </button>

        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <X size={14} />
          Cancel
        </button>
      </div>
    </div>
  )
}