'use client';
import { Loader2, Save, ExternalLink } from 'lucide-react';
import { toINR } from './utils';

interface Props {
  totalAmount: number;
  itemCount: number;
  submitting: boolean;
  onCreateAndOpen: () => void;
  onCreate: () => void;
}

export function OrderSummaryBar({
  totalAmount, itemCount, submitting, onCreateAndOpen, onCreate,
}: Props) {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-40
                    bg-white/90 backdrop-blur-md border-t-2 border-orange-100
                    shadow-[0_-4px_24px_-4px_rgba(249,115,22,0.15)]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row
                      items-center justify-between gap-3">

        {/* Summary */}
        <div className="flex items-center gap-4">
          <div className="text-center sm:text-left">
            <p className="text-xs text-gray-400 font-semibold">Order Total</p>
            <p className="text-2xl font-black text-primary leading-tight">
              {toINR(totalAmount)}
            </p>
          </div>
          {itemCount > 0 && (
            <div className="h-10 w-px bg-gray-200 hidden sm:block" />
          )}
          {itemCount > 0 && (
            <div className="text-center sm:text-left">
              <p className="text-xs text-gray-400 font-semibold">Items</p>
              <p className="text-lg font-black text-gray-700">{itemCount}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onCreateAndOpen}
            disabled={submitting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2
                       px-4 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-sm
                       hover:bg-gray-800 disabled:opacity-50 transition-all
                       hover:scale-105 active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            Create & Open
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={submitting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2
                       px-6 py-2.5 rounded-xl
                       bg-gradient-to-r from-primary to-orange-600
                       text-white font-black text-sm
                       hover:shadow-lg hover:shadow-orange-200/60
                       hover:scale-105 active:scale-95
                       disabled:opacity-50 transition-all duration-200"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              : <><Save className="w-4 h-4" /> Create Order</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}


