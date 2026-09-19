const labels: Record<string, string> = {
  site_job_number: 'Numero commessa', site_name: 'Nome spazio', site_id: 'ID spazio',
  client: 'Cliente', address: 'Indirizzo', notes: 'Note', title: 'Titolo', details: 'Dettagli',
  priority: 'Priorità', due_at: 'Scadenza (ISO, con fuso orario)', report_date: 'Data (AAAA-MM-GG)',
  summary: 'Riepilogo', works: 'Lavorazioni', blockers: 'Blocchi', workers: 'Persone', hours: 'Ore',
  progress: 'Avanzamento %', text: 'Testo', note: 'Nota', dueAt: 'Scadenza (ISO, con fuso orario)',
  date: 'Data e ora', start: 'Inizio (ISO, con fuso orario)', end: 'Fine (ISO, con fuso orario)',
  location: 'Luogo', to: 'Destinatario', subject: 'Oggetto', body: 'Messaggio', query: 'Destinazione',
  shortcutName: 'Nome Comando Rapido', inputText: 'Testo per il comando',
};
const fields: Record<string, string[]> = {
  create_site: ['site_job_number', 'site_name', 'client', 'address', 'notes'],
  create_issue: ['site_job_number', 'title', 'details', 'priority', 'due_at'],
  create_activity: ['site_job_number', 'title', 'notes'],
  create_daily_report: ['site_job_number', 'report_date', 'summary', 'works', 'blockers', 'workers', 'hours'],
  update_site_progress: ['site_job_number', 'progress'],
  reminder: ['title', 'note', 'due_at'], calendar: ['title', 'start', 'end', 'location', 'notes'],
  email: ['to', 'subject', 'body'], maps: ['query'], smart_home: ['shortcutName', 'inputText'], shortcut: ['shortcutName', 'inputText'],
};
export function reviewFields(kind: string) {
  return (fields[kind] || []).map(key => ({ key, label: labels[key] || key }));
}
export function reviewValues(payload: Record<string, unknown>) {
  const p = { ...payload };
  p.title ??= p.text;
  p.site_name ??= p.title;
  p.note ??= p.notes;
  p.due_at ??= p.dueAt ?? p.date;
  p.start ??= p.start_at ?? p.date;
  p.end ??= p.end_at;
  p.to ??= p.email;
  p.query ??= p.address ?? p.location ?? (Number.isFinite(p.latitude) && Number.isFinite(p.longitude) ? `${p.latitude}, ${p.longitude}` : undefined);
  p.shortcutName ??= p.shortcut_name ?? p.name;
  p.inputText ??= p.input_text ?? p.text;
  return p;
}
export function reviewedPayload(original: Record<string, unknown>, changes: Record<string, unknown>) {
  const p = { ...original, ...changes };
  // An edited commessa must never be overridden by an AI-supplied ID.
  if ('site_job_number' in changes && changes.site_job_number !== original.site_job_number) delete p.site_id;
  if ('query' in changes && changes.query !== original.query) { delete p.latitude; delete p.longitude; }
  for (const key of ['workers', 'hours', 'progress']) {
    if (key in changes) {
      const value = changes[key];
      if (value == null || String(value).trim() === '') p[key] = null;
      else {
        const numeric = Number(String(value).replace(',', '.'));
        if (!Number.isFinite(numeric) || numeric < 0) throw new Error('Inserisci valori numerici validi.');
        p[key] = numeric;
      }
    }
  }
  return p;
}
