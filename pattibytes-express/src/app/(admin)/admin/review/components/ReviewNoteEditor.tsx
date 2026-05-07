'use client'

import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { toast } from 'react-toastify'
import { supabase } from '@/lib/supabase'

export default function ReviewNoteEditor({
  reviewId,
  currentNote,
  onSaved,
}: {
  reviewId: string
  currentNote: string | null
  onSaved: (note: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(currentNote || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNote(currentNote || '')
  }, [currentNote])

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('app_review')
        .update({ admin_note: note || null })
        .eq('id', reviewId)

      if (error) throw error
      onSaved(note)
      setEditing(false)
      toast.success('Note saved')
    } catch {
      toast.error('Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
      >
        <MessageSquare size={12} />
        {currentNote ? <span className="italic truncate max-w-[220px]">{currentNote}</span> : 'Add internal note'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Internal note…"
        className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-300 outline-none"
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-xs bg-orange-500 text-white px-2 py-1.5 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {saving ? '…' : 'Save'}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
    </div>
  )
}