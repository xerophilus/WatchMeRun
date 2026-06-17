import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SpotifyConnect } from '@/components/spotify-connect';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  approveFollow,
  createInvite,
  fetchIncomingRequests,
  fetchMyWatchers,
  redeemInvite,
  removeFollow,
  requestFollow,
  searchRunners,
} from '@/lib/api';
import { useSession } from '@/lib/session';
import type { IncomingRequest, Runner } from '@/lib/types';

export default function PeopleScreen() {
  const theme = useTheme();
  const { me, watching, refresh, signOut } = useSession();
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [watchers, setWatchers] = useState<Runner[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Invite + redeem + search local state.
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [redeemValue, setRedeemValue] = useState('');
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Runner[]>([]);
  const [requested, setRequested] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!me) return;
    setError(null);
    try {
      const [reqs, w] = await Promise.all([
        fetchIncomingRequests(me.id),
        fetchMyWatchers(me.id),
      ]);
      setRequests(reqs);
      setWatchers(w);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
  }, [me]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), refresh()]);
    setRefreshing(false);
  }, [load, refresh]);

  async function onCreateInvite() {
    if (!me) return;
    setBusyId('invite');
    try {
      const invite = await createInvite(me.id);
      setInviteCode(invite.code);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusyId(null);
    }
  }

  async function onShareInvite() {
    if (!inviteCode || !me) return;
    const link = `watchmerun://invite?code=${inviteCode}`;
    await Share.share({
      message: `Watch my training on WatchMeRun. Open the app, go to Crew, and enter code ${inviteCode} — or tap ${link}`,
    });
  }

  async function onRedeem() {
    const code = redeemValue.trim();
    if (!code) return;
    setBusyId('redeem');
    setRedeemMsg(null);
    try {
      await redeemInvite(code);
      setRedeemValue('');
      setRedeemMsg('Added! You can now see their training.');
      await Promise.all([load(), refresh()]);
    } catch (e) {
      setRedeemMsg(String(e instanceof Error ? e.message : e));
    } finally {
      setBusyId(null);
    }
  }

  async function onSearch(text: string) {
    setQuery(text);
    if (!me || text.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      setResults(await searchRunners(text, me.id));
    } catch {
      setResults([]);
    }
  }

  async function onRequest(runnerId: string) {
    if (!me) return;
    setBusyId(runnerId);
    try {
      await requestFollow(me.id, runnerId);
      setRequested((prev) => new Set(prev).add(runnerId));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusyId(null);
    }
  }

  async function onApprove(followId: string) {
    setBusyId(followId);
    try {
      await approveFollow(followId);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(followId: string) {
    setBusyId(followId);
    try {
      await removeFollow(followId);
      await Promise.all([load(), refresh()]);
    } finally {
      setBusyId(null);
    }
  }

  if (!me) return null;

  return (
    <Screen title="Crew" subtitle={`@${me.handle ?? '—'}`} refreshing={refreshing} onRefresh={onRefresh}>
      {error ? (
        <ThemedText type="small" style={{ color: theme.accent }}>
          {error}
        </ThemedText>
      ) : null}

      {/* Incoming watch requests */}
      {requests.length > 0 ? (
        <Card>
          <SectionLabel>WANTS TO WATCH YOU</SectionLabel>
          {requests.map((r) => (
            <View key={r.follow.id} style={styles.personRow}>
              <Person runner={r.watcher} />
              <View style={styles.rowActions}>
                <SmallButton
                  label="Approve"
                  primary
                  busy={busyId === r.follow.id}
                  onPress={() => onApprove(r.follow.id)}
                />
                <SmallButton label="Decline" busy={busyId === r.follow.id} onPress={() => onRemove(r.follow.id)} />
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Invite a crewmate */}
      <Card>
        <SectionLabel>INVITE SOMEONE TO WATCH YOU</SectionLabel>
        {inviteCode ? (
          <>
            <ThemedText type="title" style={styles.code}>
              {inviteCode}
            </ThemedText>
            <SmallButton label="Share invite" primary block icon="square.and.arrow.up" onPress={onShareInvite} />
          </>
        ) : (
          <SmallButton
            label="Create invite link"
            primary
            block
            icon="link"
            busy={busyId === 'invite'}
            onPress={onCreateInvite}
          />
        )}
      </Card>

      {/* Redeem a code */}
      <Card>
        <SectionLabel>HAVE A CODE?</SectionLabel>
        <View style={styles.inlineRow}>
          <TextInput
            value={redeemValue}
            onChangeText={setRedeemValue}
            placeholder="abcd-1234"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
          />
          <SmallButton label="Add" primary busy={busyId === 'redeem'} onPress={onRedeem} />
        </View>
        {redeemMsg ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {redeemMsg}
          </ThemedText>
        ) : null}
      </Card>

      {/* Find by handle */}
      <Card>
        <SectionLabel>FIND BY HANDLE</SectionLabel>
        <TextInput
          value={query}
          onChangeText={onSearch}
          placeholder="@handle"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
        />
        {results.map((r) => {
          const already = watching.some((w) => w.id === r.id) || requested.has(r.id);
          return (
            <View key={r.id} style={styles.personRow}>
              <Person runner={r} />
              <SmallButton
                label={already ? 'Requested' : 'Request'}
                disabled={already}
                busy={busyId === r.id}
                onPress={() => onRequest(r.id)}
              />
            </View>
          );
        })}
      </Card>

      {/* Who I watch */}
      <Card>
        <SectionLabel>YOU WATCH</SectionLabel>
        {watching.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No one yet. Use a code or search above.
          </ThemedText>
        ) : (
          watching.map((r) => (
            <View key={r.id} style={styles.personRow}>
              <Person runner={r} />
            </View>
          ))
        )}
      </Card>

      {/* My watchers */}
      <Card>
        <SectionLabel>WATCHING YOU</SectionLabel>
        {watchers.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No one yet. Share an invite.
          </ThemedText>
        ) : (
          watchers.map((r) => (
            <View key={r.id} style={styles.personRow}>
              <Person runner={r} />
            </View>
          ))
        )}
      </Card>

      {/* Personal: connect your own Spotify */}
      <SpotifyConnect />

      <Pressable onPress={signOut} style={styles.signOut}>
        <ThemedText type="small" themeColor="textSecondary">
          Sign out
        </ThemedText>
      </Pressable>
    </Screen>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
      {children}
    </ThemedText>
  );
}

function Person({ runner }: { runner: Runner }) {
  return (
    <View style={styles.person}>
      <ThemedText type="default" style={styles.personName}>
        {runner.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        @{runner.handle}
      </ThemedText>
    </View>
  );
}

function SmallButton({
  label,
  onPress,
  primary,
  busy,
  disabled,
  block,
  icon,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  busy?: boolean;
  disabled?: boolean;
  /** Full-width, taller call-to-action (vs. the compact inline default). */
  block?: boolean;
  icon?: SymbolViewProps['name'];
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      style={[
        styles.smallButton,
        block ? styles.blockButton : undefined,
        { backgroundColor: primary ? theme.accent : theme.backgroundSelected },
        busy || disabled ? styles.disabled : undefined,
      ]}>
      {busy ? (
        <ActivityIndicator color={primary ? '#fff' : theme.text} />
      ) : (
        <View style={styles.buttonInner}>
          <ThemedText
            type={block ? 'default' : 'small'}
            style={[styles.smallButtonText, primary ? styles.primaryText : undefined]}>
            {label}
          </ThemedText>
          {icon ? (
            <SymbolView name={icon} size={block ? 18 : 15} tintColor={primary ? '#fff' : theme.text} weight="semibold" />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginBottom: Spacing.two, letterSpacing: 1 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  rowActions: { flexDirection: 'row', gap: Spacing.two },
  person: { flex: 1 },
  personName: { fontWeight: '700' },
  code: { letterSpacing: 2, marginBottom: Spacing.three },
  inlineRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  input: {
    flex: 1,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    marginBottom: Spacing.one,
  },
  hint: { marginTop: Spacing.one },
  smallButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
    minHeight: 40,
  },
  blockButton: {
    width: '100%',
    minWidth: 0,
    paddingVertical: Spacing.three,
    minHeight: 52,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  smallButtonText: { fontWeight: '700' },
  primaryText: { color: '#fff' },
  disabled: { opacity: 0.5 },
  signOut: { alignItems: 'center', marginTop: Spacing.two, padding: Spacing.three },
});
