import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { failLoud } from './error-envelope.ts'

export interface AuthContext {
  userId: string
  role: string
  tenantId: string
}

export async function resolveAuthContext(req: Request): Promise<AuthContext | Response> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const authHeader = req.headers.get('authorization')
  const jwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
  if (userError || !user) {
    return failLoud('No valid authentication token', userError?.message, 401)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, tenant_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return failLoud('Caller profile not found', profileError?.message, 401)
  }

  if (!profile.tenant_id) {
    return failLoud('D-15: caller tenant_id is null — refusing operation', undefined, 500)
  }

  return {
    userId: profile.id,
    role: profile.role,
    tenantId: profile.tenant_id,
  }
}
