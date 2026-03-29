'use client';
import { useEffect, useRef } from 'react';
import type { Map as LMap, Marker as LMarker } from 'leaflet';

interface Props {
  lat: number;
  lng: number;
  tileKey: string;
  onPinChange: (lat: number, lng: number) => void;
}

export function MapPicker({ lat, lng, tileKey, onPinChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<LMap | null>(null);
  const markerRef    = useRef<LMarker | null>(null);
  const cbRef        = useRef(onPinChange);
  cbRef.current = onPinChange;

  /* ── Init map once ── */
  useEffect(() => {
    if (!containerRef.current) return;

    // Inject Leaflet CSS once
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id    = 'leaflet-css';
      link.rel   = 'stylesheet';
      link.href  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    void import('leaflet').then(mod => {
      const L = mod.default;
      if (!containerRef.current || mapRef.current) return;

      // Fix default marker icons (Webpack strips them)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
      });

      // LocationIQ streets tile layer
      L.tileLayer(
        `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${tileKey}`,
        {
          attribution: '© <a href="https://locationiq.com" target="_blank">LocationIQ</a> © <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>',
          maxZoom: 19,
        }
      ).addTo(map);

      // Draggable marker
      const marker = L.marker([lat, lng], {
        draggable: true,
        title: 'Hub — drag to reposition or click anywhere on the map',
      }).addTo(map);

      marker.bindPopup(
        '<div style="text-align:center"><strong>📍 Hub Location</strong><br/><small>Drag or click map to move</small></div>'
      ).openPopup();

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        cbRef.current(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        marker.openPopup();
        cbRef.current(e.latlng.lat, e.latlng.lng);
      });

      // Double-click zooms without pin change
      map.on('dblclick', (e) => { e.originalEvent?.stopPropagation(); });

      mapRef.current    = map;
      markerRef.current = marker;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current    = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Sync external lat/lng → map ── */
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const cur = markerRef.current.getLatLng();
    if (Math.abs(cur.lat - lat) < 0.000001 && Math.abs(cur.lng - lng) < 0.000001) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.panTo([lat, lng]);
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl border-2 border-gray-200 overflow-hidden"
      style={{ height: '300px', zIndex: 0 }}
    />
  );
}