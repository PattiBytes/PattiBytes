'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
// ✅ Fix 1: NotFoundException is in @zxing/library
import { NotFoundException } from '@zxing/library';
import { supabase } from '@/lib/supabase';
import { X, ScanLine, ExternalLink, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

// ✅ Fix 2: Define toINR locally — avoids any path issue entirely
const toINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:2 }).format(n);

// ✅ Fix 3: ZXing controls type — returned by decodeFromVideoDevice
type ZxingControls = Awaited<ReturnType<BrowserMultiFormatReader['decodeFromVideoDevice']>>;

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScannedOrder {
  id:               string;
  order_number:     string;
  status:           string;
  payment_status:   string;
  payment_method:   string;
  total_amount:     number;
  created_at:       string;
  customer_phone:   string | null;
  delivery_address: string | null;
  items_count:      number;
}
type ScanState = 'idle' | 'scanning' | 'loading' | 'found' | 'not_found' | 'error';

const STATUS_CLS: Record<string,string> = {
  delivered:'bg-green-50 text-green-700 border-green-300',
  completed:'bg-green-50 text-green-700 border-green-300',
  cancelled:'bg-red-50 text-red-700 border-red-300',
  pending:  'bg-yellow-50 text-yellow-700 border-yellow-300',
  confirmed:'bg-blue-50 text-blue-700 border-blue-300',
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function BarcodeScanner() {
  const [open,        setOpen]        = useState(false);
  const [scanState,   setScanState]   = useState<ScanState>('idle');
  const [scannedData, setScannedData] = useState<ScannedOrder | null>(null);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [lastRaw,     setLastRaw]     = useState('');
  const [scanCount,   setScanCount]   = useState(0); // how many successful scans this session

  const videoRef    = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ZxingControls | null>(null); // ✅ Fix 3: controls, not reader
  const cooldown    = useRef(false);

  // ── Extract order number from scanned URL or plain string ──────────────────
  const extractOrderNumber = (raw: string): string => {
    try {
      const parts = new URL(raw).pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] ?? raw;
    } catch {
      return raw.trim();
    }
  };

  // ── Supabase lookup ────────────────────────────────────────────────────────
  const lookupOrder = useCallback(async (raw: string) => {
    if (cooldown.current) return;
    cooldown.current = true;
    setLastRaw(raw);
    setScanState('loading');

    const orderNumber = extractOrderNumber(raw);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, status, payment_status, payment_method,
          total_amount, created_at, customer_phone, delivery_address,
          order_items(count)
        `)
        .or(`order_number.eq.${orderNumber},id.eq.${orderNumber}`)
        .maybeSingle();

      if (error) throw error;
      if (!data)  { setScanState('not_found'); return; }

      setScannedData({
        id:               data.id,
        order_number:     data.order_number ?? orderNumber,
        status:           data.status ?? 'unknown',
        payment_status:   data.payment_status ?? 'unknown',
        payment_method:   data.payment_method ?? 'N/A',
        total_amount:     Number(data.total_amount ?? 0),
        created_at:       data.created_at,
        customer_phone:   data.customer_phone ?? null,
        delivery_address: data.delivery_address ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items_count:      (data.order_items as any)?.[0]?.count ?? 0,
      });
      setScanState('found');
      setScanCount(c => c + 1);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Lookup failed');
      setScanState('error');
    }

    // Re-allow after 4s
    setTimeout(() => { cooldown.current = false; }, 4000);
  }, []);

  // ── Stop camera ────────────────────────────────────────────────────────────
  // ✅ Fix 3: controls.stop() is the correct ZXing browser API
  const stopScanner = useCallback(() => {
    try { controlsRef.current?.stop(); } catch { /* already stopped */ }
    controlsRef.current = null;
    // Belt-and-suspenders: kill raw media tracks too
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // ── Start camera ───────────────────────────────────────────────────────────
  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;
    setScanState('scanning');
    setScannedData(null);
    setErrorMsg('');

    try {
      const reader   = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, err) => {
          if (result) void lookupOrder(result.getText());
          if (err && !(err instanceof NotFoundException)) {
            console.warn('[BarcodeScanner]', err);
          }
        },
      );
      controlsRef.current = controls; // ✅ store controls
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setErrorMsg(
        msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')
          ? 'Camera permission denied. Enable it in browser settings.'
          : msg || 'Failed to start camera',
      );
      setScanState('error');
    }
  }, [lookupOrder]);

  // ── Open / close / rescan ──────────────────────────────────────────────────
  const handleOpen  = () => { setOpen(true); setScanState('idle'); setScannedData(null); setScanCount(0); };
  const handleClose = () => { stopScanner(); setOpen(false); setScanState('idle'); setScannedData(null); cooldown.current = false; };
  const handleRescan = () => {
    setScannedData(null); setErrorMsg(''); cooldown.current = false;
    // If camera is still running just reset state, else restart
    if (controlsRef.current) { setScanState('scanning'); }
    else { void startScanner(); }
  };

  useEffect(() => {
    if (open && scanState === 'idle') void startScanner();
  }, [open, scanState, startScanner]);

  useEffect(() => () => { stopScanner(); }, [stopScanner]);

  const fmtDate = (d: string) => new Date(d).toLocaleString('en-IN',{
    day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true,
  });

  const statusCls = STATUS_CLS[(scannedData?.status ?? '').toLowerCase()] ?? 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <>
      {/* ── Trigger ── */}
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200
          bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 shadow-sm transition"
        title="Scan bill barcode"
      >
        <ScanLine className="w-4 h-4" />
        Scan Bill
      </button>

      {/* ── Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b">
              <div className="flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-gray-600" />
                <h2 className="font-bold text-gray-900 text-sm">Scan Order Barcode</h2>
                {scanCount > 0 && (
                  <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">
                    {scanCount} scanned
                  </span>
                )}
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Camera */}
            <div className={`relative bg-black transition-all duration-300 ${
              scanState === 'scanning' ? 'h-52' : 'h-0 overflow-hidden'
            }`}>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {/* Scan guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-16 border-2 border-white/50 rounded">
                  {/* animated red scan line */}
                  <div className="animate-scan-line absolute inset-x-0 h-0.5 bg-red-400/90" />
                  {/* corner accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white rounded-tl" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white rounded-br" />
                  <span className="absolute -top-6 left-0 right-0 text-center text-[10px] text-white/70 font-medium">
                    Align barcode within frame
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-5 min-h-[120px]">

              {/* Scanning hint */}
              {scanState === 'scanning' && (
                <p className="text-center text-xs text-gray-400 mt-1">
                  Looking for Code 128 barcode on printed bill…
                </p>
              )}

              {/* Loading */}
              {scanState === 'loading' && (
                <div className="flex flex-col items-center gap-3 py-3">
                  <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
                  <p className="text-sm font-semibold text-gray-600">Looking up order…</p>
                  <p className="text-[11px] text-gray-400 font-mono truncate max-w-full">{lastRaw.slice(0,52)}</p>
                </div>
              )}

              {/* Not found */}
              {scanState === 'not_found' && (
                <div className="flex flex-col items-center gap-3 py-3">
                  <AlertCircle className="w-7 h-7 text-yellow-500" />
                  <p className="text-sm font-bold text-gray-800">Order not found</p>
                  <p className="text-xs text-gray-500 text-center">
                    No match for{' '}
                    <code className="bg-gray-100 px-1 rounded text-[11px]">{extractOrderNumber(lastRaw)}</code>
                  </p>
                  <button onClick={handleRescan} className="text-xs font-bold text-gray-600 underline underline-offset-2">Scan again</button>
                </div>
              )}

              {/* Error */}
              {scanState === 'error' && (
                <div className="flex flex-col items-center gap-3 py-3">
                  <AlertCircle className="w-7 h-7 text-red-500" />
                  <p className="text-sm font-bold text-gray-800 text-center max-w-[240px]">{errorMsg}</p>
                  <button onClick={handleRescan} className="text-xs font-bold text-gray-600 underline underline-offset-2">Try again</button>
                </div>
              )}

              {/* ✅ Found */}
              {scanState === 'found' && scannedData && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="font-bold text-gray-900 text-sm">Order found</span>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border ${statusCls}`}>
                      {scannedData.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Details table */}
                  <div className="rounded-xl border border-gray-100 divide-y divide-gray-100 text-[12.5px] bg-gray-50">
                    {([
                      ['Order #',   scannedData.order_number],
                      ['Total',     toINR(scannedData.total_amount)],
                      ['Items',     `${scannedData.items_count} item(s)`],
                      ['Payment',   `${scannedData.payment_method.toUpperCase()} · ${scannedData.payment_status.toUpperCase()}`],
                      ['Phone',     scannedData.customer_phone ?? 'N/A'],
                      ['Address',   scannedData.delivery_address ?? 'N/A'],
                      ['Placed',    fmtDate(scannedData.created_at)],
                    ] as [string,string][]).map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-3 px-3 py-1.5">
                        <span className="text-gray-400 shrink-0 text-[11px]">{label}</span>
                        <span className="font-semibold text-gray-900 text-right break-words max-w-[190px] text-[11.5px]">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/admin/orders/${scannedData.id}`}
                      onClick={handleClose}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                        bg-gray-900 text-white text-xs font-bold hover:bg-black transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Order
                    </Link>
                    <button
                      onClick={handleRescan}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold
                        text-gray-700 hover:bg-gray-50 transition"
                    >
                      Scan Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan-line {
          0%,100% { top:0 }
          50%      { top:calc(100% - 2px) }
        }
        .animate-scan-line {
          animation: scan-line 1.6s ease-in-out infinite;
          position:absolute; left:0; right:0; height:2px;
        }
      `}</style>
    </>
  );
}