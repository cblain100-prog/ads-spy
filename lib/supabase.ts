import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase server-side (memoise). Lit SUPABASE_URL + SUPABASE_KEY dans l'env.
 * Renvoie null si non configure -> l'app reste affichable (etat vide + banniere setup),
 * elle ne crashe pas avant que le setup Supabase soit fait.
 */
let client: SupabaseClient | null | undefined;

export function sb(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

export function isConfigured(): boolean {
  return sb() !== null;
}
