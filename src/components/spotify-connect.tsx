import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { disconnectSpotify, fetchSpotifyStatus, getSpotifyConnectUrl } from '@/lib/api';

const RETURN_URL = 'watchmerun://spotify-connected';

const ERROR_COPY: Record<string, string> = {
  access_denied: 'You declined the Spotify permission.',
  invalid_state: 'That connect link expired — try again.',
  expired_state: 'That connect link expired — try again.',
  exchange_failed: "Spotify wouldn't complete the connection.",
  store_failed: "Couldn't save the connection. Try again.",
};

/**
 * Personal setting: connect this runner's own Spotify so their now-playing shows
 * on Live for the people who watch them. Opens Spotify's authorize page in an
 * auth session; the server stores the refresh token and bounces back here.
 */
export function SpotifyConnect() {
  const theme = useTheme();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setConnected(await fetchSpotifyStatus());
    } catch {
      /* keep the last known state */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onConnect() {
    setBusy(true);
    setError(null);
    try {
      const url = await getSpotifyConnectUrl();
      const result = await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
      if (result.type === 'success' && result.url) {
        const code = Linking.parse(result.url).queryParams?.error;
        if (typeof code === 'string') {
          setError(ERROR_COPY[code] ?? 'Spotify connection failed.');
        }
      }
      await refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  async function onDisconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectSpotify();
      setConnected(false);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
        MUSIC
      </ThemedText>
      <View style={styles.row}>
        <View style={styles.body}>
          <ThemedText type="default" style={styles.title}>
            Spotify
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {connected
              ? 'Connected — your now-playing shows on Live.'
              : 'Connect to share what you run to.'}
          </ThemedText>
        </View>
        <Pressable
          onPress={connected ? onDisconnect : onConnect}
          disabled={busy || connected === null}
          style={[
            styles.button,
            { backgroundColor: connected ? theme.backgroundSelected : '#1DB954' },
            busy || connected === null ? styles.disabled : undefined,
          ]}>
          {busy ? (
            <ActivityIndicator color={connected ? theme.text : '#fff'} />
          ) : (
            <ThemedText type="small" style={[styles.buttonText, connected ? { color: theme.text } : undefined]}>
              {connected ? 'Disconnect' : 'Connect'}
            </ThemedText>
          )}
        </Pressable>
      </View>
      {error ? (
        <ThemedText type="small" style={[styles.error, { color: theme.accent }]}>
          {error}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: Spacing.two, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  body: { flex: 1 },
  title: { fontWeight: '700' },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    minWidth: 104,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontWeight: '700', color: '#fff' },
  disabled: { opacity: 0.5 },
  error: { marginTop: Spacing.two },
});
