import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

export type ReminderLike = {
  id: string;
  title: string;
  note: string | null;
  due_at: string | null;
  completed: boolean;
};

export type OneNotificationPreferences = {
  enabled: boolean;
  briefing: boolean;
  briefingHour: number;
};

let activeUserId: string | null = null;
let generation = 0;
let queue: Promise<void> = Promise.resolve();
const prefsKey = () => `one.notification.preferences.v2.${activeUserId || 'signed-out'}`;
export function setNotificationUser(userId: string | null) {
  if (activeUserId === userId) return;
  activeUserId = userId;
  generation++;
  queue = queue.catch(() => undefined).then(cancelManagedNotifications).catch(() => undefined);
}
const MANAGED_KEY = 'oneManaged';
const DEFAULT_PREFS: OneNotificationPreferences = {
  enabled: false,
  briefing: true,
  briefingHour: 8,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  } as any),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('one', {
    name: 'ONE',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 100, 180],
  });
}

export async function loadNotificationPreferences(): Promise<OneNotificationPreferences> {
  try {
    const raw = await SecureStore.getItemAsync(prefsKey());
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<OneNotificationPreferences>;
    return {
      enabled: parsed.enabled === true,
      briefing: parsed.briefing !== false,
      briefingHour: Number.isInteger(parsed.briefingHour) && Number(parsed.briefingHour) >= 0 && Number(parsed.briefingHour) <= 23
        ? Number(parsed.briefingHour)
        : 8,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveNotificationPreferences(next: OneNotificationPreferences) {
  await SecureStore.setItemAsync(prefsKey(), JSON.stringify(next));
}

export async function requestOneNotificationPermission() {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function cancelManagedNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.[MANAGED_KEY] === true)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export function syncOneNotifications(reminders: ReminderLike[], userId = activeUserId) {
  const expected = generation;
  queue = queue.catch(() => undefined).then(async () => {
    if (!userId || userId !== activeUserId || expected !== generation) return;
    await syncNotifications(reminders, expected);
  });
  return queue;
}
async function syncNotifications(reminders: ReminderLike[], expected: number) {
  try {
    const prefs = await loadNotificationPreferences();
    await cancelManagedNotifications();
    if (!prefs.enabled || expected !== generation) return;

    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    await ensureAndroidChannel();

    const now = Date.now();
    const upcoming = reminders
      .filter((item) => !item.completed && item.due_at)
      .map((item) => ({ item, date: new Date(item.due_at as string) }))
      .filter(({ date }) => !Number.isNaN(date.getTime()) && date.getTime() > now + 30_000)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 50);

    for (const { item, date } of upcoming) {
      if (expected !== generation) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: item.title,
          body: item.note || 'Promemoria ONE',
          data: { [MANAGED_KEY]: true, kind: 'reminder', reminderId: item.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: Platform.OS === 'android' ? 'one' : undefined,
        },
      });
    }

    if (prefs.briefing && expected === generation) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Buongiorno da ONE',
          body: 'Apri ONE per controllare i promemoria della giornata.',
          data: { [MANAGED_KEY]: true, kind: 'briefing' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: prefs.briefingHour,
          minute: 0,
          channelId: Platform.OS === 'android' ? 'one' : undefined,
        },
      });
    }
  } catch {
    // Notifications must never block the main ONE experience.
  }
}

export async function setNotificationsEnabled(enabled: boolean, reminders: ReminderLike[]) {
  const current = await loadNotificationPreferences();
  if (enabled) {
    const granted = await requestOneNotificationPermission();
    if (!granted) return { ...current, enabled: false };
  }
  const next = { ...current, enabled };
  await saveNotificationPreferences(next);
  await syncOneNotifications(reminders);
  return next;
}

export async function setBriefingEnabled(briefing: boolean, reminders: ReminderLike[]) {
  let current = await loadNotificationPreferences();
  if (briefing && !current.enabled) {
    const granted = await requestOneNotificationPermission();
    if (!granted) return current;
    current = { ...current, enabled: true };
  }
  const next = { ...current, briefing };
  await saveNotificationPreferences(next);
  await syncOneNotifications(reminders);
  return next;
}
