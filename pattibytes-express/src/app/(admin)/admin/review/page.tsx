/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, RefreshCw, TrendingUp, Star } from 'lucide-react'
import { toast } from 'react-toastify'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Review, ReviewFilterTab, SortBy, SupportFilterTab, SupportMessage } from './types'
import AdminReviewStats from './components/AdminReviewStats'
import ReviewFilters from './components/ReviewFilters'
import ReviewCard from './components/ReviewCard'
import SupportCard from './components/SupportCard'

export default function AdminReviewsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [reviews, setReviews] = useState<Review[]>([])
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)

  const [reviewTab, setReviewTab] = useState<ReviewFilterTab>('all')
  const [supportTab, setSupportTab] = useState<SupportFilterTab>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [actionId, setActionId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    const role = (user as any)?.role
    if (!user || !['admin', 'superadmin'].includes(role)) {
      router.replace('/auth/login')
    }
  }, [user, authLoading, router])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [reviewsRes, supportRes] = await Promise.all([
        supabase
          .from('app_reviews')
          .select('id,name,email,rating,review,is_published,admin_note,created_at,updated_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('support_messages')
          .select('id,user_id,name,email,phone,subject,message,priority,status,source,meta,created_at,updated_at')
          .order('created_at', { ascending: false }),
      ])

      console.log('[admin/review] reviewsRes', reviewsRes)
      console.log('[admin/review] supportRes', supportRes)

      if (reviewsRes.error) throw reviewsRes.error
      if (supportRes.error) throw supportRes.error

      setReviews((reviewsRes.data || []) as Review[])
      setSupportMessages((supportRes.data || []) as SupportMessage[])
    } catch (err: any) {
      console.error('[admin/review] fetchAll failed', err)
      toast.error(`Failed to load: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      void fetchAll()
    }
  }, [authLoading, user, fetchAll])

  const togglePublish = async (id: string, current: boolean) => {
    setActionId(id)
    try {
      const { error } = await supabase
        .from('app_reviews')
        .update({ is_published: !current })
        .eq('id', id)

      if (error) throw error

      setReviews(prev => prev.map(r => (r.id === id ? { ...r, is_published: !current } : r)))
      toast.success(current ? 'Review hidden' : 'Review published ✓')
    } catch (err: any) {
      console.error('[admin/review] togglePublish failed', err)
      toast.error(err?.message || 'Action failed')
    } finally {
      setActionId(null)
    }
  }

  const deleteReview = async (id: string) => {
    if (!window.confirm('Delete this review permanently?')) return
    setActionId(id)
    try {
      const { error } = await supabase.from('app_reviews').delete().eq('id', id)
      if (error) throw error

      setReviews(prev => prev.filter(r => r.id !== id))
      toast.success('Review deleted')
    } catch (err: any) {
      console.error('[admin/review] deleteReview failed', err)
      toast.error(err?.message || 'Delete failed')
    } finally {
      setActionId(null)
    }
  }

  const updateReviewNote = (id: string, note: string) => {
    setReviews(prev => prev.map(r => (r.id === id ? { ...r, admin_note: note || null } : r)))
  }

  const handleEditSave = (id: string, patch: Partial<Review>) => {
    setReviews(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
    setEditingId(null)
  }

  const updateSupportStatus = async (id: string, status: SupportMessage['status']) => {
    setActionId(id)
    try {
      const { error } = await supabase.from('support_messages').update({ status }).eq('id', id)
      if (error) throw error

      setSupportMessages(prev => prev.map(m => (m.id === id ? { ...m, status } : m)))
      toast.success('Support request updated')
    } catch (err: any) {
      console.error('[admin/review] updateSupportStatus failed', err)
      toast.error(err?.message || 'Could not update request')
    } finally {
      setActionId(null)
    }
  }

  const deleteSupportMessage = async (id: string) => {
    if (!window.confirm('Delete this support request permanently?')) return
    setActionId(id)
    try {
      const { error } = await supabase.from('support_messages').delete().eq('id', id)
      if (error) throw error

      setSupportMessages(prev => prev.filter(m => m.id !== id))
      toast.success('Support request deleted')
    } catch (err: any) {
      console.error('[admin/review] deleteSupportMessage failed', err)
      toast.error(err?.message || 'Delete failed')
    } finally {
      setActionId(null)
    }
  }

  const totalReviews = reviews.length
  const publishedReviews = reviews.filter(r => r.is_published).length
  const pendingReviews = reviews.filter(r => !r.is_published).length
  const avgRating = totalReviews
    ? (reviews.reduce((sum, item) => sum + item.rating, 0) / totalReviews).toFixed(1)
    : '—'

  const totalRequests = supportMessages.length
  const newRequests = supportMessages.filter(m => m.status === 'new').length
  const seenRequests = supportMessages.filter(m => m.status === 'seen').length
  const repliedRequests = supportMessages.filter(m => m.status === 'replied').length
  const closedRequests = supportMessages.filter(m => m.status === 'closed').length

  const ratingDistribution = useMemo(
    () =>
      [5, 4, 3, 2, 1].map(star => {
        const count = reviews.filter(r => r.rating === star).length
        return {
          star,
          count,
          pct: totalReviews ? Math.round((count / totalReviews) * 100) : 0,
        }
      }),
    [reviews, totalReviews]
  )

  const filteredReviews = useMemo(() => {
    return reviews
      .filter(r => {
        if (reviewTab === 'published') return r.is_published
        if (reviewTab === 'pending') return !r.is_published
        return true
      })
      .filter(r => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.review.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        if (sortBy === 'rating_high') return b.rating - a.rating
        if (sortBy === 'rating_low') return a.rating - b.rating
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [reviews, reviewTab, search, sortBy])

  const filteredSupport = useMemo(() => {
    return supportMessages
      .filter(m => {
        if (supportTab === 'all') return true
        return m.status === supportTab
      })
      .filter(m => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.subject || '').toLowerCase().includes(q) ||
          m.message.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [supportMessages, supportTab, search])

  if (authLoading || (!authLoading && !['admin', 'superadmin'].includes((user as any)?.role))) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-orange-500" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reviews & Requests</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage customer reviews and support requests in one place.
            </p>
          </div>

          <button
            onClick={() => void fetchAll()}
            disabled={loading}
            className="inline-flex items-center gap-2 text-sm border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-600 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <AdminReviewStats
          totalReviews={totalReviews}
          pendingReviews={pendingReviews}
          publishedReviews={publishedReviews}
          avgRating={avgRating}
          totalRequests={totalRequests}
          newRequests={newRequests}
          repliedRequests={repliedRequests}
          closedRequests={closedRequests}
        />

        {totalReviews > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Rating Distribution</h3>
            </div>

            <div className="space-y-2">
              {ratingDistribution.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-10 shrink-0">
                    <Star size={12} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium text-gray-600">{star}</span>
                  </div>

                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 to-yellow-400 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <span className="text-xs text-gray-400 w-16 text-right tabular-nums">
                    {count} ({pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <ReviewFilters
          activeTab={reviewTab}
          setActiveTab={setReviewTab}
          supportTab={supportTab}
          setSupportTab={setSupportTab}
          totalReviews={totalReviews}
          pendingReviews={pendingReviews}
          publishedReviews={publishedReviews}
          totalRequests={totalRequests}
          newRequests={newRequests}
          seenRequests={seenRequests}
          repliedRequests={repliedRequests}
          closedRequests={closedRequests}
          search={search}
          setSearch={setSearch}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse space-y-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-3 bg-gray-100 rounded" />
                <div className="h-3 bg-gray-100 rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : filteredReviews.length === 0 && filteredSupport.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <MessageSquare size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">{search ? 'No records match your search' : 'No records yet'}</p>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
              </div>

              {filteredReviews.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-400">
                  No reviews in this filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReviews.map(review => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      editingId={editingId}
                      setEditingId={setEditingId}
                      actionId={actionId}
                      onTogglePublish={togglePublish}
                      onDelete={deleteReview}
                      onEditSave={handleEditSave}
                      onNoteSaved={updateReviewNote}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Support requests</h2>
              </div>

              {filteredSupport.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-400">
                  No support requests in this filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSupport.map(item => (
                    <SupportCard
                      key={item.id}
                      item={item}
                      actionId={actionId}
                      onUpdateStatus={updateSupportStatus}
                      onDelete={deleteSupportMessage}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {!loading && (
          <p className="text-center text-xs text-gray-400 pb-4">
            Showing {filteredReviews.length} reviews and {filteredSupport.length} support requests
          </p>
        )}
      </div>
    </DashboardLayout>
  )
}