/**
 * Invite Service — Handle team member invitations.
 * Creates invite tokens, sends emails, processes acceptances.
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface DeskInvite {
  id: string;
  desk_id: string;
  tenant_id: string;
  role_id: string;
  email: string;
  invited_by: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  role?: { name: string; description: string | null };
  inviter?: { email: string; full_name: string | null };
}

export interface CreateInviteInput {
  desk_id: string;
  tenant_id: string;
  email: string;
  role_id: string;
  invited_by: string;
}

// ═══════════════════════════════════════════════════════════
// INVITE QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectDeskInvites(deskId: string) {
  // Fetch invites
  const { data: invites, error } = await supabase
    .from('office_desk.desk_invites')
    .select('*')
    .eq('desk_id', deskId)
    .in('status', ['pending'])
    .order('created_at', { ascending: false });

  if (error || !invites) return { data: invites, error };

  // Fetch roles
  const roleIds = [...new Set(invites.map((i) => i.role_id))];
  const { data: roles } = await supabase
    .from('office_desk.desk_roles')
    .select('id, name, description')
    .in('id', roleIds);

  // Fetch inviters
  const inviterIds = [...new Set(invites.filter((i) => i.invited_by).map((i) => i.invited_by))];
  let inviters: { id: string; email: string }[] = [];
  if (inviterIds.length > 0) {
    const { data } = await supabase.auth.admin.listUsers();
    inviters = data?.users?.filter((u) => inviterIds.includes(u.id)).map((u) => ({ id: u.id, email: u.email || '' })) || [];
  }

  // Merge
  const result = invites.map((inv) => ({
    ...inv,
    role: roles?.find((r) => r.id === inv.role_id) || null,
    inviter: inviters.find((i) => i.id === inv.invited_by) || null,
  }));

  return { data: result, error: null };
}

export async function getInviteByToken(token: string) {
  // Fetch invite
  const { data: invite, error } = await supabase
    .from('office_desk.desk_invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (error || !invite) return { data: invite, error };

  // Fetch role
  const { data: role } = await supabase
    .from('office_desk.desk_roles')
    .select('name, description')
    .eq('id', invite.role_id)
    .single();

  // Fetch desk
  const { data: desk } = await supabase
    .from('office_desk.office_desk')
    .select('name')
    .eq('id', invite.desk_id)
    .single();

  return { data: { ...invite, role, desk }, error: null };
}

export async function createInvite(input: CreateInviteInput) {
  // Check if invite already exists for this email on this desk
  const { data: existing } = await supabase
    .from('office_desk.desk_invites')
    .select('id, status')
    .eq('desk_id', input.desk_id)
    .eq('email', input.email.toLowerCase())
    .eq('status', 'pending')
    .single();

  if (existing) {
    return { data: null, error: { message: 'An invitation is already pending for this email' } };
  }

  // Check if user is already a member
  const { data: user } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', input.email.toLowerCase())
    .single();

  if (user) {
    const { data: member } = await supabase
      .from('office_desk.user_desk_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('desk_id', input.desk_id)
      .single();

    if (member) {
      return { data: null, error: { message: 'This user is already a member of this desk' } };
    }
  }

  // Generate token
  const token = generateInviteToken();

  // Set expiry (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Insert invite
  const { data: invite, error: insertError } = await supabase
    .from('office_desk.desk_invites')
    .insert({
      desk_id: input.desk_id,
      tenant_id: input.tenant_id,
      email: input.email.toLowerCase(),
      role_id: input.role_id,
      invited_by: input.invited_by,
      token,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })
    .select('*')
    .single();

  if (insertError || !invite) return { data: invite, error: insertError };

  // Fetch role
  const { data: role } = await supabase
    .from('office_desk.desk_roles')
    .select('name, description')
    .eq('id', invite.role_id)
    .single();

  return { data: { ...invite, role }, error: null };
}

export async function revokeInvite(inviteId: string) {
  return supabase
    .from('office_desk.desk_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)
    .select()
    .single();
}

export async function acceptInvite(token: string, userId: string) {
  // Get the invite
  const { data: invite, error: inviteError } = await supabase
    .from('office_desk.desk_invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (inviteError || !invite) {
    return { data: null, error: { message: 'Invalid or expired invitation' } };
  }

  // Check expiry
  if (new Date(invite.expires_at) < new Date()) {
    await supabase
      .from('office_desk.desk_invites')
      .update({ status: 'expired' })
      .eq('id', invite.id);
    return { data: null, error: { message: 'This invitation has expired' } };
  }

  // Assign role
  const { data: member, error: assignError } = await supabase
    .from('office_desk.user_desk_roles')
    .upsert({
      user_id: userId,
      desk_id: invite.desk_id,
      role_id: invite.role_id,
      assigned_by: invite.invited_by,
    }, { onConflict: 'user_id,desk_id' })
    .select()
    .single();

  if (assignError) {
    return { data: null, error: { message: 'Failed to join desk' } };
  }

  // Mark invite as accepted
  await supabase
    .from('office_desk.desk_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  // Add to user_desks if not already there
  await supabase
    .from('office_desk.user_desks')
    .upsert({
      user_id: userId,
      desk_id: invite.desk_id,
    }, { onConflict: 'user_id,desk_id' });

  return { data: member, error: null };
}

export async function getInviteByEmail(email: string) {
  // Fetch invite
  const { data: invite, error } = await supabase
    .from('office_desk.desk_invites')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !invite) return { data: invite, error };

  // Fetch role
  const { data: role } = await supabase
    .from('office_desk.desk_roles')
    .select('name, description')
    .eq('id', invite.role_id)
    .single();

  // Fetch desk
  const { data: desk } = await supabase
    .from('office_desk.office_desk')
    .select('name')
    .eq('id', invite.desk_id)
    .single();

  return { data: { ...invite, role, desk }, error: null };
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function generateInviteToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// ═══════════════════════════════════════════════════════════
// INVITE EMAIL (placeholder — integrate with email service)
// ═══════════════════════════════════════════════════════════

export async function sendInviteEmail(invite: DeskInvite, deskName: string): Promise<{ error: Error | null }> {
  // Placeholder: In production, call an Edge Function or email service
  console.log(`Invite email would be sent to ${invite.email} for desk "${deskName}"`);
  console.log(`Accept link: ${window.location.origin}/invite/${invite.token}`);
  return { error: null };
}
