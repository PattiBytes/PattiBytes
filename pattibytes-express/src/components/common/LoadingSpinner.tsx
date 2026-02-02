import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export function PageLoadingSpinner({
  timeoutMs = 12000,
  onRetry,
}: {
  timeoutMs?: number;
  onRetry?: () => void;
}) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), timeoutMs);
    return () => clearTimeout(t);
  }, [timeoutMs]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Loading content...</p>

        {slow && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500">Taking longer than usual.</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
