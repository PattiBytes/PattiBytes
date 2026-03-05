/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, Tags, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { CategoryInfo, getDraftCategories, setDraftCategories } from './types';

interface Props {
  merchantId: string;
  categories: CategoryInfo[];   // live categories derived from menu_items
  onCategoriesChanged: () => void;
}

export function CategoryManager({ merchantId, categories, onCategoriesChanged }: Props) {
  const [expanded, setExpanded]     = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue]   = useState('');
  const [newCat, setNewCat]         = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [saving, setSaving]         = useState<string | null>(null);

  // Draft-only categories (exist in localStorage, not yet assigned to any item)
  const [draftCats, setDraftCatsState] = useState<string[]>([]);
  useEffect(() => { setDraftCatsState(getDraftCategories(merchantId)); }, [merchantId]);

  // Merge live + draft into full list
  const allCats: CategoryInfo[] = [
    ...categories,
    ...draftCats
      .filter(d => !categories.some(c => c.name === d))
      .map(d => ({ name: d, count: 0 })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const syncDrafts = (next: string[]) => {
    setDraftCatsState(next);
    setDraftCategories(merchantId, next);
  };

  // ── Rename ──────────────────────────────────────────────────────────────
  const handleRenameConfirm = useCallback(async () => {
    if (!editingName || !editValue.trim()) return;
    const next = editValue.trim();
    if (next === editingName) { setEditingName(null); return; }

    // Check for duplicate
    if (allCats.some(c => c.name.toLowerCase() === next.toLowerCase() && c.name !== editingName)) {
      toast.error('A category with that name already exists');
      return;
    }

    setSaving(editingName);
    try {
      // If it's a draft-only category, just update localStorage
      const isDraft = !categories.some(c => c.name === editingName);
      if (isDraft) {
        syncDrafts(draftCats.map(d => d === editingName ? next : d));
        toast.success(`Renamed to "${next}"`);
      } else {
        const { error } = await supabase
          .from('menu_items')
          .update({ category: next, updated_at: new Date().toISOString() })
          .eq('merchant_id', merchantId)
          .eq('category', editingName);
        if (error) throw error;
        // Also rename in drafts if present
        if (draftCats.includes(editingName)) {
          syncDrafts(draftCats.map(d => d === editingName ? next : d));
        }
        toast.success(`Category renamed to "${next}"`);
        onCategoriesChanged();
      }
      setEditingName(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to rename');
    } finally {
      setSaving(null);
    }
  }, [editingName, editValue, allCats, categories, draftCats, merchantId, onCategoriesChanged, syncDrafts]);

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (name: string, count: number) => {
    const isDraft = !categories.some(c => c.name === name);
    if (isDraft) {
      syncDrafts(draftCats.filter(d => d !== name));
      toast.success(`Draft category "${name}" removed`);
      return;
    }
    const msg = count > 0
      ? `"${name}" has ${count} item(s). Their category will be cleared. Continue?`
      : `Delete category "${name}"?`;
    if (!confirm(msg)) return;

    setSaving(name);
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ category: null, updated_at: new Date().toISOString() })
        .eq('merchant_id', merchantId)
        .eq('category', name);
      if (error) throw error;
      syncDrafts(draftCats.filter(d => d !== name));
      toast.success(`Category "${name}" deleted`);
      onCategoriesChanged();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    } finally {
      setSaving(null);
    }
  }, [categories, draftCats, merchantId, onCategoriesChanged, syncDrafts]);

  // ── Add new ──────────────────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    const name = newCat.trim();
    if (!name) return;
    if (allCats.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Category already exists');
      return;
    }
    syncDrafts([...draftCats, name]);
    toast.success(`"${name}" added — select it when creating menu items`);
    setNewCat('');
    setShowAdd(false);
  }, [newCat, allCats, draftCats, syncDrafts]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-violet-50/60 overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 hover:bg-violet-50/40 transition text-left"
      >
        <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
          <Tags className="w-4 h-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">Manage Categories</p>
          <p className="text-xs text-gray-500">
            {allCats.length} categor{allCats.length === 1 ? 'y' : 'ies'}
            {draftCats.length > 0 && ` · ${draftCats.length} draft`}
            {' '}· Rename, add or delete
          </p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        }
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-violet-100 pt-3 space-y-2">

          {/* Info banner */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-xs text-blue-800">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
            <span>
              <strong>Draft</strong> categories (0 items) are saved locally and available in the Add Item form.
              Renaming a live category updates all items instantly.
            </span>
          </div>

          {/* Category list */}
          {allCats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No categories yet.</p>
          ) : (
            <div className="space-y-1.5">
              {allCats.map(({ name, count }) => {
                const isDraft = !categories.some(c => c.name === name);
                const isSaving = saving === name;
                return (
                  <div
                    key={name}
                    className="group flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2 hover:border-gray-200 transition"
                  >
                    {editingName === name ? (
                      /* ── Edit mode ── */
                      <>
                        <input
                          autoFocus
                          className="flex-1 text-sm border border-primary rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameConfirm();
                            if (e.key === 'Escape') setEditingName(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleRenameConfirm}
                          disabled={isSaving}
                          className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition disabled:opacity-50"
                        >
                          {isSaving
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Check className="w-3.5 h-3.5" />
                          }
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingName(null)}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      /* ── View mode ── */
                      <>
                        <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{name}</span>
                        {isDraft
                          ? <span className="shrink-0 text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">draft</span>
                          : <span className="shrink-0 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                              {count} item{count !== 1 ? 's' : ''}
                            </span>
                        }
                        <button
                          type="button"
                          onClick={() => { setEditingName(name); setEditValue(name); }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-300 hover:text-blue-600 transition opacity-0 group-hover:opacity-100"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(name, count)}
                          disabled={isSaving}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-600 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Delete"
                        >
                          {isSaving
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add category */}
          {showAdd ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                autoFocus
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="e.g. Rolls, Tandoor…"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') { setShowAdd(false); setNewCat(''); }
                }}
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newCat.trim()}
                className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Add
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setNewCat(''); }}
                className="p-2 rounded-xl border hover:bg-gray-50 transition"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-orange-50/40 text-gray-400 hover:text-primary text-sm font-semibold transition mt-1"
            >
              <Plus className="w-4 h-4" /> Add New Category
            </button>
          )}
        </div>
      )}
    </div>
  );
}
