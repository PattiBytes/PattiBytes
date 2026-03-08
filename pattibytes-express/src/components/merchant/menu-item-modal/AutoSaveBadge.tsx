'use client';
import { CheckCircle2, CloudOff, Loader2 } from 'lucide-react';

interface Props {
  saving: boolean;
  savedAt: Date | null;
  hasUnsaved: boolean;
}

export function AutoSaveBadge({ saving, savedAt, hasUnsaved }: Props) {
  if (saving) return (
    <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold animate-pulse">
      <Loader2 size={11} className="animate-spin" /> Saving…
    </span>
  );
  if (hasUnsaved) return (
    <span className="inline-flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full font-semibold">
      <CloudOff size={11} /> Unsaved
    </span>
  );
  if (savedAt) return (
    <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-semibold">
      <CheckCircle2 size={11} />
      Saved {savedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
  return null;
}
