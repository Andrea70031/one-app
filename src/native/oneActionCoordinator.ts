import type { OneAIAction } from './aiActionAdapter';
import { nativeActionFromAI } from './aiActionAdapter';
import { executeNativeAction } from './actionEngine';
import { addOneActivity, logOneAction, mirrorReminder } from './oneData';
import { executeWorkspaceAction, isWorkspaceAction } from './oneWorkspaceActions';

export function canExecuteOneAction(action: OneAIAction) {
  return Boolean(nativeActionFromAI(action)) || isWorkspaceAction(action);
}

export async function executeCoordinatedAction(userId: string, action: OneAIAction) {
  const kind = String(action.kind ?? action.type ?? 'unknown').toLowerCase();

  if (isWorkspaceAction(action)) {
    await logOneAction(userId, { kind, label: action.label, payload: action.payload }, 'created');
    const result = await executeWorkspaceAction(userId, action);
    await logOneAction(userId, { kind, label: action.label, payload: action.payload }, result.ok ? 'executed' : result.status || 'failed').catch(() => undefined);
    if (result.ok) await addOneActivity(userId, action.label || 'Azione ONE', result.message || null, `action_${kind}`).catch(() => undefined);
    return result;
  }

  const native = nativeActionFromAI(action);
  if (!native) {
    await logOneAction(userId, { kind, label: action.label, payload: action.payload }, 'unsupported');
    return { ok: false, status: 'unsupported', message: 'Questa azione non è ancora disponibile nella versione nativa.' };
  }

  await logOneAction(userId, native, 'created');
  const result = await executeNativeAction(native);

  if (result.ok) {
    if (native.kind === 'reminder') {
      try { await mirrorReminder(userId, native.payload ?? {}); }
      catch { result.message = 'Promemoria creato sul dispositivo. La copia in ONE non è sincronizzata; non ripetere la creazione.'; }
    }
    await logOneAction(userId, native, result.status === 'presented' ? 'presented' : 'executed').catch(() => undefined);
    await addOneActivity(userId, native.label || 'Azione ONE', result.message || null, `action_${native.kind}`).catch(() => undefined);
  } else {
    await logOneAction(userId, native, result.status || 'failed');
  }

  return result;
}
