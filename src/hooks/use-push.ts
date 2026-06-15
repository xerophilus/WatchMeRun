import { useEffect, useState } from 'react';

import { isConfigured } from '@/lib/config';
import { ensurePushRegistration, type PushRegistration } from '@/lib/push';

/**
 * Requests push permission and registers the device token once per app launch.
 * Returns the latest outcome so a screen can show the "enable notifications"
 * banner when permission is denied.
 */
export function usePushRegistration(): PushRegistration | null {
  const [result, setResult] = useState<PushRegistration | null>(null);

  useEffect(() => {
    if (!isConfigured) return;
    let active = true;
    ensurePushRegistration().then((r) => {
      if (active) setResult(r);
    });
    return () => {
      active = false;
    };
  }, []);

  return result;
}
