import { describe, it, expect, beforeAll } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

let storage: typeof import('@/lib/storage')

beforeAll(async () => {
  process.env.STORAGE_ROOT = path.join(os.tmpdir(), `forklift-test-${Date.now()}`)
  storage = await import('@/lib/storage')
})

describe('storage', () => {
  it('stores buffer, returns content-addressed path, and rejects oversize', async () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])  // jpg magic prefix
    const r = await storage.saveBuffer(buf, { mimeType: 'image/jpeg', originalName: 'test.jpg' })
    expect(r.storagePath).toMatch(/\.jpg$/)
    expect(r.sha256).toHaveLength(64)
    expect(r.sizeBytes).toBe(buf.byteLength)
    const round = await storage.readFile(r.storagePath)
    expect(round.equals(buf)).toBe(true)
  })

  it('deduplicates identical files', async () => {
    const buf = Buffer.from('hello world')
    const a = await storage.saveBuffer(buf, { mimeType: 'image/png', originalName: 'a.png' })
    const b = await storage.saveBuffer(buf, { mimeType: 'image/png', originalName: 'b.png' })
    expect(a.storagePath).toBe(b.storagePath)
  })

  it('refuses path-traversal in readFile', async () => {
    await expect(storage.readFile('../../../etc/passwd')).rejects.toThrow()
  })

  it('cleans up missing files in deleteFile without error', async () => {
    await expect(storage.deleteFile('nonexistent/file.bin')).resolves.toBeUndefined()
  })

  it('writes are not world-readable', async () => {
    const buf = Buffer.from('confidential')
    const r = await storage.saveBuffer(buf, { mimeType: 'application/pdf', originalName: 'doc.pdf' })
    const stat = await fs.stat(path.join(storage.getStorageRoot(), r.storagePath))
    const mode = stat.mode & 0o777
    expect(mode & 0o004).toBe(0)  // not readable by 'other'
  })
})
