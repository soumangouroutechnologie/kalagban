import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http")
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : "https://ddqwnscrmzwnciinehtf.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "[SENSITIVE]"
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcXduc2NybXp3bmNpaW5laHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NjQ0MDUsImV4cCI6MjEwMjA0MDQwNX0.C95uTYoTZQvW0k6GEOr49hejdpzHVcZhXKs0_1xbhG0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

