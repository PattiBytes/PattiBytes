'use client';
import Image from 'next/image';
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Globe, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import type { Settings, CustomLink } from './types';
import { uid, normalizeHttpUrl, normalizeMaybeMarkdownUrl, uploadToCloudinary } from './utils';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface Props { settings: Settings; onChange: (s: Settings) => void; }

export function CustomLinksSection({ settings, onChange }: Props) {
  const [draft, setDraft] = useState<CustomLink>({ id: uid(), title: '', url: '', logo_url: '', enabled: true });
  const [uploading, setUploading] = useState(false);

  const canAdd = draft.title.trim().length >= 2 && draft.url.trim().length >= 6;

  const handleLogoUpload = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setDraft(p => ({ ...p, logo_url: url }));
    } catch (e: unknown) { toast.error((e as Error)?.message ?? 'Upload failed'); }
    finally { setUploading(false); }
  };

  const add = () => {
    if (!canAdd) { toast.error('Add title and URL (logo optional)'); return; }
    const link: CustomLink = { ...draft, title: draft.title.trim(), url: normalizeHttpUrl(draft.url.trim()), logo_url: normalizeMaybeMarkdownUrl(draft.logo_url?.trim() ?? '') };
    onChange({ ...settings, custom_links: [...settings.custom_links, link] });
    setDraft({ id: uid(), title: '', url: '', logo_url: '', enabled: true });
  };

  const remove = (id: string) => onChange({ ...settings, custom_links: settings.custom_links.filter(x => x.id !== id) });
  const toggle = (id: string) => onChange({ ...settings, custom_links: settings.custom_links.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x) });
  const move = (id: string, dir: 'up' | 'down') => {
    const list = [...settings.custom_links];
    const idx = list.findIndex(x => x.id === id);
    const j = dir === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= list.length) return;
    [list[idx], list[j]] = [list[j], list[idx]];
    onChange({ ...settings, custom_links: list });
  };

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-xl border">
        <p className="text-sm font-bold text-gray-900 mb-4">Add New Custom Link</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Logo</label>
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl border bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                {draft.logo_url
                  ? <Image src={draft.logo_url} alt="Logo" width={48} height={48} className="object-cover" />
                  : <LinkIcon size={20} className="text-gray-300" />}
              </div>
              <div className="flex-1">
                <label className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-white text-xs font-semibold cursor-pointer
                  ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-700'}`}>
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => handleLogoUpload(e.target.files?.[0])} />
                </label>
                <input value={draft.logo_url} onChange={e => setDraft(p => ({ ...p, logo_url: e.target.value }))}
                  placeholder="Or paste URL" className="mt-1 w-full px-2 py-1.5 border rounded-lg text-xs" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Title *</label>
            <input value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. WhatsApp Support" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">URL *</label>
            <input value={draft.url} onChange={e => setDraft(p => ({ ...p, url: e.target.value }))}
              placeholder="https://..." className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={draft.enabled} onChange={e => setDraft(p => ({ ...p, enabled: e.target.checked }))} className="w-4 h-4 rounded" />
            Enabled
          </label>
          <button type="button" onClick={add} disabled={!canAdd}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-orange-600 transition hover:scale-105">
            <Plus size={16} /> Add Link
          </button>
        </div>
      </div>

      {/* Existing links */}
      <div className="space-y-2">
        {settings.custom_links.length === 0
          ? <p className="text-sm text-gray-500 bg-gray-50 border rounded-xl p-4 text-center">No custom links yet.</p>
          : settings.custom_links.map((l, idx) => (
            <div key={l.id} className={`border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-all hover:shadow-md ${l.enabled ? 'bg-white' : 'bg-gray-50 opacity-70'}`}>
              <div className="w-10 h-10 rounded-lg border bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                {l.logo_url ? <Image src={l.logo_url} alt={l.title} width={40} height={40} className="object-cover" /> : <Globe size={18} className="text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{l.title || 'Untitled'}</p>
                <a href={l.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate block">{l.url}</a>
                {!l.enabled && <span className="text-xs text-gray-400">Hidden</span>}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap sm:justify-end">
                {[
                  { icon: l.enabled ? <Eye size={13} /> : <EyeOff size={13} />, label: l.enabled ? 'On' : 'Off', action: () => toggle(l.id), color: '' },
                  { icon: <ArrowUp size={13} />, label: '', action: () => move(l.id, 'up'), color: '', disabled: idx === 0 },
                  { icon: <ArrowDown size={13} />, label: '', action: () => move(l.id, 'down'), color: '', disabled: idx === settings.custom_links.length - 1 },
                  { icon: <Trash2 size={13} />, label: '', action: () => remove(l.id), color: 'bg-red-50 text-red-700 border-red-200' },
                ].map((btn, bi) => (
                  <button key={bi} type="button" onClick={btn.action} disabled={btn.disabled}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 disabled:opacity-40 hover:scale-105 transition ${btn.color || 'bg-white text-gray-700'}`}>
                    {btn.icon} {btn.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}