import { useEffect, useState } from 'react';

import { ensurePushRegistration, type PushRegistration } from '@/lib/push';
import { useSession } from '@/lib/session';

/**
 * Requests push permission and registers the device token for the signed-in
 * runner once per session. Returns the latest outcome so a screen can show the
 * "enable notifications" banner when permission is denied. No-op until signed in.
 */
export function usePushRegistration(): PushRegistration | null {
  const { me } = useSession();
  const [result, setResult] = useState<PushRegistration | null>(null);

  useEffect(() => {
    if (!me) return;
    let active = true;
    ensurePushRegistration(me.id, me.name).then((r) => {
      if (active) setResult(r);
    });
    return () => {
      active = false;
    };
  }, [me]);

  return result;
}
