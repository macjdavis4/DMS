/**
 * Cross-entity search endpoint used by the global search bar.
 * Returns a small slice of each entity type so the popover stays snappy.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'

const LIMIT_PER_TYPE = 5

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 2) {
    return NextResponse.json({ forklifts: [], customers: [], sales: [] })
  }

  const [forklifts, customers, sales] = await Promise.all([
    prisma.forklift.findMany({
      where: {
        deletedAt: null,
        OR: [
          { stockNumber: { contains: q, mode: 'insensitive' } },
          { make: { contains: q, mode: 'insensitive' } },
          { model: { contains: q, mode: 'insensitive' } },
          { serialNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, stockNumber: true, make: true, model: true, year: true },
      take: LIMIT_PER_TYPE,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.customer.findMany({
      where: {
        deletedAt: null,
        OR: [
          { company: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, company: true, firstName: true, lastName: true },
      take: LIMIT_PER_TYPE,
      orderBy: [{ company: 'asc' }, { lastName: 'asc' }],
    }),
    prisma.sale.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: q, mode: 'insensitive' } },
          { customer: { company: { contains: q, mode: 'insensitive' } } },
          { customer: { lastName: { contains: q, mode: 'insensitive' } } },
          { forklift: { stockNumber: { contains: q, mode: 'insensitive' } } },
          { forklift: { make: { contains: q, mode: 'insensitive' } } },
          { forklift: { model: { contains: q, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        saleDate: true,
        customer: { select: { company: true, firstName: true, lastName: true } },
        forklift: { select: { stockNumber: true, make: true, model: true } },
      },
      take: LIMIT_PER_TYPE,
      orderBy: { saleDate: 'desc' },
    }),
  ])

  return NextResponse.json({
    forklifts,
    customers: customers.map((c) => ({
      id: c.id,
      display: c.company || `${c.firstName} ${c.lastName}`,
    })),
    sales: sales.map((s) => ({
      id: s.id,
      display: `${s.forklift.make} ${s.forklift.model} → ${s.customer.company || `${s.customer.firstName} ${s.customer.lastName}`}`,
      saleDate: s.saleDate.toISOString(),
    })),
  })
}
