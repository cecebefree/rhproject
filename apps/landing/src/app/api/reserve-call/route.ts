import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  return /^[\+]?[\d\s\-\(\)]{7,20}$/.test(phone);
}

async function verifyTurnstileToken(
  token: string,
  ip: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    return { success: false, error: 'CAPTCHA service not configured' };
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          remoteip: ip,
        }),
      }
    );

    const result: TurnstileVerifyResponse = await response.json();
    if (!result.success) {
      return {
        success: false,
        error: result.error_codes?.join(', ') || 'CAPTCHA verification failed',
      };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to verify CAPTCHA' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      preferred_time,
      timezone,
      curriculum_interest,
      message,
      turnstile_token,
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Name is required' },
        { status: 400 }
      );
    }

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

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!validatePhone(phone)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid phone number' },
        { status: 400 }
      );
    }

    if (!preferred_time || typeof preferred_time !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Preferred call time is required' },
        { status: 400 }
      );
    }

    const preferredDate = new Date(preferred_time);
    if (isNaN(preferredDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Invalid preferred call time' },
        { status: 400 }
      );
    }

    if (preferredDate <= new Date()) {
      return NextResponse.json(
        { success: false, message: 'Preferred call time must be in the future' },
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

    // Verify Turnstile
    const turnstileResult = await verifyTurnstileToken(turnstile_token, ip);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { success: false, message: turnstileResult.error || 'CAPTCHA verification failed' },
        { status: 403 }
      );
    }

    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { success: false, message: 'Service temporarily unavailable' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Resolve tenant (first active tenant)
    const { data: tenant } = await supabase
      .schema('public')
      .from('tenant_devotional')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();

    const tenantId = tenant?.id;

    // Build tags array
    const tags: string[] = ['Reserve a Call'];
    if (curriculum_interest) {
      tags.push(curriculum_interest);
    }

    // Insert lead into front_desk.leads
    const { data: lead, error: leadError } = await supabase
      .schema('front_desk')
      .from('leads')
      .insert({
        tenant_id: tenantId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        source: 'Reserve a Call',
        source_type: 'reserve_call_form',
        status: 'new',
        time_zone: timezone || null,
        tags,
        notes: message?.trim() || null,
        callback_scheduled_at: preferredDate.toISOString(),
        callback_status: 'scheduled',
        callback_notes: curriculum_interest
          ? `Curriculum interest: ${curriculum_interest}`
          : null,
        existing_profile: false,
      })
      .select('id')
      .single();

    if (leadError) {
      console.error('Supabase insert error:', leadError);

      if (leadError.code === '23505') {
        return NextResponse.json(
          { success: false, message: 'This email has already been registered' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, message: 'Failed to save your request' },
        { status: 500 }
      );
    }

    // Send confirmation email (fire-and-forget)
    const recipientName = name.trim().split(' ')[0];
    const callDate = preferredDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const callTime = preferredDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    fetch(`${supabaseUrl}/functions/v1/send-auto-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({
        recipient_email: email.trim().toLowerCase(),
        recipient_name: recipientName,
        template_key: 'contact_form_acknowledgement',
        data: {
          call_date: callDate,
          call_time: callTime,
          curriculum_interest: curriculum_interest || 'General inquiry',
        },
      }),
    }).catch((err) => {
      console.error('Confirmation email failed (non-blocking):', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Your call has been reserved! We will confirm via email shortly.',
      id: lead?.id,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
