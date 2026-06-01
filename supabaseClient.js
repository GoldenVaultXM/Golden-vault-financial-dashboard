import { createClient } from "@supabase/supabase-js";

const supabaseUrl = https://vedrlsuqewykozjtnfis.supabase.co;
const supabaseKey = sb_publishable_PL5CPn7kHa3KnUbHlT0LRg___KtNLud;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel settings."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
