import { drainStorageCleanup } from '../_shared/storageCleanup.ts';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
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

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers });
    if (req.method !== "POST") return response({ error: "Metodo non consentito" }, 405);

    const body = await req.json().catch(() => ({}));
    if (body.confirm !== "DELETE") return response({ error: "Conferma eliminazione mancante" }, 400);

    const userId = ctx.userClaims?.id;
    if (!userId) return response({ error: "Utente non autenticato" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return response({ error: "Servizio account non configurato" }, 503);

    const admin = createClient(url, serviceKey, {
      global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(15000) }) },
    auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: prepError } = await admin.rpc("prepare_one_storage_account_deletion", {
      p_target_user: userId,
    });
    if (prepError) {
      console.error(JSON.stringify({ event: "one_delete_account_prepare_failed", code: prepError.code || "unknown" }));
      return response({ error: "Non riesco a preparare l'eliminazione dell'account" }, 500);
    }

    try {
      const cleanup = await drainStorageCleanup(admin, 20);
      if (cleanup.pending) return response({ error: "Pulizia allegati in corso. Riprova tra pochi minuti." }, 503);
    } catch {
      return response({ error: "Pulizia allegati temporaneamente non disponibile. Riprova tra pochi minuti." }, 503);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error(JSON.stringify({ event: "one_delete_account_failed", status: deleteError.status || null }));
      return response({ error: "Eliminazione account non completata" }, 500);
    }

    return response({ ok: true });
  }),
};
