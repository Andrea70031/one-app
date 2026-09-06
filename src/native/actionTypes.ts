export type OneNativeActionKind =
  | 'reminder'
  | 'calendar'
  | 'email'
  | 'maps'
  | 'smart_home'
  | 'file'
  | 'camera'
  | 'photo'
  | 'voice';

export type OneNativeAction = {
  kind: OneNativeActionKind;
  label?: string;
  payload?: Record<string, unknown>;
};

export type OneNativeActionResult = {
  ok: boolean;
  kind: OneNativeActionKind;
  status: 'completed' | 'presented' | 'cancelled' | 'unsupported' | 'failed';
  id?: string | null;
  message?: string;
};

export type ReminderPayload = {
  title: string;
  note?: string;
  dueAt?: string | Date | null;
};

export type CalendarPayload = {
  title: string;
  start: string | Date;
  end: string | Date;
  location?: string;
  notes?: string;
};

export type EmailPayload = {
  to?: string;
  subject?: string;
  body?: string;
};

export type MapsPayload = {
  query?: string;
  latitude?: number;
  longitude?: number;
  label?: string;
};

export type SmartHomePayload = {
  shortcutName: string;
  inputText?: string;
};
