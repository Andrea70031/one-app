import { Linking, Platform } from 'react-native';

import type { EmailPayload, MapsPayload, OneNativeActionResult, SmartHomePayload } from './actionTypes';

function encode(value: unknown) {
  return encodeURIComponent(String(value ?? ''));
}

export async function openEmailComposer(payload: EmailPayload): Promise<OneNativeActionResult> {
  const to = String(payload.to || '').trim();
  const subject = String(payload.subject || '').trim();
  const body = String(payload.body || '').trim();
  const query = [subject ? `subject=${encode(subject)}` : '', body ? `body=${encode(body)}` : ''].filter(Boolean).join('&');
  const url = `mailto:${encode(to)}${query ? `?${query}` : ''}`;

  if (!(await Linking.canOpenURL(url))) {
    return { ok: false, kind: 'email', status: 'unsupported', message: 'Nessuna app Email disponibile.' };
  }
  await Linking.openURL(url);
  return { ok: true, kind: 'email', status: 'presented', message: 'Email preparata nell’app dedicata.' };
}

export async function openMaps(payload: MapsPayload): Promise<OneNativeActionResult> {
  const query = String(payload.query || payload.label || '').trim();
  const hasCoords = Number.isFinite(payload.latitude) && Number.isFinite(payload.longitude);
  const url = Platform.OS === 'ios'
    ? hasCoords
      ? `http://maps.apple.com/?ll=${payload.latitude},${payload.longitude}&q=${encode(query || 'Destinazione')}`
      : `http://maps.apple.com/?q=${encode(query)}`
    : hasCoords
      ? `geo:${payload.latitude},${payload.longitude}?q=${payload.latitude},${payload.longitude}(${encode(query || 'Destinazione')})`
      : `geo:0,0?q=${encode(query)}`;

  if (!query && !hasCoords) {
    return { ok: false, kind: 'maps', status: 'failed', message: 'Destinazione mancante.' };
  }
  if (!(await Linking.canOpenURL(url))) {
    return { ok: false, kind: 'maps', status: 'unsupported', message: 'Mappe non disponibile.' };
  }
  await Linking.openURL(url);
  return { ok: true, kind: 'maps', status: 'presented', message: 'Navigazione passata all’app Mappe.' };
}

export async function runAppleShortcut(payload: SmartHomePayload): Promise<OneNativeActionResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, kind: 'smart_home', status: 'unsupported', message: 'Comandi Rapidi Apple richiede iPhone.' };
  }

  const name = String(payload.shortcutName || '').trim();
  if (!name) return { ok: false, kind: 'smart_home', status: 'failed', message: 'Nome Comando Rapido mancante.' };

  const input = String(payload.inputText || '').trim();
  const url = input
    ? `shortcuts://run-shortcut?name=${encode(name)}&input=text&text=${encode(input)}`
    : `shortcuts://run-shortcut?name=${encode(name)}`;

  if (!(await Linking.canOpenURL(url))) {
    return { ok: false, kind: 'smart_home', status: 'unsupported', message: 'Comandi Rapidi non disponibile.' };
  }
  await Linking.openURL(url);
  return { ok: true, kind: 'smart_home', status: 'presented', message: 'Comando Rapido avviato.' };
}
