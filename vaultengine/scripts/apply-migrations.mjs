#!/usr/bin/env node
import fs from 'fs'
import { execSync } from 'child_process'
import path from 'path'

const MIGRATION_FILE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../supabase/migrations/20260811_vaultengine_schema.sql')

function readMigration() {
  try {
    return fs.readFileSync(MIGRATION_FILE, 'utf8')
  } catch (err) {
    console.error('Migration file not found at', MIGRATION_FILE)
    process.exit(1)
  }
}

async function trySupabaseCli(projectRef) {
  try {
    console.log('Attempting to run `npx supabase db push` (requires SUPABASE_ACCESS_TOKEN env var)')
    execSync(`npx supabase db push --project-ref ${projectRef}`, { stdio: 'inherit' })
    console.log('Supabase CLI migration completed')
    return true
  } catch (err) {
    console.warn('Supabase CLI migration failed or supabase CLI not available:', err.message)
    return false
  }
}

async function tryPsql(dbUrl, sql) {
  try {
    console.log('Attempting to run SQL via psql (requires DATABASE_URL)')
    const child = execSync(`psql ${dbUrl} -v ON_ERROR_STOP=1 -q -f -`, { input: sql, stdio: 'inherit' })
    console.log('psql migration completed')
    return true
  } catch (err) {
    console.warn('psql migration failed or psql not available:', err.message)
    return false
  }
}

function printManualInstructions(sql) {
  console.log('\n--- Manual Migration Required ---')
  console.log('Your environment does not appear to provide a way to run migrations automatically.')
  console.log('Please open the Supabase project SQL editor (https://app.supabase.com/project/<project-ref>/sql) and run the following SQL:')
  console.log('\n----- BEGIN SQL -----\n')
  console.log(sql)
  console.log('\n----- END SQL -----\n')
  console.log('After applying, re-run `npm run seed`')
}

function getProjectRefFromUrl(url) {
  // expect https://<ref>.supabase.co
  try {
    const u = new URL(url)
    const host = u.hostname
    const ref = host.split('.')[0]
    return ref
  } catch (err) {
    return null
  }
}

async function main() {
  const sql = readMigration()
  const supabaseUrl = process.env.SUPABASE_URL
  const dbUrl = process.env.DATABASE_URL

  if (process.env.SUPABASE_ACCESS_TOKEN && supabaseUrl) {
    const projectRef = getProjectRefFromUrl(supabaseUrl)
    if (projectRef) {
      const ok = await trySupabaseCli(projectRef)
      if (ok) return
    }
  }

  if (dbUrl) {
    const ok = await tryPsql(dbUrl, sql)
    if (ok) return
  }

  // fallback: print the SQL for manual application
  printManualInstructions(sql)
}

main().catch((err) => {
  console.error('Migration helper failed:', err)
  process.exit(1)
})
