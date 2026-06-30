import { supabase } from './supabase';
import type { Profile } from '../types/lms';
import { validateRegistrationInput } from '../validation/schemas';

export interface RegistrationResult {
  success: boolean;
  error: string | null;
}

export async function registerStudent(
  name: string,
  email: string,
  password: string
): Promise<RegistrationResult> {
  try {
    const input = validateRegistrationInput({ name, email, password });

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { name: input.name },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          name: input.name,
          role: 'student',
        });

      if (profileError) {
        return { success: false, error: profileError.message };
      }
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Registration failed' };
  }
}

export async function getInstructorById(instructorId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', instructorId)
    .single();

  if (error) return null;
  return data as Profile;
}

export async function getInstructors(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'instructor');

  if (error) return [];
  return (data || []) as Profile[];
}