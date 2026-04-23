import { AlertTriangle, Shield } from 'lucide-react';
export function AdminWarningBanner() {
  return (
    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 animate-fade-in">
      <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={15} />
      <div className="text-xs text-red-800">
        <p className="font-bold flex items-center gap-1 mb-0.5"><Shield size={11} />Admin Mode</p>
        <p>Order deletion is permanent and notifies the customer. Use with care.</p>
      </div>
    </div>
  );
}


