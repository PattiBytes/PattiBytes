'use client';
import { type ReactNode, useRef, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  title: string;
  icon: ReactNode;
  badge?: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  accentColor?: string;
}

export function CollapsibleSection({ title, icon, badge, expanded, onToggle, children, accentColor = 'from-orange-50' }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>(expanded ? 'auto' : 0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (expanded) {
      const h = el.scrollHeight;
      setHeight(h);
      const t = setTimeout(() => setHeight('auto'), 350);
      return () => clearTimeout(t);
    } else {
      setHeight(el.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [expanded]);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden transition-shadow duration-300 hover:shadow-xl group"
      style={{ transformStyle: 'preserve-3d' }}>
      <button
        onClick={onToggle}
        className={`w-full px-5 py-4 flex items-center justify-between bg-gradient-to-r ${accentColor} to-white hover:brightness-95 transition-all duration-200`}
      >
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-white shadow-sm border border-gray-100 group-hover:scale-110 transition-transform duration-200">
            {icon}
          </span>
          <span className="text-base font-bold text-gray-900">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{badge}</span>
          )}
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-500 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        style={{ height: height === 'auto' ? 'auto' : `${height}px`, overflow: 'hidden', transition: 'height 0.35s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div ref={contentRef} className="px-5 py-5 border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}
