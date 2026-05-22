import { describe, it, expect } from 'vitest'
import { forkliftSchema, customerSchema, saleSchema, newUserSchema } from '@/lib/validation'

describe('forkliftSchema', () => {
  it('accepts minimal valid input', () => {
    const r = forkliftSchema.parse({
      stockNumber: 'N-1',
      condition: 'NEW',
      make: 'Toyota',
      model: '8FGCU25',
    })
    expect(r.stockNumber).toBe('N-1')
    expect(r.sideShift).toBe(false)
  })

  it('coerces numeric strings to numbers', () => {
    const r = forkliftSchema.parse({
      stockNumber: 'N-2',
      condition: 'USED',
      make: 'Hyster',
      model: 'H80',
      year: '2019',
      capacityLbs: '5000',
      hours: '1200',
    })
    expect(r.year).toBe(2019)
    expect(r.capacityLbs).toBe(5000)
    expect(r.hours).toBe(1200)
  })

  it('formats decimals to 2 places as strings (Prisma Decimal compatible)', () => {
    const r = forkliftSchema.parse({
      stockNumber: 'N-3',
      condition: 'NEW',
      make: 'X',
      model: 'Y',
      listPrice: '38500',
      acquisitionCost: 31200.5,
    })
    expect(r.listPrice).toBe('38500.00')
    expect(r.acquisitionCost).toBe('31200.50')
  })

  it('rejects empty required fields', () => {
    const r = forkliftSchema.safeParse({ stockNumber: '', condition: 'NEW', make: 'X', model: 'Y' })
    expect(r.success).toBe(false)
  })

  it('rejects out-of-range years', () => {
    const r = forkliftSchema.safeParse({
      stockNumber: 'N-4', condition: 'NEW', make: 'X', model: 'Y', year: '1800',
    })
    expect(r.success).toBe(false)
  })

  it('rejects unknown enum values', () => {
    const r = forkliftSchema.safeParse({
      stockNumber: 'N-5', condition: 'NEW', make: 'X', model: 'Y', fuelType: 'NUCLEAR',
    })
    expect(r.success).toBe(false)
  })
})

describe('customerSchema', () => {
  it('requires first and last name', () => {
    const r = customerSchema.safeParse({ firstName: '', lastName: '' })
    expect(r.success).toBe(false)
  })

  it('treats empty email as undefined', () => {
    const r = customerSchema.parse({ firstName: 'A', lastName: 'B', email: '' })
    expect(r.email).toBeUndefined()
  })

  it('rejects invalid emails', () => {
    const r = customerSchema.safeParse({ firstName: 'A', lastName: 'B', email: 'not-an-email' })
    expect(r.success).toBe(false)
  })
})

describe('saleSchema', () => {
  it('parses dates and prices', () => {
    const r = saleSchema.parse({
      forkliftId: 'fk1', customerId: 'c1', saleDate: '2024-01-15', salePrice: '12500.5',
    })
    expect(r.saleDate).toBeInstanceOf(Date)
    expect(r.salePrice).toBe('12500.50')
  })

  it('rejects negative prices', () => {
    expect(() =>
      saleSchema.parse({ forkliftId: 'f', customerId: 'c', saleDate: '2024-01-01', salePrice: '-1' })
    ).toThrow()
  })
})

describe('newUserSchema password rules', () => {
  it('requires upper, lower, digit, and 12+ chars', () => {
    expect(newUserSchema.safeParse({ email: 'a@b.co', name: 'A', role: 'SALES', password: 'short' }).success).toBe(false)
    expect(newUserSchema.safeParse({ email: 'a@b.co', name: 'A', role: 'SALES', password: 'alllowercase12' }).success).toBe(false)
    expect(newUserSchema.safeParse({ email: 'a@b.co', name: 'A', role: 'SALES', password: 'GoodPassword12' }).success).toBe(true)
  })
})
