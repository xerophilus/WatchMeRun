import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { redeemInvite } from '@/lib/api';
import { useSession } from '@/lib/session';

/**
 * Handles invite deep links: crewd://invite?code=<code>. When such a link
 * opens the app (cold start or while running) and the user is signed in with a
 * profile, redeem the code — creating an approved follow — then refresh the
 * watch list. Codes are handled once so a re-render can't double-redeem.
 */
export function useInviteLinks() {
  const { me, refresh } = useSession();
  const url = Linking.useURL();
  const handled = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!url || !me) return;
    const { hostname, path, queryParams } = Linking.parse(url);
    const isInvite = hostname === 'invite' || path?.replace(/^\//, '') === 'invite';
    const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
    if (!isInvite || !code || handled.current.has(code)) return;

    handled.current.add(code);
    redeemInvite(code)
      .then(async () => {
        await refresh();
        Alert.alert('Added to your crew', 'You can now see their training.');
      })
      .catch((e) => {
        Alert.alert("Couldn't use that invite", String(e instanceof Error ? e.message : e));
      });
  }, [url, me, refresh]);
}
