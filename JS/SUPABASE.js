import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://fxerjisllxlpqhspkfod.supabase.co';
const SUPABASE_KEY = 'sb_publishable_v05ZKSHalGTFefi-8Krgjw_cz8SZdwD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Disponibilizar globalmente para compatibilidade de scripts caso necessário
if (typeof window !== 'undefined') {
  window.supabaseClient = supabase;
}
