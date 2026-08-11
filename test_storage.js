const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  console.log("Checking buckets...");
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  console.log("Buckets:", buckets?.map(b => b.name), "Error:", bucketsErr);

  console.log("Testing upload...");
  const fileContent = "dummy text content for file upload test";
  const { data, error } = await supabase.storage.from('kalagban_media').upload('test_upload.txt', fileContent);
  console.log("Upload Result:", data, "Error:", error);
}

run();
