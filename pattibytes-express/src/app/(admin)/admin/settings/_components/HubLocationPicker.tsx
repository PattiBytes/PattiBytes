'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MapPin, Search, Loader2, Navigation, X,
  Map, Copy, Check, Crosshair, Eye, EyeOff,
} from 'lucide-react';
import { MapPicker } from './MapPicker';

interface LocationResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  lat?: number;
  lng?: number;
  address?: string;
  onChange: (lat: number, lng: number, address: string) => void;
}

const KEY = process.env.NEXT_PUBLIC_LOCATIONIQ_KEY ?? '';

async function reverseGeocode(la: number, lo: number): Promise<string> {
  try {
    const res  = await fetch(`https://us1.locationiq.com/v1/reverse?key=${KEY}&lat=${la}&lon=${lo}&format=json`);
    const data = await res.json() as { display_name?: string };
    return data?.display_name ?? `${la.toFixed(6)}, ${lo.toFixed(6)}`;
  } catch {
    return `${la.toFixed(6)}, ${lo.toFixed(6)}`;
  }
}

export function HubLocationPicker({ lat, lng, address, onChange }: Props) {
  const [query,       setQuery]       = useState<string>('');
  const [results,     setResults]     = useState<LocationResult[]>([]);
  const [searching,   setSearching]   = useState<boolean>(false);
  const [open,        setOpen]        = useState<boolean>(false);
  const [latInput,    setLatInput]    = useState<string>(String(lat ?? ''));
  const [lngInput,    setLngInput]    = useState<string>(String(lng ?? ''));
  const [showMap,     setShowMap]     = useState<boolean>(true);
  const [copied,      setCopied]      = useState<boolean>(false);
  const [locating,    setLocating]    = useState<boolean>(false);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef  = useRef<HTMLDivElement>(null);

  /* ── Sync props → inputs ── */
  useEffect(() => { setLatInput(lat != null ? String(lat) : ''); }, [lat]);
  useEffect(() => { setLngInput(lng != null ? String(lng) : ''); }, [lng]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  /* ── LocationIQ search ── */
  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const url  = `https://us1.locationiq.com/v1/search?key=${KEY}&q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=in`;
      const res  = await fetch(url);
      const data = await res.json();
      setResults(Array.isArray(data) ? (data as LocationResult[]) : []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void search(v); }, 450);
  };

  const selectResult = (r: LocationResult) => {
    const la = parseFloat(r.lat);
    const lo = parseFloat(r.lon);
    onChange(la, lo, r.display_name);
    setLatInput(la.toFixed(7));
    setLngInput(lo.toFixed(7));
    setQuery(r.display_name.slice(0, 80));
    setOpen(false);
    setResults([]);
  };

  /* ── Manual coords (on blur) ── */
  const handleManualBlur = async () => {
    const la = parseFloat(latInput);
    const lo = parseFloat(lngInput);
    if (!isNaN(la) && !isNaN(lo)) {
      const addr = await reverseGeocode(la, lo);
      onChange(la, lo, addr);
    }
  };

  /* ── Map click / drag pin ── */
  const handleMapPin = async (la: number, lo: number) => {
    setLatInput(la.toFixed(7));
    setLngInput(lo.toFixed(7));
    const addr = await reverseGeocode(la, lo);
    onChange(la, lo, addr);
    setQuery(addr.slice(0, 80));
  };

  /* ── GPS / device location ── */
  const useMyLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported by your browser'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        setLatInput(la.toFixed(7));
        setLngInput(lo.toFixed(7));
        const addr = await reverseGeocode(la, lo);
        onChange(la, lo, addr);
        setQuery(addr.slice(0, 80));
        setLocating(false);
      },
      () => { setLocating(false); alert('Could not get location. Please allow location access.'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  /* ── Copy coords ── */
  const copyCoords = () => {
    if (lat == null || lng == null) return;
    void navigator.clipboard.writeText(`${lat.toFixed(7)}, ${lng.toFixed(7)}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const hasCoords    = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
  const mapLat       = hasCoords ? (lat as number) : 31.2837165;
  const mapLng       = hasCoords ? (lng as number) : 74.847114;

  return (
    <div className="space-y-4">

      {/* ── Search bar ── */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            {searching && (
              <Loader2 size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary animate-spin pointer-events-none" />
            )}
            <input
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder="Search location (e.g. Patti, Punjab)…"
              className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
            />
            {query && (
              <button type="button"
                onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                <X size={14} />
              </button>
            )}
          </div>

          {/* GPS button */}
          <button type="button" onClick={useMyLocation} disabled={locating || searching}
            title="Use my device location"
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 hover:scale-105 transition-all disabled:opacity-60 shadow-md flex-shrink-0">
            {locating ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
            <span className="hidden sm:inline">{locating ? 'Locating…' : 'My Location'}</span>
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {open && results.length > 0 && (
          <div className="absolute z-[200] top-full left-0 right-12 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-2xl overflow-hidden">
            {results.map(r => (
              <button key={r.place_id} type="button" onClick={() => selectResult(r)}
                className="w-full text-left px-4 py-3 hover:bg-orange-50 hover:border-l-4 hover:border-l-primary transition-all flex items-start gap-3 border-b border-gray-100 last:border-0">
                <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-gray-800 leading-snug">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Manual coordinate inputs ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="flex items-center gap-1 text-xs font-bold text-gray-600 mb-1.5">
            <Crosshair size={11} className="text-primary" /> Latitude
          </label>
          <input type="number" step="any" value={latInput}
            onChange={e => setLatInput(e.target.value)}
            onBlur={() => void handleManualBlur()}
            placeholder="31.2837165"
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs font-bold text-gray-600 mb-1.5">
            <Crosshair size={11} className="text-primary" /> Longitude
          </label>
          <input type="number" step="any" value={lngInput}
            onChange={e => setLngInput(e.target.value)}
            onBlur={() => void handleManualBlur()}
            placeholder="74.847114"
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
        </div>
      </div>

      {/* ── Resolved address chip ── */}
      {address && (
        <div className="flex items-start gap-2 bg-green-50 border-2 border-green-200 rounded-xl px-4 py-3">
          <MapPin size={14} className="text-green-600 shrink-0 mt-0.5" />
          <p className="text-xs text-green-800 font-medium leading-relaxed flex-1">{address}</p>
          <button onClick={copyCoords} title="Copy coordinates"
            className="shrink-0 p-1.5 rounded-lg hover:bg-green-200 transition text-green-600">
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      )}

      {/* ── Map toggle ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map size={15} className="text-gray-500" />
          <span className="text-sm font-bold text-gray-700">Interactive Map</span>
          {hasCoords && (
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
              📍 Pin set
            </span>
          )}
        </div>
        <button type="button" onClick={() => setShowMap(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition hover:scale-105
            ${showMap ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
          {showMap ? <><EyeOff size={12} /> Hide Map</> : <><Eye size={12} /> Show Map</>}
        </button>
      </div>

      {/* ── Map hint ── */}
      {showMap && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5 -mt-1">
          <MapPin size={11} className="text-primary" />
          Click anywhere on the map or drag the 📍 marker to set the hub location
        </p>
      )}

      {/* ── Leaflet map ── */}
      {showMap && (
        <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-gray-200"
          style={{ zIndex: 0 }}>
          <MapPicker
            lat={mapLat}
            lng={mapLng}
            tileKey={KEY}
            onPinChange={la_lo => void handleMapPin(la_lo, mapLng)}
          />
        </div>
      )}

      {/* ── External map links ── */}
      {hasCoords && (
        <div className="flex flex-wrap gap-2">
          <a href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-gray-200 text-xs font-bold text-gray-600 hover:border-primary hover:text-primary transition hover:scale-105 shadow-sm">
            📍 Google Maps
          </a>
          <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-gray-200 text-xs font-bold text-gray-600 hover:border-primary hover:text-primary transition hover:scale-105 shadow-sm">
            🗺 OpenStreetMap
          </a>
          <a href={`https://maps.apple.com/?q=${lat},${lng}`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-gray-200 text-xs font-bold text-gray-600 hover:border-primary hover:text-primary transition hover:scale-105 shadow-sm">
            🍎 Apple Maps
          </a>
        </div>
      )}
    </div>
  );
}
