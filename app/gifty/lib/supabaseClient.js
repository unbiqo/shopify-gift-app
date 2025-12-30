import { createClient } from '@supabase/supabase-js';
import { env } from './env';

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Key. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
