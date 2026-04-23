/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2, Loader2, Save, X, FileText, Eye } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { getLegalPages, upsertLegalPage, deleteLegalPage, type LegalPageRow } from '../actions';

const KNOWN_SLUGS = [
  { slug: 'terms',         label: 'Terms of Service'            },
  { slug: 'privacy-policy',label: 'Privacy Policy'              },
  { slug: 'refund-policy', label: 'Refund & Cancellation Policy'},
  { slug: 'about',         label: 'About Us'                    },
  { slug: 'contact',       label: 'Contact Us'                  },
];

const EMPTY = { id: '', slug: '', title: '', content: '' };

export function LegalPagesList() {
  const [pages,   setPages]   = useState<LegalPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = async () => {
    setLoading(true);
    try {
      setPages(await getLegalPages());
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew  = () => { setForm(EMPTY); setShowForm(true); };
  const openEdit = (p: LegalPageRow) => {
    setForm({ id: p.id, slug: p.slug, title: p.title, content: p.content });
    setShowForm(true);
  };
  const closeForm = () => { setForm(EMPTY); setShowForm(false); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.slug || !form.title || !form.content) {
      toast.error('Slug, title, and content are required');
      return;
    }
    startTransition(async () => {
      try {
        await upsertLegalPage(form);
        toast.success(form.id ? 'Page updated' : 'Page created');
        closeForm();
        await load();
      } catch (err: any) {
        toast.error(err?.message || 'Save failed');
      }
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    startTransition(async () => {
      try {
        await deleteLegalPage(id);
        toast.success('Page deleted');
        await load();
      } catch (err: any) {
        toast.error(err?.message || 'Delete failed');
      }
    });
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl border-2 border-gray-200 ' +
    'focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm transition-all';

 return (
    <DashboardLayout>   
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" /> Legal Pages
          </h1>
          <p className="text-sm text-gray-500">{pages.length} page{pages.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl
                     font-bold hover:shadow-lg transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" /> New Page
        </button>
      </div>

      {/* Quick-create from known slugs */}
      {!loading && (
        <div className="flex gap-2 flex-wrap mb-6">
          {KNOWN_SLUGS.filter(k => !pages.find(p => p.slug === k.slug)).map(k => (
            <button
              key={k.slug}
              onClick={() => { setForm({ id: '', slug: k.slug, title: k.label, content: `## ${k.label}\n\nContent here.` }); setShowForm(true); }}
              className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-600 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
            >
              + {k.label}
            </button>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={closeForm}>
          <div className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl shadow-2xl
                          max-h-[95vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-lg font-black text-gray-900">
                {form.id ? '✏️ Edit Page' : '➕ New Legal Page'}
              </h2>
              <button onClick={closeForm} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Slug *</label>
                  <select
                    value={KNOWN_SLUGS.find(k => k.slug === form.slug) ? form.slug : 'custom'}
                    onChange={e => {
                      if (e.target.value !== 'custom') {
                        const k = KNOWN_SLUGS.find(x => x.slug === e.target.value)!;
                        setForm(prev => ({ ...prev, slug: k.slug, title: prev.title || k.label }));
                      }
                    }}
                    className={`${inputCls} mb-2`}
                  >
                    {KNOWN_SLUGS.map(k => <option key={k.slug} value={k.slug}>{k.slug}</option>)}
                    <option value="custom">Custom slug…</option>
                  </select>
                  <input
                    value={form.slug}
                    onChange={e => setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    className={inputCls}
                    placeholder="e.g. terms, privacy-policy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Title *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className={inputCls}
                    placeholder="Page display title"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-700">Content * (Markdown supported)</label>
                  <button type="button" onClick={() => setPreview(preview ? null : form.content)}
                    className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
                    <Eye className="w-3 h-3" /> {preview ? 'Edit' : 'Preview'}
                  </button>
                </div>
                {preview ? (
                  <div className="w-full min-h-[300px] p-4 rounded-xl border-2 border-gray-200 bg-gray-50
                                  prose prose-sm max-w-none whitespace-pre-wrap text-sm text-gray-700">
                    {preview}
                  </div>
                ) : (
                  <textarea
                    value={form.content}
                    onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={14}
                    className={`${inputCls} resize-y font-mono text-xs`}
                    placeholder="## Section Title&#10;&#10;Your content here...&#10;&#10;- Bullet point&#10;- Another point"
                  />
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 bg-gradient-to-r from-primary to-pink-600 text-white py-3 rounded-xl
                             font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isPending ? <><Loader2 className="w-5 h-5 animate-spin" />Saving…</> : <><Save className="w-5 h-5" />{form.id ? 'Update' : 'Create'} Page</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pages list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : pages.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center">
          <FileText className="w-14 h-14 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No legal pages yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pages.map(page => (
            <div key={page.id}
              className="bg-white rounded-2xl shadow-md border-2 border-gray-100 hover:border-primary/30 hover:shadow-lg transition-all p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-gray-900">{page.title}</h3>
                  <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                    /legal/{page.slug}
                  </code>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(page)}
                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(page.id, page.title)}
                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                    disabled={isPending}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Updated: {new Date(page.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{page.content.replace(/[#*_`]/g, '').slice(0, 100)}…</p>
            </div>
          ))}
        </div>
      )}
    </div>
     </DashboardLayout>
  );
}


