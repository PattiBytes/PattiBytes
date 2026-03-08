 
'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { FileText, Printer, Loader2, Image as ImageIcon } from 'lucide-react';
import { getSafeImageSrc } from '@/lib/safeImage';
import { type MenuItem, finalPrice } from '../../_components/types';

interface Props {
  open: boolean;
  onClose: () => void;
  restaurantName: string;
  merchantLogo: string | null;
  flatItems: MenuItem[];
  renderAll: boolean;
  onSetRenderAll: (v: boolean) => void;
  onAdd: (item: MenuItem) => void;
}

export function MenuSheetModal({
  open, onClose,
  restaurantName, merchantLogo,
  flatItems, renderAll, onSetRenderAll, onAdd,
}: Props) {
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const printSheet = () => {
    const content = sheetRef.current;
    if (!content) return;

    document.getElementById('__print_sheet__')?.remove();

    const wrapper = document.createElement('div');
    wrapper.id = '__print_sheet__';
    Object.assign(wrapper.style, {
      position: 'fixed', left: '0', top: '0',
      width: '100%', background: 'white', zIndex: '99999',
    });
    wrapper.appendChild(content.cloneNode(true));
    document.body.appendChild(wrapper);

    window.print();
    setTimeout(() => wrapper.remove(), 700);
  };

  if (!open) return null;

  const previewItems = renderAll ? flatItems : flatItems.slice(0, 120);

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-8">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
            <div className="font-extrabold text-gray-900">Menu sheet preview</div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onSetRenderAll(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl font-extrabold border border-gray-200 hover:bg-gray-50 text-sm"
                title="Render all items"
              >
                {renderAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Render all
              </button>

              <button
                onClick={printSheet}
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-xl font-extrabold hover:bg-gray-800 text-sm"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </button>

              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl font-extrabold border border-gray-200 hover:bg-gray-50 text-sm"
              >
                Close
              </button>
            </div>
          </div>

          {/* Sheet preview */}
          <div className="max-h-[80vh] overflow-auto bg-gray-100 p-4">
            <div
              ref={sheetRef}
              className="mx-auto bg-white shadow rounded-lg"
              style={{ width: '794px', minHeight: '1123px', padding: '28px' }}
            >
              {/* Sheet header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                  {merchantLogo ? (
                    <Image src={merchantLogo} alt="Logo" width={56} height={56} className="object-cover w-full h-full" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-gray-900">{restaurantName}</div>
                  <div className="text-sm text-gray-600 font-semibold">
                    Full menu sheet · Items: {flatItems.length}
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-200 mb-4" />

              {/* Items grid */}
              <div className="grid grid-cols-2 gap-4">
                {previewItems.map((item) => {
                  const img   = getSafeImageSrc(item.image_url);
                  const price = finalPrice(item.price, item.discount_percentage);

                  return (
                    <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="flex">
                        <div className="relative w-24 h-24 bg-gray-100 flex-shrink-0">
                          {img ? (
                            <Image src={img} alt={item.name} fill className="object-cover" sizes="96px" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        <div className="p-3 flex-1 min-w-0">
                          <div className="font-extrabold text-gray-900 truncate">{item.name}</div>
                          <div className="text-xs text-gray-600 truncate">{item.category || 'Other'}</div>
                          {item.description && (
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</div>
                          )}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="font-extrabold text-gray-900">₹{price.toFixed(2)}</div>
                            <button
                              onClick={() => onAdd(item)}
                              className="bg-primary text-white px-3 py-1.5 rounded-lg font-extrabold hover:bg-orange-600 text-sm"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-xs text-gray-500 mt-6 font-semibold">
                Use Print / Save PDF to export this sheet.
              </div>
            </div>

            {!renderAll && flatItems.length > 120 && (
              <div className="text-xs text-gray-700 mt-3 text-center font-semibold">
                Preview showing first 120 of {flatItems.length}. Click &quot;Render all&quot; to include all.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #__print_sheet__, #__print_sheet__ * { visibility: visible !important; }
          #__print_sheet__ { position: static !important; }
        }
      `}</style>
    </div>
  );
}
