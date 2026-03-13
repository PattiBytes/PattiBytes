/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { useRef } from 'react';
import {
  X, Upload, FileText, Copy, Loader2,
  Download, ClipboardPaste,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  bulkText: string;
  setBulkText: (v: string) => void;
  bulkBusy: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleBulkFile: (f: File | null) => void;
  handlePasteFromClipboard: () => void;
  processBulkData: (text: string, fmt: 'json' | 'csv') => void;
  downloadTemplates: () => void;
}

export function BulkUploadModal({
  open, onClose, bulkText, setBulkText, bulkBusy,
  fileInputRef, handleBulkFile, handlePasteFromClipboard,
  processBulkData, downloadTemplates,
}: Props) {
  if (!open) return null;

  const isJson = bulkText.trim().startsWith('{') || bulkText.trim().startsWith('[');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50
                    flex items-end sm:items-center justify-center p-0 sm:p-4
                    animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl
                      max-h-[90vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
          <div>
            <h3 className="font-black text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Bulk Upload Order
            </h3>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">
              JSON, CSV, or XLSX — auto-fills the entire form
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400
                       hover:text-gray-600 transition-all hover:scale-110 active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* File drop zone */}
          <label className={`flex flex-col items-center justify-center gap-3
                             border-2 border-dashed rounded-2xl p-8 cursor-pointer
                             transition-all duration-200 ${
                               bulkBusy
                                 ? 'border-gray-200 bg-gray-50 pointer-events-none opacity-60'
                                 : 'border-orange-200 hover:border-orange-400 hover:bg-orange-50/50'
                             }`}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              handleBulkFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            {bulkBusy
              ? <Loader2 className="w-8 h-8 animate-spin text-primary" />
              : <Upload className="w-8 h-8 text-orange-400" />
            }
            <div className="text-center">
              <p className="font-bold text-gray-700 text-sm">
                {bulkBusy ? 'Processing…' : 'Drop file here or click to browse'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Supports .json · .csv · .xlsx · .xls</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.xlsx,.xls"
              className="hidden"
              onChange={e => handleBulkFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {/* Divider */}
          <div className="flex items-center gap-3 text-xs text-gray-400 font-semibold">
            <div className="flex-1 h-px bg-gray-200" />OR paste JSON / CSV below
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Text area */}
          <div className="relative">
            <textarea
              rows={8}
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={'{\n  "merchant_id": "UUID",\n  "customer_name": "Name",\n  "items": [...]\n}'}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-xs font-mono
                         focus:ring-2 focus:ring-primary/30 focus:border-primary
                         resize-none bg-gray-50 transition"
              spellCheck={false}
            />
            {bulkText && (
              <span className={`absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full ${
                isJson ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
              }`}>
                {isJson ? 'JSON' : 'CSV'}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200
                         text-sm font-bold text-gray-600 hover:bg-gray-50
                         hover:border-gray-300 transition-all"
            >
              <ClipboardPaste className="w-4 h-4" /> Paste clipboard
            </button>
            <button
              type="button"
              onClick={downloadTemplates}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200
                         text-sm font-bold text-gray-600 hover:bg-gray-50
                         hover:border-gray-300 transition-all"
            >
              <Download className="w-4 h-4" /> Download template
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-bold text-gray-600
                       hover:bg-gray-50 transition-all text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={!bulkText.trim() || bulkBusy}
            onClick={() => processBulkData(bulkText, isJson ? 'json' : 'csv')}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-orange-600
                       text-white font-black text-sm disabled:opacity-40
                       hover:shadow-lg hover:shadow-orange-200/50 transition-all
                       flex items-center justify-center gap-2"
          >
            {bulkBusy
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              : <><FileText className="w-4 h-4" /> Load into Form</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
