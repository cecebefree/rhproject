import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Turnstile verification response interface
interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
  action?: string;
  cdata?: string;
}

// Validate email format
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Verify Turnstile token
async function verifyTurnstileToken(
  token: string,
  ip: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY is not configured');
    return { success: false, error: 'CAPTCHA service not configured' };
  }

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

// POST /api/leads
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, name, message, turnstile_token } = body;

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (!turnstile_token || typeof turnstile_token !== 'string') {
      return NextResponse.json(
        { success: false, message: 'CAPTCHA verification is required' },
        { status: 400 }
      );
    }

    // Get client IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Verify Turnstile token
    const turnstileResult = await verifyTurnstileToken(turnstile_token, ip);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { success: false, message: turnstileResult.error || 'CAPTCHA verification failed' },
        { status: 403 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Supabase credentials are not configured');
      return NextResponse.json(
        { success: false, message: 'Service temporarily unavailable' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Insert lead into database
    const { data, error } = await supabase
      .from('website_leads')
      .insert({
        email: email.trim().toLowerCase(),
        name: name?.trim() || null,
        message: message?.trim() || null,
        turnstile_token: turnstile_token,
        ip_address: ip,
        verified: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);

      // Handle duplicate email
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, message: 'This email is already registered' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, message: 'Failed to save your information' },
        { status: 500 }
      );
    }

    // Success
    return NextResponse.json({
      success: true,
      message: 'Thank you for your interest! Check your email for early access details.',
      id: data?.id,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
