import { Trash2, X } from 'lucide-react';

interface Props { name: string; onConfirm: () => void; onCancel: () => void; }

export function DeleteConfirmModal({ name, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4
                    animate-in fade-in duration-200" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6
                      animate-in zoom-in-95 duration-200 relative"
           onClick={e => e.stopPropagation()}>
        <button onClick={onCancel} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100">
          <X className="w-5 h-5 text-gray-400" />
        </button>
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-black text-center text-gray-900 mb-2">Delete Product?</h2>
        <p className="text-center text-gray-600 text-sm mb-6">
          <span className="font-bold">&ldquo;{name}&rdquo;</span> will be permanently deleted.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

