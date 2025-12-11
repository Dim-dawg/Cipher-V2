import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
// These should be set in your Netlify environment settings
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: SUPABASE_URL');
}

if (!supabaseKey) {
  throw new Error('Missing environment variable: SUPABASE_KEY');
}

// Create a single Supabase client for convenience
export const supabase = createClient(supabaseUrl, supabaseKey);
