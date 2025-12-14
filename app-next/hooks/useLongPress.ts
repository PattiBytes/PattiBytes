// app-next/hooks/useLongPress.ts
import { useCallback, useMemo, useRef, useState } from 'react';

export type Options = {
  ms?: number;
  moveTolerancePx?: number;
  preventContextMenu?: boolean;
  shouldStart?: (e: React.PointerEvent) => boolean;
};

export type LongPressHandlers = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
};

export function useLongPress(onLongPress: () => void, opts: Options = {}) {
  const {
    ms = 420,
    moveTolerancePx = 10,
    preventContextMenu = true,
    shouldStart,
  } = opts;

  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [pressed, setPressed] = useState(false);

  const clear = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    startRef.current = null;
    setPressed(false);
  }, []);

  const start = useCallback(
    (x: number, y: number) => {
      startRef.current = { x, y };
      setPressed(true);

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setPressed(false);
        onLongPress();
      }, ms);
    },
    [ms, onLongPress]
  );

  const move = useCallback(
    (x: number, y: number) => {
      if (!startRef.current) return;
      const dx = Math.abs(x - startRef.current.x);
      const dy = Math.abs(y - startRef.current.y);
      if (dx > moveTolerancePx || dy > moveTolerancePx) clear();
    },
    [clear, moveTolerancePx]
  );

  const handlers: LongPressHandlers = useMemo(
    () => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (shouldStart && !shouldStart(e)) return;
        if (typeof e.button === 'number' && e.button !== 0) return; // left-click only
        start(e.clientX, e.clientY);
      },
      onPointerMove: (e: React.PointerEvent) => move(e.clientX, e.clientY),
      onPointerUp: clear,
      onPointerCancel: clear,
      onPointerLeave: clear,
      onContextMenu: (e: React.MouseEvent) => {
        if (!preventContextMenu) return;
        e.preventDefault();
      },
    }),
    [clear, move, preventContextMenu, shouldStart, start]
  );

  return { pressed, handlers, cancel: clear };
}
