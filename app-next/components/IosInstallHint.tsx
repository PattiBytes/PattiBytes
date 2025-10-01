// /app-next/components/IosInstallHint.tsx
import { isStandalone, isiOS } from '@/lib/ios-install';
import { useEffect, useState } from 'react';

export default function IosInstallHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (isiOS() && !isStandalone()) setShow(true);
  }, []);
  if (!show) return null;
  return (
    <div role="dialog" aria-live="polite" className="ios-hint">
      iOS ‘ਤੇ ਇੰਸਟਾਲ ਕਰਨ ਲਈ Share → Add to Home Screen ਚੁਣੋ। 
    </div>
  );
}
