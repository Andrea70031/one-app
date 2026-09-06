import type { OneNativeAction, OneNativeActionKind } from './actionTypes';

export type OneSurface = 'iphone' | 'watch' | 'carplay';

const allowed: Record<OneSurface, ReadonlySet<OneNativeActionKind>> = {
  iphone: new Set([
    'reminder', 'calendar', 'email', 'maps', 'smart_home',
    'file', 'camera', 'photo', 'voice',
  ]),
  watch: new Set([
    'reminder', 'maps', 'smart_home', 'voice',
  ]),
  carplay: new Set([
    'reminder', 'maps', 'voice',
  ]),
};

const alwaysConfirm = new Set<OneNativeActionKind>([
  'email', 'calendar', 'smart_home',
]);

export function actionAllowedOnSurface(action: OneNativeAction, surface: OneSurface) {
  return allowed[surface].has(action.kind);
}

export function actionRequiresConfirmation(action: OneNativeAction, surface: OneSurface) {
  if (alwaysConfirm.has(action.kind)) return true;
  if (surface === 'carplay') return action.kind !== 'voice';
  return false;
}

export function surfaceActionReason(action: OneNativeAction, surface: OneSurface) {
  if (actionAllowedOnSurface(action, surface)) return null;
  if (surface === 'carplay') return 'Questa azione richiede l’iPhone e non viene proposta durante la guida.';
  if (surface === 'watch') return 'Apri ONE su iPhone per completare questa azione.';
  return 'Azione non disponibile su questa superficie.';
}
