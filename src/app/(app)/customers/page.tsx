import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const dynamic = 'force-dynamic'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''
  const customers = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      ...(q && {
        OR: [
          { company: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      }),
    },
    orderBy: [{ company: 'asc' }, { lastName: 'asc' }],
    include: { _count: { select: { sales: true } } },
    take: 200,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} customers</p>
        </div>
        <Button asChild>
          <Link href="/customers/new">Add Customer</Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-3">
          <form>
            <Input name="q" placeholder="Search company, name, email…" defaultValue={q} />
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                <TableHead className="text-right">Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No customers yet. <Link href="/customers/new" className="text-primary underline">Add one</Link>.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/customers/${c.id}`} className="text-primary hover:underline">
                        {c.company || `${c.firstName} ${c.lastName}`}
                      </Link>
                      {c.company && (
                        <div className="text-xs text-muted-foreground">{c.firstName} {c.lastName}</div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">{c.email ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{c.phone ?? ''}</div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-right">{c._count.sales}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
