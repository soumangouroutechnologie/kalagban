const supabaseUrl = "https://ddqwnscrmzwnciinehtf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcXduc2NybXp3bmNpaW5laHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NjQ0MDUsImV4cCI6MjEwMjA0MDQwNX0.C95uTYoTZQvW0k6GEOr49hejdpzHVcZhXKs0_1xbhG0";

const headers = {
  "apikey": supabaseAnonKey,
  "Authorization": `Bearer ${supabaseAnonKey}`,
  "Content-Type": "application/json"
};

async function checkMedia() {
  // 1. Get all products
  const resProds = await fetch(`${supabaseUrl}/rest/v1/products?select=id,title,status,moderation_status,product_media(id,url,position)`, { headers });
  const prods = await resProds.json();
  console.log("=== PRODUITS & LEURS PRODUCT_MEDIA ===");
  console.dir(prods, { depth: null });

  // 2. Get all product_media directly
  const resMedia = await fetch(`${supabaseUrl}/rest/v1/product_media?select=*`, { headers });
  const medias = await resMedia.json();
  console.log("\n=== TABLE PRODUCT_MEDIA DIRECTEMENT ===");
  console.dir(medias, { depth: null });
}

checkMedia();
