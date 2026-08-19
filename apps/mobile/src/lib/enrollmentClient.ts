// src/lib/enrollmentClient.ts
// Enrollment API caller — invokes enroll-student Edge Function (Row 96)

import { supabase } from '../services/supabase';

export interface EnrollmentResult {
  status: string;
  enrollment_id: string;
  message: string;
}

export interface EnrollmentError {
  error: string;
  detail?: string;
}

/**
 * Enroll current user in a class via Edge Function.
 * Returns { data, error } following Supabase convention.
 */
export async function enrollStudent(classId: string): Promise<{
  data: EnrollmentResult | null;
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  try {
    const { data, error } = await supabase.functions.invoke<EnrollmentResult>('enroll-student', {
      body: { class_id: classId },
    });

    if (error) {
      // Parse the Edge Function error response
      const message = extractErrorMessage(error);
      return { data: null, error: message };
    }

    return { data, error: null };
  } catch (err) {
    // Network error or unexpected failure
    const message = err instanceof Error ? err.message : 'Connection failed';
    return { data: null, error: message };
  }
}

/**
 * Extract a human-readable error message from Supabase function error.
 * Handles both structured JSON errors and plain text.
 */
function extractErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error';

  // Supabase FunctionsError has a message property
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const obj = err as Record<string, unknown>;
    const msg = obj.message;

    if (typeof msg === 'string') {
      // Try to parse as JSON (Edge Function error envelope)
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) return parsed.error;
        if (parsed.message) return parsed.message;
      } catch {
        // Not JSON — return raw message
      }
      return msg;
    }
  }

  if (typeof err === 'string') return err;
  return 'Connection failed';
}
