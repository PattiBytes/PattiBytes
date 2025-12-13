import React, { useEffect } from 'react';
import styles from '@/styles/ActionSheet.module.css';

export type SheetAction = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

export default function ActionSheet({
  open,
  title,
  actions,
  onClose,
}: {
  open: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {title ? <div className={styles.title}>{title}</div> : null}

        <div className={styles.group}>
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={`${styles.action} ${a.destructive ? styles.destructive : ''}`}
              onClick={() => {
                a.onPress();
                onClose();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>

        <button type="button" className={styles.cancel} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
