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
  "create_issue", "create_activity", "create_daily_report", "update_site_progress", "none",
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

const resultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "intent", "memory_title", "memory_summary", "extracted", "actions"],
  properties: {
    summary: { type: "string" },
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

function fallback(message: string, site: any, issues: any[], activities: any[], reports: any[]) {
  const open = issues.filter((issue) => !["Risolto", "Chiusa", "Completata"].includes(issue.status));
  const urgent = open.filter((issue) => ["Critica", "Alta"].includes(issue.priority));
  const prefix = site
    ? `${site.job_number} — ${site.name}: avanzamento ${site.progress || 0}%. `
    : "";
  const summary = `${prefix}${open.length} problemi aperti, ${urgent.length} ad alta priorità, ${activities.length} attività recenti${reports[0] ? `; ultimo report ${reports[0].report_date}` : ""}.`;
  return {
    summary,
    intent: message,
    memory_title: site ? `Aggiornamento ${site.job_number}` : "Richiesta a ONE",
    memory_summary: summary,
    extracted: [
      { key: "open_issues", value: String(open.length) },
      { key: "urgent_issues", value: String(urgent.length) },
    ],
    actions: [],
  };
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: jsonHeaders });
    if (req.method !== "POST") return response({ error: "Metodo non consentito" }, 405);

    const body = await req.json().catch(() => ({}));
    const message = String(body.text || body.message || "").trim();
    const siteId = body.site_id ? String(body.site_id) : null;
    const image = typeof body.image === "string" ? body.image : null;
    const file = typeof body.file === "string" ? body.file : null;
    const filename = String(body.filename || "documento").slice(0, 160);
    const userId = ctx.userClaims?.id;

    if (!userId) return response({ error: "Utente non autenticato" }, 401);
    if (!message && !image && !file) return response({ error: "Richiesta vuota" }, 400);
    if ((image?.length || 0) > 14_000_000 || (file?.length || 0) > 14_000_000) {
      return response({ error: "Allegato troppo grande" }, 413);
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
    if (file) content.push({ type: "input_file", filename, file_data: file });

    let result: any = null;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (openaiKey) {
      const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          instructions: "Sei ONE, assistente operativo personale e aziendale. Rispondi in italiano, con tono sintetico e concreto. Usa solo i dati e gli allegati disponibili: non inventare persone, decisioni, scadenze o valori. Se l'utente vuole registrare qualcosa in un cantiere, proponi create_issue, create_activity, create_daily_report o update_site_progress. Usa site_id soltanto quando corrisponde senza ambiguità a un cantiere presente nel contesto; altrimenti lascialo null e valorizza site_job_number solo se esplicitamente indicato. Prepara sempre l'operazione per la revisione dell'utente e non dichiarare mai che sia già stata eseguita. Se proponi azioni esterne, prepara i dati ma non dichiarare mai che l'azione è stata eseguita. Nei cantieri evidenzia prima sicurezza, blocchi, responsabilità e scadenze. Restituisci al massimo quattro azioni utili.",
          input: [{ role: "user", content }],
          max_output_tokens: 1200,
          text: { format: { type: "json_schema", name: "one_result", strict: true, schema: resultSchema } },
        }),
      });
      if (openaiResponse.ok) {
        const payload = await openaiResponse.json();
        const text = outputText(payload);
        if (text) result = JSON.parse(text);
      }
    }

    if (!result) result = fallback(message, siteId ? site : null, issues, activities, reports);

    await ctx.supabase.from("ai_messages").insert({
      site_id: siteId,
      user_id: userId,
      role: "assistant",
      content: result.summary,
    });

    return response({ result });
  }),
};
