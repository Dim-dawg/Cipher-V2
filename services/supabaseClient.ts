import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
// These should be set in your Netlify environment settings
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key are required!');
}

// Create a single Supabase client for convenience
export const supabase = createClient(supabaseUrl, supabaseKey);
