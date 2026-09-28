import { createClient } from "@supabase/supabase-js";

export const APP_CONFIG = globalThis.PHYSICS_PORTAL_CONFIG || { supabaseUrl: "", supabasePublishableKey: "", teacherRedirectUrl: "" };
const isSupabaseConfigured = () => /^https:\/\/.+\.supabase\.co$/.test(APP_CONFIG.supabaseUrl) && APP_CONFIG.supabasePublishableKey.startsWith("sb_publishable_");

let sharedClient;

export class PortalRequestError extends Error {
  constructor(message, { status = null, transient = false } = {}) {
    super(message);
    this.name = "PortalRequestError";
    this.status = status;
    this.transient = transient;
  }
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!sharedClient) {
    sharedClient = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return sharedClient;
}

export async function invokeFunction(name, body = {}) {
  const client = getSupabaseClient();
  if (!client) throw new PortalRequestError("Портал временно недоступен. Попробуйте немного позже.");
  const { data, error } = await client.functions.invoke(name, { body });
  if (error) {
    const status = Number(error.context?.status) || null;
    let message = error.message || "Не удалось выполнить запрос.";
    try { message = (await error.context?.clone().json())?.error || message; } catch { /* Transport errors may not contain JSON. */ }
    const transient = !status || status === 408 || status === 429 || status >= 500;
    throw new PortalRequestError(message, { status, transient });
  }
  if (data?.error) throw new PortalRequestError(data.error);
  return data;
}
