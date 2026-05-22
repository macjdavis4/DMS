/**
 * Nightly backup script.
 *
 * Produces, in BACKUP_DIR:
 *   * db-YYYY-MM-DDTHH-MM-SS.sql.gz   — pg_dump of the entire database
 *   * files-YYYY-MM-DDTHH-MM-SS.tar.gz — tarball of STORAGE_ROOT
 *
 * Snapshots older than BACKUP_RETENTION_DAYS are pruned.
 *
 * Designed to be invoked from cron:
 *   0 2 * * *  cd /opt/forklift-dms && /usr/bin/node ./node_modules/.bin/tsx scripts/backup.ts
 *
 * Or inside Docker as a sidecar container — see docker-compose.yml.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { env } from '../src/lib/env'

const exec = promisify(execFile)

function ts(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

async function dumpDatabase(stamp: string): Promise<string> {
  const file = path.join(env.BACKUP_DIR, `db-${stamp}.sql.gz`)
  // pg_dump | gzip
  const url = new URL(env.DATABASE_URL)
  const dbName = url.pathname.replace(/^\//, '')
  const args = [
    '-h', url.hostname,
    '-p', url.port || '5432',
    '-U', decodeURIComponent(url.username),
    '-d', dbName,
    '--no-owner',
    '--no-privileges',
    '--format=plain',
    '--compress=6',
    '-f', file,
  ]
  const envWithPass = { ...process.env, PGPASSWORD: decodeURIComponent(url.password) }

  console.log(`→ pg_dump ${dbName} → ${file}`)
  await exec('pg_dump', args, { env: envWithPass, maxBuffer: 1024 * 1024 * 64 })
  return file
}

async function tarStorage(stamp: string): Promise<string | null> {
  try {
    await fs.access(env.STORAGE_ROOT)
  } catch {
    console.log('→ storage root missing — skipping file backup')
    return null
  }
  const file = path.join(env.BACKUP_DIR, `files-${stamp}.tar.gz`)
  console.log(`→ tar ${env.STORAGE_ROOT} → ${file}`)
  await exec('tar', ['-C', path.dirname(env.STORAGE_ROOT), '-czf', file, path.basename(env.STORAGE_ROOT)])
  return file
}

async function prune() {
  const cutoff = Date.now() - env.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000
  const entries = await fs.readdir(env.BACKUP_DIR)
  for (const e of entries) {
    if (!e.startsWith('db-') && !e.startsWith('files-')) continue
    const full = path.join(env.BACKUP_DIR, e)
    const stat = await fs.stat(full)
    if (stat.mtimeMs < cutoff) {
      console.log(`→ pruning ${e}`)
      await fs.unlink(full)
    }
  }
}

async function main() {
  await ensureDir(env.BACKUP_DIR)
  const stamp = ts()
  const dbFile = await dumpDatabase(stamp)
  const tarFile = await tarStorage(stamp)
  await prune()
  console.log(`✓ Backup complete: ${path.basename(dbFile)}${tarFile ? `, ${path.basename(tarFile)}` : ''}`)
}

main().catch((err) => {
  console.error('Backup failed:', err)
  process.exit(1)
})
