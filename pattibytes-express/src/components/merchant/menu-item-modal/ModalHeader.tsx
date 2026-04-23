'use client';
import { Loader2, X } from 'lucide-react';
import { AutoSaveBadge } from './AutoSaveBadge';
import { MenuItem } from '@/types';

interface Props {
  item:       MenuItem | null;
  autoSaving: boolean;
  savedAt:    Date | null;
  hasUnsaved: boolean;
  closing:    boolean;
  onClose:    () => void;
}

export function ModalHeader({ item, autoSaving, savedAt, hasUnsaved, closing, onClose }: Props) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3 rounded-t-2xl">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-gray-900">{item ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
          {item && <AutoSaveBadge saving={autoSaving} savedAt={savedAt} hasUnsaved={hasUnsaved} />}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {item ? 'Changes autosave in background — even after clicking Cancel' : 'Fill in details and click Add Item to save'}
        </p>
      </div>
      <button onClick={onClose} disabled={closing}
        className="shrink-0 text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition disabled:opacity-50">
        {closing ? <Loader2 size={20} className="animate-spin" /> : <X size={20} />}
      </button>
    </div>
  );
}

