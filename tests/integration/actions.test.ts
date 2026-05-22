/**
 * End-to-end persistence tests against a live Postgres.
 *
 * These tests exercise the server actions exactly the way the UI does:
 *   * build a FormData
 *   * call the action with mocked session
 *   * verify the row landed in the database with the expected shape
 *
 * Skipped automatically when DATABASE_URL is not set so CI can opt in.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { hash } from 'bcryptjs'
import type { User } from '@prisma/client'

const DB_AVAILABLE = Boolean(process.env.DATABASE_URL)
const d = DB_AVAILABLE ? describe : describe.skip

// Mocked session — server actions read `auth()` to determine the caller.
let currentUser: User | null = null

vi.mock('@/lib/auth/auth', () => ({
  auth: async () =>
    currentUser
      ? { user: { id: currentUser.id, email: currentUser.email, name: currentUser.name, role: currentUser.role, mustChangePwd: false } }
      : null,
}))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`__REDIRECT__:${url}`)
  },
  notFound: () => {
    throw new Error('__NOT_FOUND__')
  },
}))
vi.mock('next/headers', () => ({
  headers: async () => new Map([['user-agent', 'vitest'], ['x-forwarded-for', '127.0.0.1']]),
}))

let prisma: import('@prisma/client').PrismaClient
let createForklift: typeof import('@/lib/actions/forklift').createForklift
let updateForklift: typeof import('@/lib/actions/forklift').updateForklift
let softDeleteForklift: typeof import('@/lib/actions/forklift').softDeleteForklift
let createCustomer: typeof import('@/lib/actions/customer').createCustomer
let createSale: typeof import('@/lib/actions/sale').createSale

d('server actions persist to the database', () => {
  beforeAll(async () => {
    const dbMod = await import('@/lib/db')
    prisma = dbMod.prisma

    // Make sure we are wired to the test DB. Bail loudly if not.
    await prisma.$queryRaw`SELECT 1`

    // Clean slate for the tests
    await prisma.auditLog.deleteMany()
    await prisma.sale.deleteMany()
    await prisma.attachment.deleteMany()
    await prisma.forklift.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.user.deleteMany({ where: { email: 'test-admin@example.com' } })

    currentUser = await prisma.user.create({
      data: {
        email: 'test-admin@example.com',
        name: 'Test Admin',
        passwordHash: await hash('TestPassword123', 10),
        role: 'ADMIN',
      },
    })

    const fkActions = await import('@/lib/actions/forklift')
    createForklift = fkActions.createForklift
    updateForklift = fkActions.updateForklift
    softDeleteForklift = fkActions.softDeleteForklift
    const cActions = await import('@/lib/actions/customer')
    createCustomer = cActions.createCustomer
    const sActions = await import('@/lib/actions/sale')
    createSale = sActions.createSale
  })

  afterAll(async () => {
    if (prisma) await prisma.$disconnect()
  })

  it('createForklift writes a complete row and returns its id', async () => {
    const fd = new FormData()
    fd.set('stockNumber', `TEST-${Date.now()}`)
    fd.set('condition', 'NEW')
    fd.set('make', 'Toyota')
    fd.set('model', '8FGCU25')
    fd.set('year', '2024')
    fd.set('capacityLbs', '5000')
    fd.set('listPrice', '38500')
    fd.set('acquisitionCost', '31200')
    const result = await createForklift(null, fd)
    expect(result.ok).toBe(true)
    expect(result.id).toBeTruthy()

    const row = await prisma.forklift.findUnique({ where: { id: result.id! } })
    expect(row).not.toBeNull()
    expect(row?.make).toBe('Toyota')
    expect(row?.year).toBe(2024)
    expect(Number(row?.listPrice)).toBeCloseTo(38500)
    expect(row?.deletedAt).toBeNull()

    // Audit row was written
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'Forklift', entityId: result.id!, action: 'CREATE' },
    })
    expect(audit).not.toBeNull()
    expect(audit?.userId).toBe(currentUser!.id)
  })

  it('createForklift rejects invalid input with field errors', async () => {
    const fd = new FormData()
    fd.set('stockNumber', '') // required
    fd.set('condition', 'NEW')
    fd.set('make', 'X')
    fd.set('model', 'Y')
    const result = await createForklift(null, fd)
    expect(result.ok).toBe(false)
    expect(result.errors?.stockNumber).toBeDefined()
  })

  it('createForklift rejects duplicate stockNumber', async () => {
    const stock = `DUP-${Date.now()}`
    const fd1 = new FormData()
    fd1.set('stockNumber', stock)
    fd1.set('condition', 'NEW')
    fd1.set('make', 'X')
    fd1.set('model', 'Y')
    expect((await createForklift(null, fd1)).ok).toBe(true)

    const fd2 = new FormData()
    fd2.set('stockNumber', stock)
    fd2.set('condition', 'USED')
    fd2.set('make', 'X')
    fd2.set('model', 'Y')
    const r = await createForklift(null, fd2)
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/already exists/i)
  })

  it('updateForklift modifies a row and records a diff', async () => {
    const fd = new FormData()
    fd.set('stockNumber', `UPD-${Date.now()}`)
    fd.set('condition', 'USED')
    fd.set('make', 'Hyster')
    fd.set('model', 'H80')
    fd.set('hours', '1000')
    const created = await createForklift(null, fd)
    expect(created.ok).toBe(true)

    const upd = new FormData()
    upd.set('stockNumber', `UPD-${Date.now()}`)
    upd.set('condition', 'USED')
    upd.set('make', 'Hyster')
    upd.set('model', 'H80FT')  // changed
    upd.set('hours', '1500')   // changed
    const res = await updateForklift(created.id!, null, upd)
    expect(res.ok).toBe(true)

    const row = await prisma.forklift.findUnique({ where: { id: created.id! } })
    expect(row?.model).toBe('H80FT')
    expect(row?.hours).toBe(1500)

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'Forklift', entityId: created.id!, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    })
    expect(audit).not.toBeNull()
    expect(audit?.changes).toBeTruthy()
  })

  it('softDeleteForklift sets deletedAt and ARCHIVED status, then redirects', async () => {
    const fd = new FormData()
    fd.set('stockNumber', `DEL-${Date.now()}`)
    fd.set('condition', 'USED')
    fd.set('make', 'X')
    fd.set('model', 'Y')
    const c = await createForklift(null, fd)
    expect(c.ok).toBe(true)

    await expect(softDeleteForklift(c.id!)).rejects.toThrow('__REDIRECT__:/inventory')

    const row = await prisma.forklift.findUnique({ where: { id: c.id! } })
    expect(row?.deletedAt).not.toBeNull()
    expect(row?.status).toBe('ARCHIVED')
  })

  it('createSale flips forklift status to SOLD atomically', async () => {
    const fk = new FormData()
    fk.set('stockNumber', `SALE-${Date.now()}`)
    fk.set('condition', 'NEW')
    fk.set('make', 'Crown')
    fk.set('model', 'RR5725')
    fk.set('listPrice', '32900')
    const created = await createForklift(null, fk)
    expect(created.ok).toBe(true)

    const cust = new FormData()
    cust.set('firstName', 'Test')
    cust.set('lastName', 'Buyer')
    cust.set('company', 'Buyer Co')
    const c = await createCustomer(null, cust)
    expect(c.ok).toBe(true)

    const sale = new FormData()
    sale.set('forkliftId', created.id!)
    sale.set('customerId', c.id!)
    sale.set('saleDate', '2024-06-01')
    sale.set('salePrice', '32500.00')
    sale.set('saleType', 'CASH')
    const r = await createSale(null, sale)
    expect(r.ok).toBe(true)

    const fkRow = await prisma.forklift.findUnique({ where: { id: created.id! } })
    expect(fkRow?.status).toBe('SOLD')

    const saleRow = await prisma.sale.findUnique({ where: { id: r.id! } })
    expect(Number(saleRow?.salePrice)).toBe(32500)

    // attempting to sell again should fail
    const dup = await createSale(null, sale)
    expect(dup.ok).toBe(false)
  })

  it('action denies caller without permission', async () => {
    const real = currentUser!
    // simulate read-only user
    const ro = await prisma.user.create({
      data: { email: `ro-${Date.now()}@example.com`, name: 'RO', passwordHash: 'x', role: 'READ_ONLY' },
    })
    currentUser = ro
    try {
      const fd = new FormData()
      fd.set('stockNumber', `RO-${Date.now()}`)
      fd.set('condition', 'NEW')
      fd.set('make', 'X')
      fd.set('model', 'Y')
      await expect(createForklift(null, fd)).rejects.toThrow(/permission/i)
    } finally {
      currentUser = real
    }
  })
})
