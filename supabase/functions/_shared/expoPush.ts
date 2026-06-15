// Send Expo push notifications. Batches up to 100 messages per request as the
// Expo push API requires.
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  sound?: 'default' | null;
  data?: Record<string, unknown>;
};

export async function sendExpoPush(tokens: string[], base: Omit<PushMessage, 'to'>) {
  if (tokens.length === 0) return;

  const messages: PushMessage[] = tokens.map((to) => ({
    sound: 'default',
    ...base,
    to,
  }));

  // Expo accepts up to 100 messages per request.
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      console.error('Expo push failed', res.status, await res.text());
    }
  }
}
