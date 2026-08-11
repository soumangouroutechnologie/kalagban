import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Déclaration pour éviter les erreurs TypeScript dans VS Code (qui est configuré pour Node.js)
declare const Deno: any;

const ZAVU_API_KEY = Deno.env.get('ZAVU_API_KEY');

Deno.serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    // Extract webhook payload from Supabase Auth
    const payload = await req.json();

    const phone = payload.user?.phone;
    const otp = payload.sms?.otp;

    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: 'Missing phone or OTP in webhook payload' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!ZAVU_API_KEY) {
      throw new Error('ZAVU_API_KEY environment variable is missing');
    }

    console.log(`Envoi du code OTP via WhatsApp (Zavu) au numéro: ${phone}`);

    // Send message via Zavu REST API
    const response = await fetch('https://api.zavu.dev/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZAVU_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone.startsWith('+') ? phone : `+${phone}`,
        text: `Bienvenue sur Kalagban ! 🛍️\n\nVoici votre code de vérification : *${otp}*\n\nNe le partagez avec personne.`,
        channel: 'whatsapp'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zavu API error:', errorText);
      throw new Error(`Zavu returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('WhatsApp message sent successfully:', data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending WhatsApp OTP:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
