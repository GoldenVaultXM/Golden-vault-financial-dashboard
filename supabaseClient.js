import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vedrlsuqewykozjtnfis.supabase.co/rest/v1/';
const supabaseAnonKey = 'sb_publishable_PL5CPn7kHa3KnUbHlT0LRg___KtNLud';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
