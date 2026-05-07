'use client'

import { ChevronDown, Filter, Search } from 'lucide-react'
import type { ReviewFilterTab, SortBy, SupportFilterTab } from '../types'

export default function ReviewFilters({
  activeTab,
  setActiveTab,
  supportTab,
  setSupportTab,
  totalReviews,
  pendingReviews,
  publishedReviews,
  totalRequests,
  newRequests,
  seenRequests,
  repliedRequests,
  closedRequests,
  search,
  setSearch,
  sortBy,
  setSortBy,
}: {
  activeTab: ReviewFilterTab
  setActiveTab: (v: ReviewFilterTab) => void
  supportTab: SupportFilterTab
  setSupportTab: (v: SupportFilterTab) => void
  totalReviews: number
  pendingReviews: number
  publishedReviews: number
  totalRequests: number
  newRequests: number
  seenRequests: number
  repliedRequests: number
  closedRequests: number
  search: string
  setSearch: (v: string) => void
  sortBy: SortBy
  setSortBy: (v: SortBy) => void
}) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {(
          [
            { key: 'all', label: `All (${totalReviews})` },
            { key: 'pending', label: `Pending (${pendingReviews})` },
            { key: 'published', label: `Published (${publishedReviews})` },
          ] as { key: ReviewFilterTab; label: string }[]
        ).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 flex-wrap">
        {(
          [
            { key: 'all', label: `Requests (${totalRequests})` },
            { key: 'new', label: `New (${newRequests})` },
            { key: 'seen', label: `Seen (${seenRequests})` },
            { key: 'replied', label: `Replied (${repliedRequests})` },
            { key: 'closed', label: `Closed (${closedRequests})` },
          ] as { key: SupportFilterTab; label: string }[]
        ).map(t => (
          <button
            key={t.key}
            onClick={() => setSupportTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              supportTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-w-[220px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, text…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none transition-all"
        />
      </div>

      <div className="relative">
        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortBy)}
          className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 outline-none appearance-none bg-white cursor-pointer"
        >
          <option value="newest">Newest first</option>
          <option value="rating_high">Rating: High → Low</option>
          <option value="rating_low">Rating: Low → High</option>
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}