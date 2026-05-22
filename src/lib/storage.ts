/**
 * Local-disk file storage.
 *
 * Design notes:
 *   * `STORAGE_ROOT` is the only configured trust boundary; every path
 *     accepted by this module must resolve inside it (path traversal defense).
 *   * Files are content-addressed by SHA-256 *under a date-partitioned prefix*.
 *     This gives us O(1) dedup, integrity verification, and avoids any
 *     single directory growing unbounded.
 *   * The original filename never appears on disk — only in the DB row. This
 *     defangs filename-based injection attacks and OS-specific bad characters.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { env } from './env'

export interface StoredFile {
  storagePath: string  // relative path under STORAGE_ROOT
  sha256: string
  sizeBytes: number
}

const root = path.resolve(env.STORAGE_ROOT)

async function ensureRoot() {
  await fs.mkdir(root, { recursive: true })
}

function safeResolve(relative: string): string {
  const resolved = path.resolve(root, relative)
  // Prevent path traversal: the resolved path must stay inside root.
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Path traversal blocked: ${relative}`)
  }
  return resolved
}

function extFromMime(mime: string, fallback: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
  }
  return map[mime] ?? fallback
}

export async function saveBuffer(
  buf: Buffer,
  opts: { mimeType: string; originalName: string }
): Promise<StoredFile> {
  if (buf.byteLength > env.MAX_UPLOAD_BYTES) {
    throw new Error(`File exceeds maximum size of ${env.MAX_UPLOAD_BYTES} bytes`)
  }
  await ensureRoot()

  const sha = crypto.createHash('sha256').update(buf).digest('hex')
  const now = new Date()
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')

  const origExt = path.extname(opts.originalName).toLowerCase()
  const ext = extFromMime(opts.mimeType, origExt || '.bin')

  // sha[0..2]/sha[2..4]/sha.ext fans out into manageable subdirs
  const relDir = path.posix.join(yyyy, mm, sha.slice(0, 2), sha.slice(2, 4))
  const relPath = path.posix.join(relDir, `${sha}${ext}`)
  const absPath = safeResolve(relPath)

  await fs.mkdir(path.dirname(absPath), { recursive: true })

  // If a file with this hash already exists, skip writing (dedup).
  try {
    const stat = await fs.stat(absPath)
    return { storagePath: relPath, sha256: sha, sizeBytes: stat.size }
  } catch {
    // doesn't exist yet — proceed to write
  }

  await fs.writeFile(absPath, buf, { mode: 0o640 })
  const stat = await fs.stat(absPath)
  return { storagePath: relPath, sha256: sha, sizeBytes: stat.size }
}

export async function readFile(storagePath: string): Promise<Buffer> {
  const abs = safeResolve(storagePath)
  return fs.readFile(abs)
}

export async function deleteFile(storagePath: string): Promise<void> {
  const abs = safeResolve(storagePath)
  try {
    await fs.unlink(abs)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}

export function getStorageRoot(): string {
  return root
}
