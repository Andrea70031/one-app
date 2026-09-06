import { File } from 'expo-file-system';
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

export type OneNativeAttachmentKind = 'camera' | 'photo' | 'document' | 'audio';

export type OneNativeAttachment = {
  kind: OneNativeAttachmentKind;
  uri?: string;
  name: string;
  mimeType?: string;
  base64?: string;
  size?: number;
};

type AskOneNativeInput = {
  text?: string;
  siteId?: string | null;
  attachments?: OneNativeAttachment[];
};

const MAX_IMAGE_COUNT = 6;
const MAX_IMAGE_BYTES = 4_200_000;
const MAX_TOTAL_IMAGE_DATA_URL = 24_000_000;
const MAX_DOCUMENT_BYTES = 9_500_000;
const MAX_AUDIO_BYTES = 12_000_000;

function fallbackMime(item: OneNativeAttachment) {
  const lower = item.name.toLowerCase();
  if (item.kind === 'camera' || item.kind === 'photo') {
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
    return 'image/jpeg';
  }
  if (item.kind === 'audio') {
    if (lower.endsWith('.wav')) return 'audio/wav';
    if (lower.endsWith('.ogg')) return 'audio/ogg';
    if (lower.endsWith('.webm')) return 'audio/webm';
    return 'audio/mp4';
  }
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.md')) return 'text/markdown';
  return 'application/octet-stream';
}

async function attachmentToDataUrl(item: OneNativeAttachment, maxBytes: number) {
  const mime = item.mimeType || fallbackMime(item);
  if (item.base64) {
    const estimatedBytes = Math.floor(item.base64.length * 0.75);
    if (estimatedBytes > maxBytes) throw new Error(`${item.name} è troppo grande per ONE.`);
    return `data:${mime};base64,${item.base64}`;
  }

  if (!item.uri) throw new Error(`Non riesco a leggere ${item.name}.`);

  try {
    const local = new File(item.uri);
    const size = item.size ?? local.size;
    if (size > maxBytes) throw new Error(`${item.name} è troppo grande per ONE.`);
    const base64 = await local.base64();
    const estimatedBytes = Math.floor(base64.length * 0.75);
    if (estimatedBytes > maxBytes) throw new Error(`${item.name} è troppo grande per ONE.`);
    return `data:${item.mimeType || local.type || mime};base64,${base64}`;
  } catch (error) {
    if (error instanceof Error && error.message.includes('troppo grande')) throw error;
    throw new Error(`Non riesco a preparare ${item.name} per l'analisi.`);
  }
}

async function transcribeAudio(item: OneNativeAttachment) {
  const audio = await attachmentToDataUrl(item, MAX_AUDIO_BYTES);
  const { data, error } = await supabase.functions.invoke('one-transcribe', {
    body: { audio },
  });

  if (error) throw new Error(error.message || 'ONE non riesce a trascrivere l’audio.');
  if (data?.error) throw new Error(data.error);
  const text = String(data?.text || '').trim();
  if (!text) throw new Error('Non sono riuscito a capire la registrazione. Riprova parlando più vicino al microfono.');
  return text;
}

export async function askOneNative(input: AskOneNativeInput) {
  const attachments = input.attachments ?? [];
  const images = attachments.filter((item) => item.kind === 'camera' || item.kind === 'photo');
  const documents = attachments.filter((item) => item.kind === 'document');
  const audios = attachments.filter((item) => item.kind === 'audio');

  if (images.length > MAX_IMAGE_COUNT) throw new Error(`Puoi inviare al massimo ${MAX_IMAGE_COUNT} immagini per richiesta.`);
  if (documents.length > 1) throw new Error('Invia un documento alla volta insieme alle foto.');
  if (audios.length > 1) throw new Error('Invia una registrazione vocale alla volta.');

  const imageData = await Promise.all(images.map((item) => attachmentToDataUrl(item, MAX_IMAGE_BYTES)));
  if (imageData.reduce((total, value) => total + value.length, 0) > MAX_TOTAL_IMAGE_DATA_URL) {
    throw new Error('Le immagini selezionate sono troppo pesanti. Riduci il numero di foto e riprova.');
  }

  const document = documents[0];
  const documentData = document ? await attachmentToDataUrl(document, MAX_DOCUMENT_BYTES) : null;
  const audio = audios[0];
  const transcript = audio ? await transcribeAudio(audio) : '';

  const typedText = String(input.text || '').trim();
  const textParts = [typedText];
  if (transcript) textParts.push(`Trascrizione della richiesta vocale:\n${transcript}`);
  const text = textParts.filter(Boolean).join('\n\n').trim();

  if (!text && !imageData.length && !documentData) throw new Error('Scrivi, pronuncia o allega qualcosa per ONE.');

  const { data, error } = await supabase.functions.invoke('one-ai', {
    body: {
      text,
      site_id: input.siteId ?? null,
      mode: 'assistant',
      supported_actions: ['create_site'],
      images: imageData,
      file: documentData,
      filename: document?.name ?? undefined,
    },
  });

  if (error) throw new Error(error.message || 'ONE AI non è raggiungibile.');
  if (data?.error) throw new Error(data.detail || data.error);
  const result = data?.result as OneAIResult | undefined;
  if (!result?.summary) throw new Error('ONE non ha restituito una risposta valida.');
  return result;
}
