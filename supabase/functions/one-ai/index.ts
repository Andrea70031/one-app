import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const actionKinds = [
  "reminder", "calendar", "email", "call", "maps", "share", "copy",
  "download", "search", "open_url", "sms", "whatsapp", "save",
  "create_site", "create_issue", "create_activity", "create_daily_report", "update_site_progress",
];

const actionPayloadProperties = {
  title: { type: ["string", "null"] },
  text: { type: ["string", "null"] },
  note: { type: ["string", "null"] },
  due_at: { type: ["string", "null"] },
  date: { type: ["string", "null"] },
  start: { type: ["string", "null"] },
  end: { type: ["string", "null"] },
  to: { type: ["string", "null"] },
  email: { type: ["string", "null"] },
  subject: { type: ["string", "null"] },
  body: { type: ["string", "null"] },
  phone: { type: ["string", "null"] },
  address: { type: ["string", "null"] },
  query: { type: ["string", "null"] },
  url: { type: ["string", "null"] },
  content: { type: ["string", "null"] },
  filename: { type: ["string", "null"] },
  mime: { type: ["string", "null"] },
  site_id: { type: ["string", "null"] },
  site_job_number: { type: ["string", "null"] },
  site_name: { type: ["string", "null"] },
  client: { type: ["string", "null"] },
  priority: { type: ["string", "null"] },
  status: { type: ["string", "null"] },
  details: { type: ["string", "null"] },
  notes: { type: ["string", "null"] },
  report_date: { type: ["string", "null"] },
  summary: { type: ["string", "null"] },
  works: { type: ["string", "null"] },
  blockers: { type: ["string", "null"] },
  workers: { type: ["number", "null"] },
  hours: { type: ["number", "null"] },
  progress: { type: ["number", "null"] },
};

const walkthroughSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  required: ["summary", "works", "blockers", "workers", "hours", "suggested_progress", "activities", "issues"],
  properties: {
    summary: { type: ["string", "null"] },
    works: { type: ["string", "null"] },
    blockers: { type: ["string", "null"] },
    workers: { type: ["number", "null"] },
    hours: { type: ["number", "null"] },
    suggested_progress: { type: ["number", "null"] },
    activities: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "notes"],
        properties: {
          title: { type: "string" },
          notes: { type: ["string", "null"] },
        },
      },
    },
    issues: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "details", "priority", "due_at"],
        properties: {
          title: { type: "string" },
          details: { type: ["string", "null"] },
          priority: { type: "string", enum: ["Bassa", "Media", "Alta", "Critica"] },
          due_at: { type: ["string", "null"] },
        },
      },
    },
  },
};

const resultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "intent", "memory_title", "memory_summary", "extracted", "actions", "walkthrough"],
  properties: {
    summary: { type: "string", description: "Risposta completa da mostrare all'utente. Se viene richiesta una checklist, un testo o un piano, includi tutti i punti o il testo effettivo, non soltanto un annuncio come 'Checklist pronta'. Usa testo semplice e righe separate." },
    intent: { type: "string" },
    memory_title: { type: "string" },
    memory_summary: { type: "string" },
    extracted: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "value"],
        properties: { key: { type: "string" }, value: { type: "string" } },
      },
    },
    actions: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "label", "payload"],
        properties: {
          kind: { type: "string", enum: actionKinds },
          label: { type: "string" },
          payload: {
            type: "object",
            additionalProperties: false,
            required: Object.keys(actionPayloadProperties),
            properties: actionPayloadProperties,
          },
        },
      },
    },
    walkthrough: walkthroughSchema,
  },
};

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function outputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const pieces: string[] = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && content?.text) pieces.push(content.text);
    }
  }
  return pieces.join("\n").trim();
}

function aiError(code: string, detail: string, status = 502) {
  console.error(JSON.stringify({ event: "one_ai_error", code }));
  return response({ error: code, detail }, status);
}

function providerError(status: number, code: string) {
  if (code === "insufficient_quota") return aiError("insufficient_quota", "Credito API OpenAI non disponibile. Controlla il saldo dell'organizzazione collegata alla chiave.", 503);
  if (status === 401) return aiError("invalid_api_key", "La chiave OpenAI configurata non è valida. Aggiorna OPENAI_API_KEY nelle impostazioni del backend.", 503);
  if (status === 403) return aiError("permission_denied", "La chiave OpenAI non è autorizzata a usare questo modello o la Responses API.", 503);
  if (code === "model_not_found") return aiError("model_not_found", "Il modello AI configurato non è disponibile per questo progetto OpenAI.", 503);
  if (status === 429) return aiError("rate_limit", "Troppe richieste al motore AI. Attendi qualche secondo e riprova.", 429);
  return aiError("provider_error", "OpenAI non ha completato la richiesta. Riprova tra poco.");
}

async function allowed(ctx: any, bucket: string, limit: number, seconds: number) {
  const { data, error } = await ctx.supabase.rpc("consume_one_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: seconds,
  });
  return !error && data === true;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: jsonHeaders });
    if (req.method !== "POST") return response({ error: "Metodo non consentito" }, 405);

    const body = await req.json().catch(() => ({}));
    const message = String(body.text || body.message || "").trim();
    const canCreateSite = Array.isArray(body.supported_actions) && body.supported_actions.includes("create_site");
    const schema = structuredClone(resultSchema);
    if (!canCreateSite) schema.properties.actions.items.properties.kind.enum = actionKinds.filter(kind => kind !== "create_site");
    const mode = body.mode === "walkthrough" ? "walkthrough" : "assistant";
    const siteId = body.site_id ? String(body.site_id) : null;
    const image = typeof body.image === "string" ? body.image : null;
    const images = Array.isArray(body.images)
      ? body.images.filter((value: unknown) => typeof value === "string" && value.startsWith("data:image/")).slice(0, 6)
      : [];
    const file = typeof body.file === "string" ? body.file : null;
    const filename = String(body.filename || "documento").slice(0, 160);
    const userId = ctx.userClaims?.id;

    if (!userId) return response({ error: "Utente non autenticato" }, 401);
    if (!message && !image && !file && !images.length) return response({ error: "Richiesta vuota" }, 400);
    const imageBytes = images.reduce((total: number, value: string) => total + value.length, image?.length || 0);
    if (imageBytes > 28_000_000 || (file?.length || 0) > 14_000_000) {
      return response({ error: "Allegato troppo grande" }, 413);
    }

    if (!(await allowed(ctx, "ai_minute", 15, 60)) || !(await allowed(ctx, "ai_day", 100, 86400))) {
      return response({ error: "rate_limit", detail: "Hai raggiunto il limite temporaneo di richieste ONE. Riprova più tardi." }, 429);
    }

    let site: any = null;
    let issues: any[] = [];
    let activities: any[] = [];
    let reports: any[] = [];
    let documents: any[] = [];

    if (siteId) {
      const [siteResult, issuesResult, activitiesResult, reportsResult, documentsResult] = await Promise.all([
        ctx.supabase.from("sites").select("id,job_number,name,client,address,status,progress,notes").eq("id", siteId).single(),
        ctx.supabase.from("issues").select("id,title,details,priority,status,assigned_to,due_at,created_at").eq("site_id", siteId).order("created_at", { ascending: false }).limit(80),
        ctx.supabase.from("activities").select("id,title,notes,created_at").eq("site_id", siteId).order("created_at", { ascending: false }).limit(80),
        ctx.supabase.from("daily_reports").select("report_date,summary,workers,hours,works,blockers").eq("site_id", siteId).order("report_date", { ascending: false }).limit(20),
        ctx.supabase.from("documents").select("file_name,mime_type,category,created_at").eq("site_id", siteId).order("created_at", { ascending: false }).limit(50),
      ]);
      if (siteResult.error || !siteResult.data) return response({ error: "Spazio non accessibile" }, 403);
      site = siteResult.data;
      issues = issuesResult.data || [];
      activities = activitiesResult.data || [];
      reports = reportsResult.data || [];
      documents = documentsResult.data || [];
    } else {
      const [sitesResult, issuesResult] = await Promise.all([
        ctx.supabase.from("sites").select("id,job_number,name,client,status,progress").order("updated_at", { ascending: false }).limit(60),
        ctx.supabase.from("issues").select("id,site_id,title,priority,status,due_at").order("updated_at", { ascending: false }).limit(120),
      ]);
      site = { portfolio: sitesResult.data || [] };
      issues = issuesResult.data || [];
    }

    await ctx.supabase.from("ai_messages").insert({
      site_id: siteId,
      user_id: userId,
      role: "user",
      content: message || `[Allegato: ${filename}]`,
    });

    const context = JSON.stringify({ site, issues, activities, reports, documents }).slice(0, 60_000);
    const content: any[] = [{
      type: "input_text",
      text: `${message || "Analizza l'allegato."}\n\nCONTESTO ONE DISPONIBILE:\n${context}`,
    }];
    if (image) content.push({ type: "input_image", image_url: image, detail: "auto" });
    for (const imageUrl of images) content.push({ type: "input_image", image_url: imageUrl, detail: "auto" });
    if (file) content.push({ type: "input_file", filename, file_data: file });

    let result: any = null;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return aiError("missing_api_key", "Il motore AI non è configurato: manca OPENAI_API_KEY nel backend.", 503);
    try {
      const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: AbortSignal.timeout(60_000),
        headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          instructions: `Sei ONE, assistente generale personale e professionale. I cantieri sono soltanto uno dei moduli disponibili: non trasformare ogni richiesta in un'operazione di cantiere. Puoi creare direttamente contenuti utili come checklist, liste, lettere, email in bozza, piani di lavoro, tabelle, preventivi in bozza e codice. Distingui sempre la generazione di un contenuto dall'esecuzione di un'operazione su dati o servizi. Se viene richiesto un file testuale, puoi proporre download con content completo, filename ed estensione coerenti, e mime text/plain, text/markdown o text/csv; non dichiarare di aver creato PDF, Excel o allegati binari non disponibili. Per servizi esterni prepara bozze o usa esclusivamente le azioni collegate: non inventare integrazioni. Usa i cantieri nel contesto solo quando sono pertinenti alla richiesta. Rispondi in italiano, con tono concreto. Soddisfa direttamente la richiesta nel campo summary: scrivi la checklist completa, la bozza o il piano richiesto con punti numerati su righe separate. Non limitarti a dire che è pronto e non nascondere il contenuto soltanto in extracted o nelle azioni. memory_title e memory_summary sono invece brevi etichette per Recall; il salvataggio in Recall è facoltativo e distinto dalla risposta. Per checklist e modelli generali puoi usare conoscenze generali, specificando cosa va verificato sul posto. Per affermazioni su uno specifico cantiere usa solo i dati e gli allegati disponibili: non inventare persone, decisioni, scadenze o valori. Se l'utente vuole registrare qualcosa in un cantiere, proponi create_issue, create_activity, create_daily_report o update_site_progress. Usa site_id soltanto quando corrisponde senza ambiguità a un cantiere presente nel contesto; altrimenti lascialo null e valorizza site_job_number solo se esplicitamente indicato. ${canCreateSite ? "Se l'utente chiede di creare un NUOVO cantiere, proponi create_site con site_job_number per la commessa, site_name per il nome, client, address e notes soltanto se forniti; site_id deve essere null. Anche se il portfolio è vuoto puoi creare il primo cantiere. I campi mancanti vengono completati nella schermata di revisione. Non rispondere che creare cantieri è impossibile." : "Questa versione del client non supporta create_site: se l'utente chiede un nuovo cantiere, spiega che deve aggiornare ONE per usare la creazione guidata."} Prepara sempre l'operazione per la revisione dell'utente e non dichiarare mai che sia già stata eseguita. Nei cantieri evidenzia prima sicurezza, blocchi, responsabilità e scadenze. Se mode è walkthrough, compila walkthrough come bozza completa del sopralluogo: separa lavorazioni svolte, blocchi, attività e criticità; non trasformare la stessa osservazione sia in attività sia in criticità; usa suggested_progress solo se gli elementi osservati giustificano concretamente la variazione, altrimenti null; usa null per persone, ore e scadenze non dichiarate; lascia actions vuoto. Se mode non è walkthrough, imposta walkthrough a null. Mode corrente: ${mode}. Restituisci al massimo quattro azioni utili e realmente eseguibili. Quando non ci sono azioni, restituisci actions vuoto: non proporre pulsanti none o non disponibili.`,
          input: [{ role: "user", content }],
          max_output_tokens: mode === "walkthrough" ? 6000 : 4000,
          text: { format: { type: "json_schema", name: "one_result", strict: true, schema } },
        }),
      });
      const payload = await openaiResponse.json().catch(() => null);
      if (!openaiResponse.ok) return providerError(openaiResponse.status, payload?.error?.code || "");
      if (payload?.status === "incomplete") return aiError("incomplete_response", "La risposta AI è stata interrotta. Prova a chiedere una checklist più breve.");
      if (payload?.status === "failed" || payload?.error) return aiError("provider_error", "OpenAI non ha completato la richiesta. Riprova tra poco.");
      if (payload?.output?.some((item: any) => item.content?.some((part: any) => part.type === "refusal"))) {
        return aiError("request_refused", "Il motore AI non può soddisfare questa richiesta. Prova a riformularla.", 422);
      }
      const text = outputText(payload);
      try { result = JSON.parse(text); } catch {
        return aiError("invalid_response", "Il motore AI ha restituito una risposta illeggibile. Riprova.");
      }
      if (!result || typeof result.summary !== "string" || !result.summary.trim() || !Array.isArray(result.actions)) {
        return aiError("invalid_response", "Il motore AI ha restituito una risposta vuota o non valida. Riprova.");
      }
      if (mode === "walkthrough" && (!result.walkthrough || typeof result.walkthrough !== "object")) {
        return aiError("invalid_response", "La bozza del sopralluogo è incompleta. Riprova.");
      }
    } catch (error) {
      const timedOut = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
      return aiError(timedOut ? "ai_timeout" : "ai_unreachable", timedOut
        ? "Il motore AI sta impiegando troppo tempo. Riprova con una richiesta più breve."
        : "Non riesco a raggiungere OpenAI. Riprova tra poco.");
    }

    await ctx.supabase.from("ai_messages").insert({
      site_id: siteId,
      user_id: userId,
      role: "assistant",
      content: result.summary,
    });

    return response({ result });
  }),
};
