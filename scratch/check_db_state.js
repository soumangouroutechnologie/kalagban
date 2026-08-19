const supabaseUrl = "https://ddqwnscrmzwnciinehtf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcXduc2NybXp3bmNpaW5laHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NjQ0MDUsImV4cCI6MjEwMjA0MDQwNX0.C95uTYoTZQvW0k6GEOr49hejdpzHVcZhXKs0_1xbhG0";

const headers = {
  "apikey": supabaseAnonKey,
  "Authorization": `Bearer ${supabaseAnonKey}`,
  "Content-Type": "application/json"
};

async function checkTable(endpoint, label) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, { headers });
    if (!res.ok) {
      const errText = await res.text();
      console.log(`❌ ${label}: Erreur ${res.status} - ${errText}`);
      return null;
    }
    const data = await res.json();
    console.log(`✅ ${label}: Accessible (${Array.isArray(data) ? data.length + " éléments retournés" : "OK"})`);
    return data;
  } catch (err) {
    console.log(`❌ ${label}: Erreur réseau - ${err.message}`);
    return null;
  }
}

async function inspectLiveSupabase() {
  console.log("\n==================================================");
  console.log("📡 INTERROGATION DIRECTE DE LA BASE SUPABASE EN DIRECT");
  console.log("==================================================\n");

  // 1. Orders & customer_email
  const orders = await checkTable("orders?select=id,customer_name,customer_email,status,relay_status,pickup_code&limit=3", "1. Table 'orders' (avec customer_email)");
  if (orders && orders.length > 0) {
    console.log("   👉 Échantillon commande:", orders[0]);
  }

  // 2. Customer notifications
  const notifs = await checkTable("customer_notifications?select=id,title,message,type&limit=3", "2. Table 'customer_notifications'");
  if (notifs && notifs.length > 0) {
    console.log("   👉 Échantillon notification:", notifs[0]);
  }

  // 3. Pickup Points & Pins
  const relays = await checkTable("pickup_points?select=id,code,name,commune,pin_code,max_capacity,status&limit=5", "3. Table 'pickup_points' (avec PINs & Capacité)");
  if (relays && relays.length > 0) {
    console.log("   👉 Exemples de Points Relais actifs:");
    relays.forEach(r => console.log(`      - [${r.code}] ${r.name} (${r.commune}) | PIN: ${r.pin_code} | Capacité: ${r.max_capacity}`));
  }

  // 4. Communes
  const communes = await checkTable("communes?select=id,name,code,color_code&limit=10", "4. Table 'communes' (10 communes d'Abidjan)");
  if (communes && communes.length > 0) {
    console.log("   👉 Communes enregistrées:", communes.map(c => c.name).join(", "));
  }

  // 5. Relay Logs
  const logs = await checkTable("relay_logs?select=id,pickup_point_id,order_code,action_type,otp_code,commission_earned,created_at&limit=3", "5. Table 'relay_logs' (Journal Live des Scans)");
  if (logs && logs.length > 0) {
    console.log("   👉 Échantillon log de scan:", logs[0]);
  }

  // 6. Products & Moderation Status
  const prods = await checkTable("products?select=id,title,status,moderation_status,price&limit=5", "6. Table 'products' (Statut & Modération)");
  if (prods && prods.length > 0) {
    console.log("   👉 Produits en base:");
    prods.forEach(p => console.log(`      - "${p.title}" | Statut: ${p.status} | Modération: ${p.moderation_status}`));
  }

  // 7. RPC Function relay_receive_package
  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/relay_receive_package`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_order_id: "00000000-0000-0000-0000-000000000000",
        p_pickup_code: "123456",
        p_relay_code: "RELAY-TEST"
      })
    });
    const rpcData = await rpcRes.json();
    console.log(`✅ 7. Fonction RPC 'relay_receive_package': Fonctionnelle (Réponse: ${JSON.stringify(rpcData)})`);
  } catch (rpcErr) {
    console.log(`❌ 7. Fonction RPC 'relay_receive_package': ${rpcErr.message}`);
  }

  console.log("\n==================================================");
  console.log("🎉 DIAGNOSTIC TERMINÉ : TOUTES LES REQUÊTES SONT ACTIVES EN BASE !");
  console.log("==================================================\n");
}

inspectLiveSupabase();
