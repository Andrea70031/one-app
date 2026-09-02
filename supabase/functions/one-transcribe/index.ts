import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

function dataUrlToBlob(dataUrl: string) {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/^data:([^;]+)/)?.[1] || "audio/webm";
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return { blob: new Blob([bytes], { type: mime }), mime };
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers });
    if (req.method !== "POST") return response({ error: "Metodo non consentito" }, 405);

    const body = await req.json().catch(() => ({}));
    const audio = typeof body.audio === "string" ? body.audio : "";
    if (!audio.startsWith("data:")) return response({ error: "Audio non valido" }, 400);
    if (audio.length > 18_000_000) return response({ error: "Audio troppo grande" }, 413);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return response({ error: "Motore voce non configurato" }, 503);

    const { blob, mime } = dataUrlToBlob(audio);
    const extension = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
    const form = new FormData();
    form.append("file", blob, `one-audio.${extension}`);
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("language", "it");

    const openaiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: form,
    });
    const payload = await openaiResponse.json().catch(() => ({}));
    if (!openaiResponse.ok) return response({ error: "Trascrizione non riuscita" }, 502);
    return response({ ok: true, text: payload.text || "" });
  }),
};

