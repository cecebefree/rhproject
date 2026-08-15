// Edge Function for /api/leads
// Cloudflare Pages automatically deploys functions from /functions folder
// This handles lead capture with Turnstile verification and Supabase insert

interface Env {
  TURNSTILE_SECRET_KEY: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
  action?: string;
  cdata?: string;
}

interface LeadData {
  email: string;
  name?: string;
  message?: string;
  turnstile_token: string;
}

// Validate email format
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Verify Turnstile token
async function verifyTurnstileToken(
  token: string,
  ip: string,
  secretKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          remoteip: ip,
        }),
      }
    );

    const result: TurnstileVerifyResponse = await response.json();

    if (!result.success) {
      console.error('Turnstile verification failed:', result.error_codes);
      return {
        success: false,
        error: result.error_codes?.join(', ') || 'CAPTCHA verification failed',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return { success: false, error: 'Failed to verify CAPTCHA' };
  }
}

// Insert lead into Supabase
async function insertLead(
  data: LeadData,
  ip: string,
  env: Env
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/website_leads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.NEXT_PUBLIC_SUPABASE_URL ? '' : '', // Anon key not needed for service role
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          name: data.name?.trim() || null,
          message: data.message?.trim() || null,
          turnstile_token: data.turnstile_token,
          ip_address: ip,
          verified: true,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Supabase insert error:', errorData);

      // Handle duplicate email
      if (response.status === 409 || errorData.code === '23505') {
        return { success: false, error: 'This email is already registered' };
      }

      return { success: false, error: 'Failed to save your information' };
    }

    const result = await response.json();
    return { success: true, id: result[0]?.id };
  } catch (error) {
    console.error('Supabase error:', error);
    return { success: false, error: 'Database error' };
  }
}

// Main request handler
export async function onRequestPost(context: {
  request: Request;
  env: Env;
  params: Record<string, string>;
}): Promise<Response> {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Parse request body
    const body: LeadData = await request.json();
    const { email, name, message, turnstile_token } = body;

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ success: false, message: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Please enter a valid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!turnstile_token || typeof turnstile_token !== 'string') {
      return new Response(
        JSON.stringify({ success: false, message: 'CAPTCHA verification is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get client IP
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Verify Turnstile token
    const turnstileResult = await verifyTurnstileToken(turnstile_token, ip, env.TURNSTILE_SECRET_KEY);
    if (!turnstileResult.success) {
      return new Response(
        JSON.stringify({ success: false, message: turnstileResult.error || 'CAPTCHA verification failed' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Insert lead into database
    const insertResult = await insertLead(body, ip, env);
    if (!insertResult.success) {
      return new Response(
        JSON.stringify({ success: false, message: insertResult.error }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thank you for your interest! Check your email for early access details.',
        id: insertResult.id,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

// Handle OPTIONS request for CORS
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
