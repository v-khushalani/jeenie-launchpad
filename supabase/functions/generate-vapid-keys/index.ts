import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') || 'https://jeenie.website',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate ECDSA P-256 key pair for VAPID
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );

    // Export public key as raw bytes -> base64url
    const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const publicKeyBase64url = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Export private key as JWK to get the 'd' parameter
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const privateKeyBase64url = privateKeyJwk.d!;

    return new Response(
      JSON.stringify({
        publicKey: publicKeyBase64url,
        privateKey: privateKeyBase64url,
        instructions: 'Save publicKey as VAPID_PUBLIC_KEY and privateKey as VAPID_PRIVATE_KEY in Supabase secrets.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
