import type { OneAIAction } from './aiActionAdapter';
import { nativeActionFromAI } from './aiActionAdapter';
import { executeNativeAction } from './actionEngine';
import { addOneActivity, logOneAction, mirrorReminder } from './oneData';

export async function executeCoordinatedAction(userId: string, action: OneAIAction) {
  const native = nativeActionFromAI(action);
  if (!native) {
    await logOneAction(userId, {
      kind: String(action.kind ?? action.type ?? 'unknown'),
      label: action.label,
      payload: action.payload,
    }, 'unsupported');
    return {
      ok: false,
      message: 'Questa azione non è ancora disponibile nella versione nativa.',
    };
  }

  await logOneAction(userId, native, 'created');
  const result = await executeNativeAction(native);

  if (result.ok) {
    if (native.kind === 'reminder') {
      await mirrorReminder(userId, native.payload ?? {});
    }
    await logOneAction(userId, native, 'executed');
    await addOneActivity(userId, native.label || 'Azione ONE', result.message || null, `action_${native.kind}`);
  } else {
    await logOneAction(userId, native, result.status || 'failed');
  }

  return result;
}
