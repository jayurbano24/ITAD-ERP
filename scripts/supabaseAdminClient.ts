// Cliente Supabase para scripts administrativos (Node.js)
// Usa variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.');
  }
  return createSupabaseClient(url, key);
}
