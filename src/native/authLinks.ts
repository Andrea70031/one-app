export const AUTH_REDIRECT = 'one://auth/callback';
export function parseAuthLink(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'one:' || url.hostname !== 'auth' || url.pathname !== '/callback') return null;
  const params = new URLSearchParams(url.hash.slice(1) || url.search.slice(1));
  if (params.has('error')) throw new Error('Link scaduto o non valido. Richiedi una nuova email.');
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token, recovery: params.get('type') === 'recovery' };
}
