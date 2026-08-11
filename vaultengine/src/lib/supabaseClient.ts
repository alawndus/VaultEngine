import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabaseUrl(): string {
  if (!SUPABASE_URL) {
    throw new Error('VaultEngine requires SUPABASE_URL environment variable.')
  }
  return SUPABASE_URL
}

function getSupabaseServiceRoleKey(): string {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('VaultEngine requires SUPABASE_SERVICE_ROLE_KEY environment variable.')
  }
  return SUPABASE_SERVICE_ROLE_KEY
}

export function getSupabaseClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'x-vaultengine-client': 'server',
      },
    },
  })
}
