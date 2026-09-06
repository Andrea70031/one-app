import { supabase } from './supabase';
import type { OneAIAction } from './aiActionAdapter';

export type OneAIResult = {
  summary: string;
  intent: string;
  memory_title: string;
  memory_summary: string;
  extracted: Array<{ key: string; value: string }>;
  actions: OneAIAction[];
  walkthrough?: unknown;
};

export async function askOneNative(input: { text: string; siteId?: string | null }) {
  const text = input.text.trim();
  if (!text) throw new Error('Scrivi o pronuncia una richiesta.');

  const { data, error } = await supabase.functions.invoke('one-ai', {
    body: {
      text,
      site_id: input.siteId ?? null,
      mode: 'assistant',
      supported_actions: ['create_site'],
    },
  });

  if (error) throw new Error(error.message || 'ONE AI non è raggiungibile.');
  if (data?.error) throw new Error(data.detail || data.error);
  const result = data?.result as OneAIResult | undefined;
  if (!result?.summary) throw new Error('ONE non ha restituito una risposta valida.');
  return result;
}
