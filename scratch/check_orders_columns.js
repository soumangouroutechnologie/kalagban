const supabaseUrl = "https://ddqwnscrmzwnciinehtf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcXduc2NybXp3bmNpaW5laHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NjQ0MDUsImV4cCI6MjEwMjA0MDQwNX0.C95uTYoTZQvW0k6GEOr49hejdpzHVcZhXKs0_1xbhG0";

const headers = {
  "apikey": supabaseAnonKey,
  "Authorization": `Bearer ${supabaseAnonKey}`,
  "Content-Type": "application/json"
};

async function checkOrders() {
  const res = await fetch(`${supabaseUrl}/rest/v1/orders?select=*&limit=5`, { headers });
  const orders = await res.json();
  console.log("Sample orders in DB:");
  console.dir(orders, { depth: null });
}

checkOrders();
