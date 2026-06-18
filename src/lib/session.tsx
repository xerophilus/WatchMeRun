import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { fetchWatching, provisionRunner } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Runner } from '@/lib/types';

/**
 * The app's identity layer. Tracks the Supabase auth session, the signed-in
 * user's own runner profile (`me`), the people they watch, and which runner is
 * currently being viewed (the person-switcher). Everything else reads from here
 * rather than a build-time runner id.
 *
 * States the UI gates on:
 *   loading            -> show splash
 *   session == null    -> sign-in screen
 *   session && !me     -> onboarding (create/claim profile)
 *   session && me      -> the app
 */
type SessionState = {
  loading: boolean;
  session: Session | null;
  me: Runner | null;
  watching: Runner[];
  /** Runner currently shown on This Week / Live. Defaults to `me`. */
  viewedId: string | null;
  setViewedId: (id: string) => void;
  /** Reload `me` (after creating a profile) and the watching list. */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Runner | null>(null);
  const [watching, setWatching] = useState<Runner[]>([]);
  const [viewedId, setViewedId] = useState<string | null>(null);

  const loadProfile = useCallback(async (active: () => boolean) => {
    // provision-runner returns the existing runner, or null if none yet.
    const runner = await provisionRunner().catch(() => null);
    if (!active()) return;
    setMe(runner);
    if (runner) {
      const people = await fetchWatching(runner.id).catch(() => []);
      if (!active()) return;
      setWatching(people);
      // Default the switcher to "me" the first time we learn who we are.
      setViewedId((cur) => cur ?? runner.id);
    } else {
      setWatching([]);
      setViewedId(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const active = () => mounted;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active()) return;
        setSession(data.session);
        if (data.session) await loadProfile(active);
      })
      .catch(() => {
        // Fall through: clearing `loading` below routes to sign-in rather than
        // leaving the app stuck on the splash spinner.
      })
      .finally(() => {
        if (active()) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active()) return;
      // The initial session is already handled by getSession() above.
      if (event === 'INITIAL_SESSION') return;
      setSession(next);
      if (next) {
        // IMPORTANT: never await another supabase call synchronously inside this
        // callback. supabase-js holds an internal auth lock for the callback's
        // duration, and loadProfile() -> provisionRunner() calls getSession()
        // again — doing that here deadlocks and hangs the app on the splash
        // spinner. Defer the profile load so the callback returns and frees the
        // lock first.
        setTimeout(() => {
          if (active()) loadProfile(active);
        }, 0);
      } else {
        setMe(null);
        setWatching([]);
        setViewedId(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refresh = useCallback(async () => {
    await loadProfile(() => true);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<SessionState>(
    () => ({ loading, session, me, watching, viewedId, setViewedId, refresh, signOut }),
    [loading, session, me, watching, viewedId, refresh, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>');
  return ctx;
}

/** Everyone you can view: yourself first, then the people you watch. */
export function useViewablePeople(): Runner[] {
  const { me, watching } = useSession();
  return useMemo(() => (me ? [me, ...watching] : []), [me, watching]);
}
