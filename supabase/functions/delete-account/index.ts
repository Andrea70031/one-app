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
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Remove files only from workspaces that will disappear completely. Shared
    // workspace files remain because ownership is transferred to another member.
    const { data: ownedSites, error: ownedError } = await admin
      .from("sites")
      .select("id")
      .eq("created_by", userId);
    if (ownedError) return response({ error: "Preparazione eliminazione non riuscita" }, 500);

    const ownedIds = (ownedSites || []).map((site: { id: string }) => site.id);
    if (ownedIds.length) {
      const { data: otherMembers, error: memberError } = await admin
        .from("site_members")
        .select("site_id,user_id")
        .in("site_id", ownedIds)
        .neq("user_id", userId);
      if (memberError) return response({ error: "Preparazione eliminazione non riuscita" }, 500);

      const shared = new Set((otherMembers || []).map((member: { site_id: string }) => member.site_id));
      const soleOwned = ownedIds.filter((id: string) => !shared.has(id));

      if (soleOwned.length) {
        const [documents, photos] = await Promise.all([
          admin.from("documents").select("storage_path").in("site_id", soleOwned),
          admin.from("photos").select("storage_path").in("site_id", soleOwned),
        ]);
        if (documents.error || photos.error) return response({ error: "Pulizia file non riuscita" }, 500);

        const paths = Array.from(new Set([
          ...(documents.data || []).map((item: { storage_path: string }) => item.storage_path),
          ...(photos.data || []).map((item: { storage_path: string }) => item.storage_path),
        ].filter(Boolean)));

        if (paths.length) {
          const { error: storageError } = await admin.storage.from("site-files").remove(paths);
          if (storageError) return response({ error: "Pulizia file non riuscita" }, 500);
        }
      }
    }

    const { error: prepError } = await admin.rpc("prepare_one_account_deletion", {
      p_target_user: userId,
    });
    if (prepError) {
      console.error(JSON.stringify({ event: "one_delete_account_prepare_failed", code: prepError.code || "unknown" }));
      return response({ error: "Non riesco a preparare l'eliminazione dell'account" }, 500);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error(JSON.stringify({ event: "one_delete_account_failed", status: deleteError.status || null }));
      return response({ error: "Eliminazione account non completata" }, 500);
    }

    return response({ ok: true });
  }),
};
