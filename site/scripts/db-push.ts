import { neon } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'

// Carga .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL no está definida en .env.local')
  process.exit(1)
}

const sql = neon(DATABASE_URL)
const migrationsDir = path.join(__dirname, '..', '..', 'supabase', 'migrations')

// Separa el SQL en statements individuales (split por ';' ignorando líneas de comentarios)
function splitStatements(content: string): string[] {
  return content
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.replace(/--[^\n]*/g, '').trim().startsWith('--'))
    .filter(s => s.replace(/--[^\n]*/g, '').trim().length > 0)
}

async function ensureMigrationsTable() {
  await sql(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id serial PRIMARY KEY,
      name text UNIQUE NOT NULL,
      applied_at timestamptz DEFAULT now()
    )
  `)
}

async function getApplied(): Promise<string[]> {
  const rows = await sql(`SELECT name FROM _migrations ORDER BY name`)
  return rows.map((r: Record<string, unknown>) => r.name as string)
}

async function markApplied(name: string) {
  await sql(`INSERT INTO _migrations (name) VALUES ('${name}') ON CONFLICT (name) DO NOTHING`)
}

async function main() {
  const initMode = process.argv.includes('--init')

  await ensureMigrationsTable()
  const applied = await getApplied()

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  const pending = files.filter(f => !applied.includes(f))

  if (pending.length === 0) {
    console.log('✅  Todo al día, no hay migraciones pendientes.')
    return
  }

  if (initMode) {
    console.log(`🔖  Marcando ${pending.length} migración(es) como aplicadas (sin ejecutar):\n`)
    for (const file of pending) {
      await markApplied(file)
      console.log(`  ✓ ${file}`)
    }
    console.log('\n✅  Listo. Futuras migraciones se ejecutarán con npm run db:push')
    return
  }

  console.log(`📦  ${pending.length} migración(es) pendiente(s):\n`)

  for (const file of pending) {
    const filePath = path.join(migrationsDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const statements = splitStatements(content)

    process.stdout.write(`  → ${file} (${statements.length} statements) ... `)

    for (const stmt of statements) {
      await sql(stmt)
    }
    await markApplied(file)

    console.log('✓')
  }

  console.log('\n✅  Migraciones aplicadas correctamente.')
}

main().catch(err => {
  console.error('\n❌  Error:', err.message)
  process.exit(1)
})
