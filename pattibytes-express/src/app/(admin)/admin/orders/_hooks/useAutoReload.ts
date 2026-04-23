/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react';

interface AutoReloadOptions {
  initialEnabled  ?: boolean;
  initialInterval ?: number;
  onPersist       ?: (enabled: boolean, interval: number) => void;
}

export function useAutoReload(
  onReload : () => Promise<void> | void,
  options  : AutoReloadOptions = {},
) {
  const { initialEnabled = false, initialInterval = 30, onPersist } = options;

  const [enabled,   setEnabledState] = useState(initialEnabled);
  const [intervalS, setIntervalS]    = useState(initialInterval);
  const [countdown, setCountdown]    = useState(initialInterval);

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    if (initialEnabled !== false || initialInterval !== 30) {
      setEnabledState(initialEnabled);
      setIntervalS(initialInterval);
      setCountdown(initialInterval);
      hydrated.current = true;
    }
  }, [initialEnabled, initialInterval]);

  const cbRef = useRef(onReload);
  useEffect(() => { cbRef.current = onReload; }, [onReload]);

  // ✅ Use number (browser return type of window.setInterval), not NodeJS.Timeout
  const reloadT = useRef<number | null>(null);
  const countT  = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (reloadT.current !== null) { window.clearInterval(reloadT.current); reloadT.current = null; }
    if (countT.current  !== null) { window.clearInterval(countT.current);  countT.current  = null; }
  }, []);

  useEffect(() => {
    clear();
    setCountdown(intervalS);
    if (!enabled) return;

    // ✅ window.setInterval returns number — matches useRef<number | null>
    countT.current  = window.setInterval(
      () => setCountdown(p => (p <= 1 ? intervalS : p - 1)),
      1000,
    );
    reloadT.current = window.setInterval(() => {
      setCountdown(intervalS);
      void cbRef.current();
    }, intervalS * 1000);

    return clear;
     
  }, [enabled, intervalS, clear]);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    onPersist?.(v, intervalS);
  }, [onPersist, intervalS]);

  // ✅ Renamed to avoid shadowing global setInterval
  const setReloadInterval = useCallback((v: number) => {
    setIntervalS(v);
    setCountdown(v);
    onPersist?.(enabled, v);
  }, [onPersist, enabled]);

  return {
    enabled,
    setEnabled,
    interval   : intervalS,
    setInterval: setReloadInterval,
    countdown,
  };
}


