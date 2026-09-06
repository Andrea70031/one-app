import type {
  CalendarPayload,
  EmailPayload,
  MapsPayload,
  OneNativeAction,
  OneNativeActionResult,
  ReminderPayload,
  SmartHomePayload,
} from './actionTypes';
import { createNativeReminder, presentCalendarEvent } from './calendarReminders';
import { openEmailComposer, openMaps, runAppleShortcut } from './handoffs';

/**
 * Single action boundary for ONE Native.
 * iPhone, Apple Watch and CarPlay should all converge on these action contracts,
 * while each surface decides how to collect confirmation and input.
 */
export async function executeNativeAction(action: OneNativeAction): Promise<OneNativeActionResult> {
  const payload = action.payload ?? {};

  try {
    switch (action.kind) {
      case 'reminder':
        return await createNativeReminder({
          title: String(payload.title ?? payload.text ?? action.label ?? ''),
          note: String(payload.note ?? payload.notes ?? ''),
          dueAt: (payload.dueAt ?? payload.due_at ?? payload.date ?? null) as ReminderPayload['dueAt'],
        });

      case 'calendar':
        return await presentCalendarEvent({
          title: String(payload.title ?? action.label ?? ''),
          start: (payload.start ?? payload.start_at ?? payload.date ?? new Date()) as CalendarPayload['start'],
          end: (payload.end ?? payload.end_at ?? new Date(Date.now() + 60 * 60 * 1000)) as CalendarPayload['end'],
          location: String(payload.location ?? payload.address ?? ''),
          notes: String(payload.notes ?? payload.note ?? payload.description ?? ''),
        });

      case 'email':
        return await openEmailComposer({
          to: String(payload.to ?? payload.email ?? ''),
          subject: String(payload.subject ?? ''),
          body: String(payload.body ?? payload.text ?? ''),
        } as EmailPayload);

      case 'maps':
        return await openMaps({
          query: String(payload.query ?? payload.address ?? payload.location ?? ''),
          latitude: typeof payload.latitude === 'number' ? payload.latitude : undefined,
          longitude: typeof payload.longitude === 'number' ? payload.longitude : undefined,
          label: String(payload.label ?? action.label ?? ''),
        } as MapsPayload);

      case 'smart_home':
        return await runAppleShortcut({
          shortcutName: String(payload.shortcutName ?? payload.shortcut_name ?? payload.name ?? action.label ?? ''),
          inputText: String(payload.inputText ?? payload.input_text ?? payload.text ?? ''),
        } as SmartHomePayload);

      case 'file':
      case 'camera':
      case 'photo':
      case 'voice':
        return {
          ok: false,
          kind: action.kind,
          status: 'unsupported',
          message: 'Questa azione viene gestita direttamente dalla schermata nativa che l’ha richiesta.',
        };

      default:
        return {
          ok: false,
          kind: action.kind,
          status: 'unsupported',
          message: 'Azione nativa non supportata.',
        };
    }
  } catch (error) {
    return {
      ok: false,
      kind: action.kind,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Azione non completata.',
    };
  }
}
