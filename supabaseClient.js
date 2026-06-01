import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://vedrlsuqewykozjtnfis.supabase.co";
const FALLBACK_KEY = "sb_publishable_PL5CPn7kHa3KnUbHlT0LRg___KtNLud";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("[GoldenVault] Supabase configuration missing.");
}

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signUp: async () => ({ data: null, error: { message: "Supabase is not configured." } }),
        signInWithPassword: async () => ({ data: null, error: { message: "Supabase is not configured." } }),
        signInWithOAuth: async () => ({ data: null, error: { message: "Supabase is not configured." } }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: async () => ({ data: [], error: { message: "Supabase is not configured." } }),
        insert: async () => ({ data: null, error: { message: "Supabase is not configured." } }),
        update: async () => ({ data: null, error: { message: "Supabase is not configured." } }),
        delete: async () => ({ data: null, error: { message: "Supabase is not configured." } }),
      }),
    };
