'use client'

import { Award, Clock, Eye, Inbox, Mail, MessageCircle, MessageSquare, Phone } from 'lucide-react'

function StatCard({
  icon: Icon,
  value,
  label,
  sub,
  color,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
  value: string | number
  label: string
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
        <p className="text-sm text-gray-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function AdminReviewStats({
  totalReviews,
  pendingReviews,
  publishedReviews,
  avgRating,
  totalRequests,
  newRequests,
  repliedRequests,
  closedRequests,
}: {
  totalReviews: number
  pendingReviews: number
  publishedReviews: number
  avgRating: string
  totalRequests: number
  newRequests: number
  repliedRequests: number
  closedRequests: number
}) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={MessageSquare} value={totalReviews} label="Reviews" color="bg-blue-50 text-blue-500" />
        <StatCard icon={Clock} value={pendingReviews} label="Pending reviews" sub="Awaiting approval" color="bg-orange-50 text-orange-500" />
        <StatCard icon={Eye} value={publishedReviews} label="Published" sub="Live on home page" color="bg-green-50 text-green-500" />
        <StatCard icon={Award} value={avgRating} label="Avg. rating" sub="Out of 5 stars" color="bg-yellow-50 text-yellow-500" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Inbox} value={totalRequests} label="Support requests" color="bg-sky-50 text-sky-500" />
        <StatCard icon={MessageCircle} value={newRequests} label="New requests" sub="Unseen inbox items" color="bg-red-50 text-red-500" />
        <StatCard icon={Mail} value={repliedRequests} label="Replied" color="bg-green-50 text-green-500" />
        <StatCard icon={Phone} value={closedRequests} label="Closed" color="bg-gray-50 text-gray-500" />
      </div>
    </>
  )
}