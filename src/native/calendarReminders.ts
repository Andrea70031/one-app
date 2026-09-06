import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

import type { CalendarPayload, OneNativeActionResult, ReminderPayload } from './actionTypes';

function validDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createNativeReminder(payload: ReminderPayload): Promise<OneNativeActionResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, kind: 'reminder', status: 'unsupported', message: 'I promemoria nativi ONE sono disponibili su iPhone.' };
  }

  const title = String(payload.title || '').trim();
  if (!title) return { ok: false, kind: 'reminder', status: 'failed', message: 'Titolo promemoria mancante.' };

  const permission = await Calendar.requestRemindersPermissions();
  if (!permission.granted) {
    return { ok: false, kind: 'reminder', status: 'cancelled', message: 'Accesso ai Promemoria non autorizzato.' };
  }

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.REMINDER);
  const target = calendars.find(item => item.allowsModifications) ?? calendars[0];
  if (!target) {
    return { ok: false, kind: 'reminder', status: 'failed', message: 'Nessun elenco Promemoria disponibile sul dispositivo.' };
  }

  const dueDate = validDate(payload.dueAt);
  const reminder = await target.createReminder({
    title,
    notes: payload.note?.trim() || undefined,
    dueDate: dueDate ?? undefined,
    alarms: dueDate ? [{ absoluteDate: dueDate.toISOString() }] : undefined,
  });

  return {
    ok: true,
    kind: 'reminder',
    status: 'completed',
    id: reminder.id,
    message: 'Promemoria creato sul dispositivo.',
  };
}

export async function presentCalendarEvent(payload: CalendarPayload): Promise<OneNativeActionResult> {
  const title = String(payload.title || '').trim();
  const start = validDate(payload.start);
  const end = validDate(payload.end);

  if (!title || !start || !end || end <= start) {
    return { ok: false, kind: 'calendar', status: 'failed', message: 'Dati evento non validi.' };
  }

  const permission = await Calendar.requestCalendarPermissions(true);
  if (!permission.granted) {
    return { ok: false, kind: 'calendar', status: 'cancelled', message: 'Accesso in scrittura al Calendario non autorizzato.' };
  }

  let target: Calendar.ExpoCalendar | null = null;
  if (Platform.OS === 'ios') {
    target = Calendar.getDefaultCalendarSync();
  } else {
    const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
    target = calendars.find(item => item.allowsModifications && item.isPrimary) ?? calendars.find(item => item.allowsModifications) ?? null;
  }

  if (!target) {
    return { ok: false, kind: 'calendar', status: 'failed', message: 'Nessun calendario modificabile disponibile.' };
  }

  const result = await target.addEventWithForm({
    title,
    startDate: start,
    endDate: end,
    location: payload.location?.trim() || undefined,
    notes: payload.notes?.trim() || undefined,
  });

  if (result.action === Calendar.CalendarDialogResultActions.canceled) {
    return { ok: false, kind: 'calendar', status: 'cancelled', id: result.id };
  }

  return {
    ok: true,
    kind: 'calendar',
    status: 'presented',
    id: result.id,
    message: 'Evento passato al Calendario di sistema.',
  };
}
