const supabaseUrl = "https://ddqwnscrmzwnciinehtf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcXduc2NybXp3bmNpaW5laHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NjQ0MDUsImV4cCI6MjEwMjA0MDQwNX0.C95uTYoTZQvW0k6GEOr49hejdpzHVcZhXKs0_1xbhG0";

const headers = {
  "apikey": supabaseAnonKey,
  "Authorization": `Bearer ${supabaseAnonKey}`,
  "Content-Type": "application/json"
};

async function testSelectRelation() {
  const res = await fetch(`${supabaseUrl}/rest/v1/products?select=id,title,status,moderation_status,product_media(url)&id=eq.217869b6-8ff8-4c0c-a479-d24eae506043`, { headers });
  const data = await res.json();
  console.log("Result of select(*, product_media(url)):");
  console.dir(data, { depth: null });
}

testSelectRelation();
