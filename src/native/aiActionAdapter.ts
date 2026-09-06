import type { OneNativeAction } from './actionTypes';

export type OneAIAction = {
  kind?: string;
  type?: string;
  label?: string;
  payload?: Record<string, unknown>;
};

/** Convert the current ONE backend action schema into the native action contract. */
export function nativeActionFromAI(action: OneAIAction): OneNativeAction | null {
  const kind = String(action.kind ?? action.type ?? '').toLowerCase();
  const payload = action.payload ?? {};
  const label = action.label || kind;

  if (kind === 'reminder') return { kind: 'reminder', label, payload };
  if (kind === 'calendar') return { kind: 'calendar', label, payload };
  if (kind === 'email') return { kind: 'email', label, payload };
  if (kind === 'maps') return { kind: 'maps', label, payload };

  // Smart-home commands currently originate from the user's configured shortcut bridge.
  if (kind === 'smart_home' || kind === 'shortcut') return { kind: 'smart_home', label, payload };

  return null;
}

export function nativeActionsFromAI(actions: OneAIAction[] | null | undefined) {
  return (actions ?? []).map(nativeActionFromAI).filter((action): action is OneNativeAction => Boolean(action));
}
