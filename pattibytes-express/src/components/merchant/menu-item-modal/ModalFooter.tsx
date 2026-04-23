'use client';
import { Loader2 } from 'lucide-react';
import { MenuItem } from '@/types';

interface Props {
  item:       MenuItem | null;
  submitting: boolean;
  uploading:  boolean;
  closing:    boolean;
  onClose:    () => void;
}

export function ModalFooter({ item, submitting, uploading, closing, onClose }: Props) {
  return (
    <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t border-gray-100 -mx-5 sm:-mx-6 px-5 sm:px-6">
      <div className="flex gap-3">
        <button type="button" onClick={onClose} disabled={closing}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60">
          {closing && <Loader2 size={15} className="animate-spin" />}
          {closing ? 'Saving…' : 'Cancel'}
        </button>
        <button type="submit" disabled={submitting || uploading || closing}
          className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-orange-600 font-semibold disabled:opacity-50 transition flex items-center justify-center gap-2">
          {(submitting || uploading) && <Loader2 size={15} className="animate-spin" />}
          {submitting ? 'Saving…' : uploading ? 'Uploading…' : item ? 'Update Item' : 'Add Item'}
        </button>
      </div>
    </div>
  );
}

