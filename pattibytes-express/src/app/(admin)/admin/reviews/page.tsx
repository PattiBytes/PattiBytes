/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, SlidersHorizontal, Unlock, Star } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useReviews } from './_hooks/useReviews';
import { ReviewsStats } from './_components/ReviewsStats';
import { ReviewCard } from './_components/ReviewCard';
import { ReviewForm } from './_components/ReviewForm';
import { GrantAccessModal } from './_components/GrantAccessModal';
import type { Review } from './_types';

type SortKey = 'newest' | 'oldest' | 'highest' | 'lowest';

export default function ManageReviewsPage() {
  const { user } = useAuth();
  const role     = (user as any)?.role ?? 'admin';

  const {
    reviews, merchants, customers, loading, saving,
    loadReviews, loadOptions, addReview, updateReview, deleteReview, grantReviewAccess,
  } = useReviews();

  // UI state
  const [search,         setSearch]        = useState('');
  const [merchantFilter, setMerchFilter]   = useState('');
  const [ratingFilter,   setRatingFilter]  = useState('all');
  const [sort,           setSort]          = useState<SortKey>('newest');
  const [showForm,       setShowForm]      = useState(false);
  const [showGrant,      setShowGrant]     = useState(false);
  const [editTarget,     setEditTarget]    = useState<Review | null>(null);
  const [showFilters,    setShowFilters]   = useState(false);

  useEffect(() => {
    void loadReviews();
    void loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-load when merchant filter changes
  useEffect(() => {
    void loadReviews(merchantFilter || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantFilter]);

  const filtered = useMemo(() => {
    let list = [...reviews];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.customerName?.toLowerCase().includes(q) ||
        r.merchantName?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q)
      );
    }

    if (ratingFilter !== 'all') {
      const v = Number(ratingFilter);
      list = list.filter(r => Math.floor(Number(r.overall_rating || r.rating || 0)) === v);
    }

    list.sort((a, b) => {
      if (sort === 'newest')  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'oldest')  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === 'highest') return Number(b.overall_rating || b.rating || 0) - Number(a.overall_rating || a.rating || 0);
      if (sort === 'lowest')  return Number(a.overall_rating || a.rating || 0) - Number(b.overall_rating || b.rating || 0);
      return 0;
    });

    return list;
  }, [reviews, search, ratingFilter, sort]);

  const handleEdit = useCallback((r: Review) => {
    setEditTarget(r);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(async (form: any, notifyFollowers: boolean) => {
    let ok = false;
    if (editTarget) ok = await updateReview(editTarget.id, form, editTarget);
    else             ok = await addReview(form, notifyFollowers);
    if (ok) { setShowForm(false); setEditTarget(null); }
  }, [editTarget, addReview, updateReview]);

  const handleDelete = useCallback(async (r: Review) => {
    await deleteReview(r);
  }, [deleteReview]);

  const handleGrant = useCallback(async (cId: string, mId: string, note: string) => {
    const ok = await grantReviewAccess(cId, mId, note);
    if (ok) setShowGrant(false);
  }, [grantReviewAccess]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-3 sm:px-5 py-4">

        {/* Page header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Star className="fill-amber-400 text-amber-400" size={20}/>
              Manage Reviews
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {reviews.length} total · Tap a review to expand
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button
              onClick={() => void loadReviews(merchantFilter || undefined)}
              disabled={loading}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setShowGrant(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-violet-200 text-violet-700 rounded-lg text-xs font-semibold hover:bg-violet-600 hover:text-white transition-all"
            >
              <Unlock size={12}/> Grant Access
            </button>

            <button
              onClick={() => { setEditTarget(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all"
            >
              <Plus size={12}/> Add Review
            </button>
          </div>
        </div>

        {/* Stats */}
        <ReviewsStats reviews={reviews} />

        {/* Search + filter row */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customer, merchant, comment…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          <button
            onClick={() => setShowFilters(x => !x)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${showFilters ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
          >
            <SlidersHorizontal size={12}/> Filters
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3 bg-gray-50 rounded-xl p-3 border border-gray-100 animate-fade-in">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Merchant</label>
              <select value={merchantFilter} onChange={e => setMerchFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-primary">
                <option value="">All Merchants</option>
                {merchants.map(m => <option key={m.id} value={m.id}>{m.business_name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Rating</label>
              <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-primary">
                <option value="all">All Ratings</option>
                {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} ★</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Sort By</label>
              <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-primary">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
              </select>
            </div>
          </div>
        )}

        {/* Review count */}
        <p className="text-xs text-gray-400 mb-2">
          Showing {filtered.length} of {reviews.length} reviews
          {merchantFilter && ` · ${merchants.find(m => m.id === merchantFilter)?.business_name}`}
          {ratingFilter !== 'all' && ` · ${ratingFilter}★`}
        </p>

        {/* Review list */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 text-center py-16">
            <Star size={36} className="mx-auto text-gray-200 mb-3"/>
            <p className="text-sm font-semibold text-gray-400">No reviews found</p>
            <p className="text-xs text-gray-300 mt-1">Try adjusting filters or add the first review</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => (
              <ReviewCard
                key={r.id}
                review={r}
                role={role}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <ReviewForm
          editTarget={editTarget}
          merchants={merchants}
          customers={customers}
          saving={saving}
          onSubmit={handleFormSubmit}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* Grant access modal */}
      {showGrant && (
        <GrantAccessModal
          merchants={merchants}
          customers={customers}
          saving={saving}
          onGrant={handleGrant}
          onClose={() => setShowGrant(false)}
        />
      )}

      <style jsx global>{`
        @keyframes fade-in { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        .animate-fade-in { animation: fade-in 0.25s ease-out forwards; }
        .scrollbar-hide::-webkit-scrollbar { display:none; }
        .scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }
        .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      `}</style>
    </DashboardLayout>
  );
}

