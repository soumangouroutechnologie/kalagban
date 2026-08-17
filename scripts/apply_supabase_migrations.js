const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("Veuillez définir DATABASE_URL pour exécuter les migrations.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: true }
  });

  await client.connect();
  console.log("Connecté à Supabase PostgreSQL.");

  try {
    const migrationFiles = [
      '20260817140000_add_application_fees_to_orders.sql',
      '20260817160000_harden_security_and_rls_policies.sql'
    ];

    for (const filename of migrationFiles) {
      const filePath = path.join(__dirname, '../supabase/migrations', filename);
      console.log(`Exécution : ${filename}`);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      await client.query(sqlContent);
      console.log(`✅ ${filename} OK`);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runMigrations().catch(console.error);
}
