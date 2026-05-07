'use client'

import { Calendar, Check, Edit3, EyeOff, Mail, Trash2, X } from 'lucide-react'
import ReviewEditForm from './ReviewEditForm'
import ReviewNoteEditor from './ReviewNoteEditor'
import { RatingBadge, StarRow, StatusBadge } from './SharedBits'
import type { Review } from '../types'

export default function ReviewCard({
  review,
  editingId,
  setEditingId,
  actionId,
  onTogglePublish,
  onDelete,
  onEditSave,
  onNoteSaved,
}: {
  review: Review
  editingId: string | null
  setEditingId: (id: string | null) => void
  actionId: string | null
  onTogglePublish: (id: string, current: boolean) => void
  onDelete: (id: string) => void
  onEditSave: (id: string, patch: Partial<Review>) => void
  onNoteSaved: (id: string, note: string) => void
}) {
  return (
    <div
      className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${
        editingId === review.id
          ? 'border-orange-300 ring-1 ring-orange-200'
          : review.is_published
          ? 'border-green-100 hover:border-green-200'
          : 'border-gray-100 hover:border-orange-200'
      }`}
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div className="w-10 h-10 bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center font-bold text-base shrink-0">
          {review.name[0]?.toUpperCase() || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">{review.name}</p>
            <RatingBadge rating={review.rating} />
            <StatusBadge published={review.is_published} />
          </div>

          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Mail size={11} /> {review.email}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Calendar size={11} />
              {new Date(review.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setEditingId(editingId === review.id ? null : review.id)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              editingId === review.id
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            {editingId === review.id ? (
              <>
                <X size={13} />
                Cancel
              </>
            ) : (
              <>
                <Edit3 size={13} />
                Edit
              </>
            )}
          </button>

          <button
            onClick={() => onTogglePublish(review.id, review.is_published)}
            disabled={actionId === review.id}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              review.is_published
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {actionId === review.id ? (
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            ) : review.is_published ? (
              <>
                <EyeOff size={13} />
                Hide
              </>
            ) : (
              <>
                <Check size={13} />
                Publish
              </>
            )}
          </button>

          <button
            onClick={() => onDelete(review.id)}
            disabled={actionId === review.id}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </div>

      {editingId === review.id ? (
        <ReviewEditForm
          review={review}
          onSave={patch => onEditSave(review.id, patch)}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <>
          <div className="mt-3">
            <StarRow rating={review.rating} size={15} />
          </div>
          <p className="text-sm text-gray-700 mt-2 leading-relaxed border-l-2 border-orange-200 pl-3">
            “{review.review}”
          </p>
        </>
      )}

      <div className="mt-3 pt-3 border-t border-gray-50">
        <ReviewNoteEditor
          reviewId={review.id}
          currentNote={review.admin_note}
          onSaved={note => onNoteSaved(review.id, note)}
        />
      </div>
    </div>
  )
}