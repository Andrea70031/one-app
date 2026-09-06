import { supabase } from './supabase';
import type { RecentItem } from '../data/recent';

export type OneReminder = {
  id: string;
  title: string;
  note: string | null;
  due_at: string | null;
  completed: boolean;
  source: Record<string, unknown> | null;
};

export type OneMemory = {
  id: string;
  title: string;
  summary: string | null;
  kind: string;
  created_at: string;
};

export type OneSite = {
  id: string;
  job_number: string;
  name: string;
  client: string | null;
  status: string;
  progress: number;
};

export type OneActivity = {
  id: string;
  title: string;
  detail: string | null;
  type: string;
  icon: string | null;
  created_at: string;
};

export type NativeDashboard = {
  activities: OneActivity[];
  reminders: OneReminder[];
  memories: OneMemory[];
  sites: OneSite[];
};

export async function loadNativeDashboard(userId: string): Promise<NativeDashboard> {
  const [activities, reminders, memories, sites] = await Promise.all([
    supabase.from('one_activities').select('id,title,detail,type,icon,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('one_reminders').select('id,title,note,due_at,completed,source').eq('user_id', userId).order('created_at', { ascending: false }).limit(120),
    supabase.from('one_memories').select('id,title,summary,kind,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(120),
    supabase.from('sites').select('id,job_number,name,client,status,progress').order('updated_at', { ascending: false }).limit(100),
  ]);

  const firstError = activities.error || reminders.error || memories.error || sites.error;
  if (firstError) throw firstError;

  return {
    activities: (activities.data || []) as OneActivity[],
    reminders: (reminders.data || []) as OneReminder[],
    memories: (memories.data || []) as OneMemory[],
    sites: (sites.data || []) as OneSite[],
  };
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
    .eq('user_id', userId);
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
