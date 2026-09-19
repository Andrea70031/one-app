import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { drainStorageCleanup } from '../_shared/storageCleanup.ts';
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token || token.length !== 64) return new Response(null, { status: 401 });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(15000) }) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc('authorize_one_storage_worker', { p_token: token });
  if (error || data !== true) return new Response(null, { status: 401 });
  try {
    const result = await drainStorageCleanup(admin);
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Cleanup pending' }, { status: 503 });
  }
});
