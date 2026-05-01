/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star, Check, Trash2, Eye, EyeOff, Search, Edit3, X, Save,
  RefreshCw, TrendingUp, MessageSquare, Clock, Award,
  ChevronDown, Filter, Mail, Calendar,
} from 'lucide-react';
import { supabase }       from '@/lib/supabase';
import { useAuth }        from '@/contexts/AuthContext';
import { toast }          from 'react-toastify';
import DashboardLayout    from '@/components/layouts/DashboardLayout';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Review {
  id:           string;
  name:         string;
  email:        string;
  rating:       number;
  review:       string;
  is_published: boolean;
  admin_note:   string | null;
  created_at:   string;
  updated_at:   string;
}

type FilterTab = 'all' | 'pending' | 'published';

// ── Star picker (re-used for editing) ─────────────────────────────────────────
function StarPicker({ value, onChange, size = 20 }: {
  value: number; onChange: (v: number) => void; size?: number;
}) {
  const [hov, setHov] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onMouseEnter={() => setHov(s)} onMouseLeave={() => setHov(0)}
          onClick={() => onChange(s)}
          className="focus:outline-none transition-transform hover:scale-110">
          <Star size={size}
            className={s <= (hov || value) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-200'} />
        </button>
      ))}
      {(hov || value) > 0 && (
        <span className="text-xs text-gray-500 ml-1 tabular-nums">{hov || value}/5</span>
      )}
    </div>
  );
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={size}
          className={s <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-200'} />
      ))}
    </div>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  const colors: Record<number, string> = {
    5: 'bg-green-100 text-green-700', 4: 'bg-blue-100 text-blue-700',
    3: 'bg-yellow-100 text-yellow-700', 2: 'bg-orange-100 text-orange-700',
    1: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${colors[rating]||colors[3]}`}>
      <Star size={11} className="fill-current" /> {rating}
    </span>
  );
}

function StatCard({ icon: Icon, value, label, sub, color }: {
  icon: any; value: string | number; label: string; sub?: string; color: string;
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
  );
}

// ── Inline Note editor ────────────────────────────────────────────────────────
function NoteEditor({ reviewId, currentNote, onSaved }: {
  reviewId: string; currentNote: string | null; onSaved: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note,    setNote]    = useState(currentNote || '');
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('app_reviews')
        .update({ admin_note: note || null }).eq('id', reviewId);
      if (error) throw error;
      onSaved(note); setEditing(false); toast.success('Note saved');
    } catch { toast.error('Failed to save note'); }
    finally { setSaving(false); }
  };

  if (!editing) return (
    <button onClick={() => setEditing(true)}
      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
      <MessageSquare size={12} />
      {currentNote
        ? <span className="italic truncate max-w-[200px]">{currentNote}</span>
        : 'Add internal note'}
    </button>
  );
  return (
    <div className="flex items-center gap-2 mt-1">
      <input type="text" value={note} onChange={e => setNote(e.target.value)}
        placeholder="Internal note…"
        className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-300 outline-none" />
      <button onClick={save} disabled={saving}
        className="text-xs bg-orange-500 text-white px-2 py-1.5 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors">
        {saving ? '…' : 'Save'}
      </button>
      <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
    </div>
  );
}

// ── Inline Edit form ──────────────────────────────────────────────────────────
function EditReviewForm({ review, onSave, onCancel }: {
  review: Review;
  onSave: (updated: Partial<Review>) => void;
  onCancel: () => void;
}) {
  const [name,   setName]   = useState(review.name);
  const [email,  setEmail]  = useState(review.email);
  const [rating, setRating] = useState(review.rating);
  const [text,   setText]   = useState(review.review);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim())       { toast.error('Name is required'); return; }
    if (!email.trim())      { toast.error('Email is required'); return; }
    if (rating === 0)       { toast.error('Please select a rating'); return; }
    if (text.trim().length < 5) { toast.error('Review is too short'); return; }

    setSaving(true);
    try {
      const patch = { name: name.trim(), email: email.trim().toLowerCase(), rating, review: text.trim() };
      const { error } = await supabase.from('app_reviews').update(patch).eq('id', review.id);
      if (error) throw error;
      toast.success('Review updated ✓');
      onSave(patch);
    } catch (err: any) { toast.error(err.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="mt-4 border border-orange-200 rounded-xl p-4 bg-orange-50/50 space-y-3">
      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Editing Review</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 outline-none bg-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 outline-none bg-white" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Rating</label>
        <StarPicker value={rating} onChange={setRating} size={22} />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Review Text</label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 outline-none resize-none bg-white" />
        <p className="text-xs text-gray-400 text-right mt-0.5">{text.length} chars</p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors">
          {saving
            ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
            : <><Save size={14}/> Save Changes</>}
        </button>
        <button onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
          <X size={14}/> Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminReviewsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search,    setSearch]    = useState('');
  const [sortBy,    setSortBy]    = useState<'newest' | 'rating_high' | 'rating_low'>('newest');
  const [actionId,  setActionId]  = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // ✅ NEW

  // ── Auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    const role = (user as any)?.role;
    if (!user || !['admin', 'superadmin'].includes(role)) router.replace('/auth/login');
  }, [user, authLoading, router]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_reviews')
        .select('id,name,email,rating,review,is_published,admin_note,created_at,updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReviews((data || []) as Review[]);
    } catch (err: any) { toast.error('Failed to load: ' + err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!authLoading && user) fetchReviews(); }, [fetchReviews, authLoading, user]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const togglePublish = async (id: string, current: boolean) => {
    setActionId(id);
    try {
      const { error } = await supabase.from('app_reviews').update({ is_published: !current }).eq('id', id);
      if (error) throw error;
      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_published: !current } : r));
      toast.success(current ? 'Review hidden' : 'Review published ✓');
    } catch { toast.error('Action failed'); }
    finally { setActionId(null); }
  };

  const deleteReview = async (id: string) => {
    if (!window.confirm('Delete this review permanently?')) return;
    setActionId(id);
    try {
      const { error } = await supabase.from('app_reviews').delete().eq('id', id);
      if (error) throw error;
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success('Review deleted');
    } catch { toast.error('Delete failed'); }
    finally { setActionId(null); }
  };

  const handleEditSave = (id: string, patch: Partial<Review>) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    setEditingId(null);
  };

  const updateNote = (id: string, note: string) =>
    setReviews(prev => prev.map(r => r.id === id ? { ...r, admin_note: note || null } : r));

  // ── Derived stats ─────────────────────────────────────────────────────────
  const total     = reviews.length;
  const published = reviews.filter(r => r.is_published).length;
  const pending   = reviews.filter(r => !r.is_published).length;
  const avgRating = total
    ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : '—';
  const dist = [5,4,3,2,1].map(n => ({
    star: n,
    count: reviews.filter(r => r.rating === n).length,
    pct: total ? Math.round((reviews.filter(r => r.rating === n).length / total) * 100) : 0,
  }));

  // ── Filtered + sorted ────────────────────────────────────────────────────
  const filtered = reviews
    .filter(r => {
      if (activeTab === 'published') return r.is_published;
      if (activeTab === 'pending')   return !r.is_published;
      return true;
    })
    .filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) ||
             r.email.toLowerCase().includes(q) ||
             r.review.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'rating_high') return b.rating - a.rating;
      if (sortBy === 'rating_low')  return a.rating - b.rating;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // ── Guard spinner ─────────────────────────────────────────────────────────
  if (authLoading || (!authLoading && !['admin','superadmin'].includes((user as any)?.role))) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-orange-500" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">App Reviews</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage feedback submitted via{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">/review</code>
            </p>
          </div>
          <button onClick={fetchReviews} disabled={loading}
            className="inline-flex items-center gap-2 text-sm border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-600 px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={MessageSquare} value={total}     label="Total"           color="bg-blue-50 text-blue-500" />
          <StatCard icon={Clock}         value={pending}   label="Pending"         sub="Awaiting approval" color="bg-orange-50 text-orange-500" />
          <StatCard icon={Eye}           value={published} label="Published"       sub="Live on home page" color="bg-green-50 text-green-500" />
          <StatCard icon={Award}         value={avgRating} label="Avg. Rating"     sub="Out of 5 stars"   color="bg-yellow-50 text-yellow-500" />
        </div>

        {/* Rating distribution */}
        {total > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Rating Distribution</h3>
            </div>
            <div className="space-y-2">
              {dist.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-10 shrink-0">
                    <Star size={12} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium text-gray-600">{star}</span>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-yellow-400 transition-all duration-700"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right tabular-nums">
                    {count} ({pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {([
              { key:'all',       label:`All (${total})` },
              { key:'pending',   label:`Pending (${pending})` },
              { key:'published', label:`Published (${published})` },
            ] as { key: FilterTab; label: string }[]).map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, review…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none transition-all" />
          </div>

          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 outline-none appearance-none bg-white cursor-pointer">
              <option value="newest">Newest first</option>
              <option value="rating_high">Rating: High → Low</option>
              <option value="rating_low">Rating: Low → High</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[0,1,2,3].map(i => (
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
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <MessageSquare size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              {search ? 'No reviews match your search' : 'No reviews yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(review => (
              <div key={review.id}
                className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${
                  editingId === review.id
                    ? 'border-orange-300 ring-1 ring-orange-200'
                    : review.is_published
                    ? 'border-green-100 hover:border-green-200'
                    : 'border-gray-100 hover:border-orange-200'
                }`}>

                {/* Header row */}
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="w-10 h-10 bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center font-bold text-base shrink-0">
                    {review.name[0]?.toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{review.name}</p>
                      <RatingBadge rating={review.rating} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        review.is_published ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {review.is_published ? '✓ Published' : '⏳ Pending'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Mail size={11} /> {review.email}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Calendar size={11} />
                        {new Date(review.created_at).toLocaleDateString('en-IN',{ day:'numeric', month:'short', year:'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Edit toggle */}
                    <button
                      onClick={() => setEditingId(editingId === review.id ? null : review.id)}
                      title={editingId === review.id ? 'Cancel edit' : 'Edit review'}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        editingId === review.id
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}>
                      {editingId === review.id ? <><X size={13}/> Cancel</> : <><Edit3 size={13}/> Edit</>}
                    </button>

                    {/* Publish toggle */}
                    <button
                      onClick={() => togglePublish(review.id, review.is_published)}
                      disabled={actionId === review.id}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                        review.is_published
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}>
                      {actionId === review.id
                        ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        : review.is_published ? <><EyeOff size={13}/> Hide</> : <><Check size={13}/> Publish</>}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteReview(review.id)}
                      disabled={actionId === review.id}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>

                {/* Inline edit form */}
                {editingId === review.id ? (
                  <EditReviewForm
                    review={review}
                    onSave={patch => handleEditSave(review.id, patch)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="mt-3"><StarRow rating={review.rating} size={15} /></div>
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed border-l-2 border-orange-200 pl-3">
                      &quot;{review.review}&quot;
                    </p>
                  </>
                )}

                {/* Admin note */}
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <NoteEditor reviewId={review.id} currentNote={review.admin_note}
                    onSaved={note => updateNote(review.id, note)} />
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-center text-xs text-gray-400 pb-4">
            Showing {filtered.length} of {total} reviews
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
