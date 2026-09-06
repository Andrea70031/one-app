import type { OneAIAction } from './aiActionAdapter';
import { supabase } from './supabase';

const workspaceKinds = new Set([
  'create_site',
  'create_issue',
  'create_activity',
  'create_daily_report',
  'update_site_progress',
]);

export function isWorkspaceAction(action: OneAIAction) {
  return workspaceKinds.has(String(action.kind ?? action.type ?? '').toLowerCase());
}

async function resolveSiteId(payload: Record<string, unknown>) {
  const direct = String(payload.site_id ?? '').trim();
  if (direct) return direct;
  const job = String(payload.site_job_number ?? '').trim();
  if (!job) return null;
  const { data, error } = await supabase.from('sites').select('id').eq('job_number', job).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function executeWorkspaceAction(userId: string, action: OneAIAction) {
  const kind = String(action.kind ?? action.type ?? '').toLowerCase();
  const payload = action.payload ?? {};

  if (kind === 'create_site') {
    const jobNumber = String(payload.site_job_number ?? '').trim();
    const name = String(payload.site_name ?? payload.title ?? '').trim();
    if (!jobNumber || !name) {
      return { ok: false, status: 'needs_input', message: 'Per creare lo spazio servono almeno numero commessa e nome.' };
    }

    const existing = await supabase.from('sites').select('id,name').eq('job_number', jobNumber).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return { ok: false, status: 'duplicate', message: `Esiste già la commessa ${jobNumber}.` };

    const { data, error } = await supabase.from('sites').insert({
      job_number: jobNumber,
      name,
      client: payload.client ? String(payload.client) : null,
      address: payload.address ? String(payload.address) : null,
      notes: payload.notes ? String(payload.notes) : null,
      created_by: userId,
      status: 'Attivo',
      progress: 0,
    }).select('id').single();
    if (error) throw error;
    return { ok: true, status: 'completed', id: data.id, message: `Commessa ${jobNumber} creata in ONE.` };
  }

  const siteId = await resolveSiteId(payload);
  if (!siteId) return { ok: false, status: 'needs_input', message: 'ONE non riesce a identificare lo spazio o la commessa.' };

  if (kind === 'create_issue') {
    const title = String(payload.title ?? '').trim();
    if (!title) return { ok: false, status: 'needs_input', message: 'Manca il titolo della criticità.' };
    const { error } = await supabase.from('issues').insert({
      site_id: siteId,
      title,
      details: payload.details ? String(payload.details) : null,
      priority: payload.priority ? String(payload.priority) : 'Media',
      status: 'Aperto',
      due_at: payload.due_at ? String(payload.due_at) : null,
      created_by: userId,
    });
    if (error) throw error;
    return { ok: true, status: 'completed', message: 'Criticità registrata nello spazio.' };
  }

  if (kind === 'create_activity') {
    const title = String(payload.title ?? '').trim();
    if (!title) return { ok: false, status: 'needs_input', message: 'Manca il titolo dell’attività.' };
    const { error } = await supabase.from('activities').insert({
      site_id: siteId,
      title,
      notes: payload.notes ? String(payload.notes) : null,
      created_by: userId,
    });
    if (error) throw error;
    return { ok: true, status: 'completed', message: 'Attività registrata nello spazio.' };
  }

  if (kind === 'create_daily_report') {
    const { error } = await supabase.from('daily_reports').insert({
      site_id: siteId,
      report_date: payload.report_date ? String(payload.report_date) : new Date().toISOString().slice(0, 10),
      summary: payload.summary ? String(payload.summary) : null,
      works: payload.works ? String(payload.works) : null,
      blockers: payload.blockers ? String(payload.blockers) : null,
      workers: typeof payload.workers === 'number' ? payload.workers : 0,
      hours: typeof payload.hours === 'number' ? payload.hours : 0,
      created_by: userId,
    });
    if (error) throw error;
    return { ok: true, status: 'completed', message: 'Rapporto giornaliero registrato.' };
  }

  if (kind === 'update_site_progress') {
    const progress = Number(payload.progress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return { ok: false, status: 'needs_input', message: 'L’avanzamento deve essere compreso tra 0 e 100.' };
    }
    const { error } = await supabase.from('sites').update({ progress: Math.round(progress) }).eq('id', siteId);
    if (error) throw error;
    return { ok: true, status: 'completed', message: `Avanzamento aggiornato al ${Math.round(progress)}%.` };
  }

  return { ok: false, status: 'unsupported', message: 'Azione spazio non supportata.' };
}
