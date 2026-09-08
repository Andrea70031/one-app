import { supabase } from './supabase';
import type { RecentItem } from '../data/recent';
import { syncOneNotifications } from './notifications';

export type OneReminder = {
  id: string;
  title: string;
  note: string | null;
  due_at: string | null;
  completed: boolean;
  source: Record<string, unknown> | null;
  deleted_at?: string | null;
};

export type OneMemory = {
  id: string;
  title: string;
  summary: string | null;
  kind: string;
  created_at: string;
  deleted_at?: string | null;
};

export type OneSite = {
  id: string;
  job_number: string;
  name: string;
  client: string | null;
  status: string;
  progress: number;
  deleted_at?: string | null;
};

export type OneActivity = {
  id: string;
  title: string;
  detail: string | null;
  type: string;
  icon: string | null;
  created_at: string;
  deleted_at?: string | null;
};

export type NativeDashboard = {
  activities: OneActivity[];
  reminders: OneReminder[];
  memories: OneMemory[];
  sites: OneSite[];
};

export type TrashKind = 'site' | 'memory' | 'reminder' | 'activity';

export type TrashItem = {
  kind: TrashKind;
  id: string;
  title: string;
  subtitle: string;
  deleted_at: string;
};

export type OneManageData = {
  sites: OneSite[];
  memories: OneMemory[];
  reminders: OneReminder[];
  activities: OneActivity[];
  trash: TrashItem[];
};

export async function purgeExpiredTrash() {
  const { error } = await supabase.rpc('purge_expired_trash');
  if (error) throw error;
}

export async function loadNativeDashboard(userId: string): Promise<NativeDashboard> {
  void purgeExpiredTrash().catch(() => undefined);

  const [activities, reminders, memories, sites] = await Promise.all([
    supabase.from('one_activities').select('id,title,detail,type,icon,created_at').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }).limit(20),
    supabase.from('one_reminders').select('id,title,note,due_at,completed,source').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }).limit(120),
    supabase.from('one_memories').select('id,title,summary,kind,created_at').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }).limit(120),
    supabase.from('sites').select('id,job_number,name,client,status,progress').is('deleted_at', null).order('updated_at', { ascending: false }).limit(100),
  ]);

  const firstError = activities.error || reminders.error || memories.error || sites.error;
  if (firstError) throw firstError;

  const dashboard: NativeDashboard = {
    activities: (activities.data || []) as OneActivity[],
    reminders: (reminders.data || []) as OneReminder[],
    memories: (memories.data || []) as OneMemory[],
    sites: (sites.data || []) as OneSite[],
  };

  void syncOneNotifications(dashboard.reminders);
  return dashboard;
}

export async function loadOneManageData(userId: string): Promise<OneManageData> {
  const [sites, memories, reminders, activities, trash] = await Promise.all([
    supabase.from('sites').select('id,job_number,name,client,status,progress').is('deleted_at', null).order('updated_at', { ascending: false }).limit(120),
    supabase.from('one_memories').select('id,title,summary,kind,created_at').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }).limit(160),
    supabase.from('one_reminders').select('id,title,note,due_at,completed,source').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }).limit(160),
    supabase.from('one_activities').select('id,title,detail,type,icon,created_at').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }).limit(160),
    loadTrashItems(userId),
  ]);

  const firstError = sites.error || memories.error || reminders.error || activities.error;
  if (firstError) throw firstError;

  return {
    sites: (sites.data || []) as OneSite[],
    memories: (memories.data || []) as OneMemory[],
    reminders: (reminders.data || []) as OneReminder[],
    activities: (activities.data || []) as OneActivity[],
    trash,
  };
}

export async function loadTrashItems(userId: string): Promise<TrashItem[]> {
  const [sites, memories, reminders, activities] = await Promise.all([
    supabase.from('sites').select('id,job_number,name,client,status,deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(120),
    supabase.from('one_memories').select('id,title,summary,kind,deleted_at').eq('user_id', userId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(160),
    supabase.from('one_reminders').select('id,title,note,due_at,deleted_at').eq('user_id', userId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(160),
    supabase.from('one_activities').select('id,title,detail,type,deleted_at').eq('user_id', userId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(160),
  ]);

  const firstError = sites.error || memories.error || reminders.error || activities.error;
  if (firstError) throw firstError;

  const items: TrashItem[] = [];
  for (const row of sites.data || []) {
    if (!row.deleted_at) continue;
    items.push({ kind: 'site', id: row.id, title: `${row.job_number} · ${row.name}`, subtitle: row.client || row.status || 'Cantiere', deleted_at: row.deleted_at });
  }
  for (const row of memories.data || []) {
    if (!row.deleted_at) continue;
    items.push({ kind: 'memory', id: row.id, title: row.title, subtitle: row.summary || row.kind || 'Nota Recall', deleted_at: row.deleted_at });
  }
  for (const row of reminders.data || []) {
    if (!row.deleted_at) continue;
    items.push({ kind: 'reminder', id: row.id, title: row.title, subtitle: row.note || (row.due_at ? `Scadenza ${new Date(row.due_at).toLocaleDateString('it-IT')}` : 'Promemoria'), deleted_at: row.deleted_at });
  }
  for (const row of activities.data || []) {
    if (!row.deleted_at) continue;
    items.push({ kind: 'activity', id: row.id, title: row.title, subtitle: row.detail || row.type || 'Attività ONE', deleted_at: row.deleted_at });
  }
  return items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
}

function activityIcon(type: string): RecentItem['icon'] {
  const value = type.toLowerCase();
  if (value.includes('site') || value.includes('work') || value.includes('cantiere')) return 'briefcase';
  if (value.includes('travel') || value.includes('flight')) return 'airplane';
  if (value.includes('food') || value.includes('restaurant')) return 'restaurant';
  return 'document';
}

function compactTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Ieri';
  if (days < 7) return `${days} gg`;
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

export function dashboardRecentItems(dashboard: NativeDashboard): RecentItem[] {
  return dashboard.activities.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.detail || 'Attività ONE',
    time: compactTime(item.created_at),
    icon: activityIcon(item.type),
  }));
}

export async function addOneActivity(userId: string, title: string, detail: string | null, type = 'ai') {
  const { error } = await supabase.from('one_activities').insert({
    user_id: userId,
    title,
    detail,
    type,
    icon: type === 'ai' ? '✦' : null,
    payload: {},
  });
  if (error) throw error;
}

export async function saveOneMemory(userId: string, input: { title: string; summary?: string | null; kind?: string; payload?: Record<string, unknown> }) {
  const { error } = await supabase.from('one_memories').insert({
    user_id: userId,
    title: input.title,
    summary: input.summary ?? null,
    kind: input.kind ?? 'ai',
    source_type: 'native_ai',
    source_name: 'ONE Native',
    payload: input.payload ?? {},
  });
  if (error) throw error;
}

async function assertUpdated(data: { id: string }[] | null, message: string) {
  if (!data?.length) throw new Error(message);
}

export async function softDeleteOneMemory(userId: string, memoryId: string) {
  const { data, error } = await supabase.from('one_memories').update({ deleted_at: new Date().toISOString() }).eq('id', memoryId).eq('user_id', userId).select('id');
  if (error) throw error;
  await assertUpdated(data, 'Nota non trovata o non eliminabile.');
}

export async function softDeleteOneReminder(userId: string, reminderId: string) {
  const { data, error } = await supabase.from('one_reminders').update({ deleted_at: new Date().toISOString() }).eq('id', reminderId).eq('user_id', userId).select('id');
  if (error) throw error;
  await assertUpdated(data, 'Promemoria non trovato o non eliminabile.');
}

export async function softDeleteOneActivity(userId: string, activityId: string) {
  const { data, error } = await supabase.from('one_activities').update({ deleted_at: new Date().toISOString() }).eq('id', activityId).eq('user_id', userId).select('id');
  if (error) throw error;
  await assertUpdated(data, 'Attività non trovata o non eliminabile.');
}

export async function softDeleteOneSite(siteId: string) {
  const { data, error } = await supabase.from('sites').update({ deleted_at: new Date().toISOString() }).eq('id', siteId).select('id');
  if (error) throw error;
  await assertUpdated(data, 'Non hai i permessi per eliminare questo cantiere.');
}

export const deleteOneMemory = softDeleteOneMemory;
export const deleteOneSite = softDeleteOneSite;

export async function restoreTrashItem(userId: string, item: TrashItem) {
  const update = { deleted_at: null };
  if (item.kind === 'site') {
    const { data, error } = await supabase.from('sites').update(update).eq('id', item.id).select('id');
    if (error) throw error;
    await assertUpdated(data, 'Non hai i permessi per ripristinare questo cantiere.');
    return;
  }
  const table = item.kind === 'memory' ? 'one_memories' : item.kind === 'reminder' ? 'one_reminders' : 'one_activities';
  const { data, error } = await supabase.from(table).update(update).eq('id', item.id).eq('user_id', userId).select('id');
  if (error) throw error;
  await assertUpdated(data, 'Elemento non trovato o non ripristinabile.');
}

export async function permanentlyDeleteTrashItem(userId: string, item: TrashItem) {
  if (item.kind === 'site') {
    const { data, error } = await supabase.from('sites').delete().eq('id', item.id).not('deleted_at', 'is', null).select('id');
    if (error) throw error;
    await assertUpdated(data, 'Non hai i permessi per eliminare definitivamente questo cantiere.');
    return;
  }
  const table = item.kind === 'memory' ? 'one_memories' : item.kind === 'reminder' ? 'one_reminders' : 'one_activities';
  const { data, error } = await supabase.from(table).delete().eq('id', item.id).eq('user_id', userId).not('deleted_at', 'is', null).select('id');
  if (error) throw error;
  await assertUpdated(data, 'Elemento non trovato o non eliminabile definitivamente.');
}

export async function mirrorReminder(userId: string, payload: Record<string, unknown>) {
  const title = String(payload.title ?? payload.text ?? 'Promemoria');
  const note = payload.note == null ? null : String(payload.note);
  const rawDue = payload.due_at ?? payload.dueAt ?? payload.date ?? null;
  const dueAt = rawDue ? new Date(String(rawDue)) : null;
  const { error } = await supabase.from('one_reminders').insert({
    user_id: userId,
    title,
    note,
    due_at: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt.toISOString() : null,
    completed: false,
    source: { kind: 'native', created_by: 'one_action_engine' },
  });
  if (error) throw error;
}

export async function setReminderCompleted(userId: string, reminderId: string, completed: boolean) {
  const { error } = await supabase
    .from('one_reminders')
    .update({ completed })
    .eq('id', reminderId)
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (error) throw error;
}

export async function logOneAction(userId: string, action: { kind: string; label?: string; payload?: Record<string, unknown> }, status: string) {
  const { error } = await supabase.from('one_actions').insert({
    user_id: userId,
    kind: action.kind,
    label: action.label ?? null,
    status,
    payload: action.payload ?? {},
    executed_at: status === 'executed' ? new Date().toISOString() : null,
  });
  if (error) throw error;
}
