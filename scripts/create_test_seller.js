const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54421";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log("Création du compte Vendeur de test...");

  // 1. SignUp seller user
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: 'vendeur@kalagban.ci',
    phone: '+2250700112233',
    password: 'Password123!',
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { full_name: 'Vendeur Certifié Kalagban' }
  });

  if (userError) {
    console.error("Erreur création utilisateur:", userError.message);
    return;
  }

  const userId = userData.user.id;
  console.log("Utilisateur Vendeur créé avec ID:", userId);

  // 2. Create Profile
  await supabase.from('profiles').upsert({
    id: userId,
    full_name: 'Vendeur Certifié Kalagban',
    phone: '+2250700112233',
    role: 'seller'
  });

  // 3. Create Shop
  const { error: shopError } = await supabase.from('shops').upsert({
    id: userId,
    name: 'Boutique Kalagban Certifiée',
    description: 'Boutique officielle de test high-tech et mode en Côte d\'Ivoire.',
    phone: '+2250700112233',
    email: 'vendeur@kalagban.ci',
    status: 'active'
  });

  if (shopError) {
    console.error("Erreur création boutique:", shopError.message);
  } else {
    console.log("Boutique créée avec succès pour le Vendeur !");
  }
}

main();
