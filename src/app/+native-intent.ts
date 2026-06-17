// Rewrites incoming deep links *before* expo-router tries to match them. Invite
// links look like crewd://invite?code=... which has no route file, so without
// this expo-router shows its "Unmatched Route" 404. We send invite links to the
// tabs root; useInviteLinks() then reads the original URL (via Linking.useURL,
// which is unaffected by this rewrite) and redeems the code.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    // `path` may arrive as 'crewd://invite?...', '/invite?...', or 'invite?...'.
    const normalized = path.replace(/^[a-z]+:\/\//i, '').replace(/^\//, '');
    if (normalized.startsWith('invite') || normalized.startsWith('spotify-connected')) {
      return '/';
    }
  } catch {
    // fall through to the original path
  }
  return path;
}
