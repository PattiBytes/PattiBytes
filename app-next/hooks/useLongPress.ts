import { useCallback, useMemo, useRef, useState } from 'react';

type Options = {
  ms?: number;
  moveTolerancePx?: number;
  preventContextMenu?: boolean;
};

export function useLongPress(
  onLongPress: () => void,
  opts: Options = {}
) {
  const { ms = 420, moveTolerancePx = 10, preventContextMenu = true } = opts;

  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [pressed, setPressed] = useState(false);

  const clear = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    startRef.current = null;
    setPressed(false);
  }, []);

  const start = useCallback((x: number, y: number) => {
    startRef.current = { x, y };
    setPressed(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setPressed(false);
      onLongPress();
    }, ms);
  }, [ms, onLongPress]);

  const move = useCallback((x: number, y: number) => {
    if (!startRef.current) return;
    const dx = Math.abs(x - startRef.current.x);
    const dy = Math.abs(y - startRef.current.y);
    if (dx > moveTolerancePx || dy > moveTolerancePx) clear();
  }, [clear, moveTolerancePx]);

  const handlers = useMemo(() => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button && e.button !== 0) return; // only left click
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
  }), [clear, move, preventContextMenu, start]);

  return { pressed, handlers, cancel: clear };
}
