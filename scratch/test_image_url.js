async function testImageUrl() {
  const url = 'https://ddqwnscrmzwnciinehtf.supabase.co/storage/v1/object/public/kalagban_media/prod_217869b6-8ff8-4c0c-a479-d24eae506043_0_1787142863132.webp';
  const res = await fetch(url);
  console.log("Status:", res.status);
  console.log("StatusText:", res.statusText);
  if (!res.ok) {
    const txt = await res.text();
    console.log("Response body:", txt);
  } else {
    console.log("Content-Type:", res.headers.get("content-type"));
    console.log("Content-Length:", res.headers.get("content-length"));
  }
}

testImageUrl();
