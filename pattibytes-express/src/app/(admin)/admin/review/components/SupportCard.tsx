'use client'

import { Calendar, Mail, Phone, Trash2 } from 'lucide-react'
import type { SupportMessage } from '../types'

export default function SupportCard({
  item,
  actionId,
  onUpdateStatus,
  onDelete,
}: {
  item: SupportMessage
  actionId: string | null
  onUpdateStatus: (id: string, status: SupportMessage['status']) => void
  onDelete: (id: string) => void
}) {
  const priorityLabel =
    item.priority >= 5 ? 'Urgent' : item.priority >= 4 ? 'High' : item.priority >= 3 ? 'Normal' : 'Low'

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              {priorityLabel}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              {item.status}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <Mail size={11} /> {item.email}
            </span>
            {item.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone size={11} /> {item.phone}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} />
              {new Date(item.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(['new', 'seen', 'replied', 'closed'] as const).map(status => (
            <button
              key={status}
              onClick={() => onUpdateStatus(item.id, status)}
              disabled={actionId === item.id}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                item.status === status
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}
            >
              {status}
            </button>
          ))}

          <button
            onClick={() => onDelete(item.id)}
            disabled={actionId === item.id}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {item.subject || 'No subject'}
        </p>
        <p className="text-sm text-gray-700 mt-2 leading-relaxed whitespace-pre-wrap">{item.message}</p>
      </div>
    </div>
  )
}