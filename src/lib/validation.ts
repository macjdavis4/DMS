/**
 * Centralised Zod schemas used by server actions and forms.
 * Sharing them keeps client and server validation in lockstep.
 */
import { z } from 'zod'
import {
  Condition,
  ForkliftClass,
  FuelType,
  InventoryStatus,
  SaleType,
  TireType,
  UserRole,
} from '@prisma/client'

const optionalString = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v === '' ? undefined : v))

const optionalInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === '' || v === null) return undefined
    const n = typeof v === 'string' ? Number(v) : v
    return Number.isFinite(n) ? Math.trunc(n) : undefined
  })

const optionalDecimal = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === '' || v === null) return undefined
    const n = typeof v === 'string' ? Number(v) : v
    return Number.isFinite(n) ? n.toFixed(2) : undefined
  })

const optionalDate = z
  .union([z.string(), z.date()])
  .optional()
  .transform((v) => {
    if (!v) return undefined
    const d = v instanceof Date ? v : new Date(v)
    return Number.isNaN(d.getTime()) ? undefined : d
  })

export const forkliftSchema = z.object({
  stockNumber: z.string().trim().min(1, 'Stock number is required').max(40),
  status: z.nativeEnum(InventoryStatus).default(InventoryStatus.AVAILABLE),
  condition: z.nativeEnum(Condition),
  make: z.string().trim().min(1, 'Make is required').max(80),
  model: z.string().trim().min(1, 'Model is required').max(80),
  year: optionalInt.pipe(z.number().int().min(1950).max(2100).optional()),
  serialNumber: optionalString,
  fuelType: z.nativeEnum(FuelType).optional(),
  forkliftClass: z.nativeEnum(ForkliftClass).optional(),
  capacityLbs: optionalInt.pipe(z.number().int().min(0).max(200000).optional()),
  mastType: optionalString,
  mastLoweredIn: optionalInt.pipe(z.number().int().min(0).max(1000).optional()),
  mastRaisedIn: optionalInt.pipe(z.number().int().min(0).max(2000).optional()),
  sideShift: z.coerce.boolean().default(false),
  attachments: optionalString,
  hours: optionalInt.pipe(z.number().int().min(0).max(1_000_000).optional()),
  tireType: z.nativeEnum(TireType).optional(),
  batteryVolts: optionalInt.pipe(z.number().int().min(0).max(1000).optional()),
  color: optionalString,
  yardLocation: optionalString,
  acquisitionDate: optionalDate,
  acquisitionCost: optionalDecimal,
  listPrice: optionalDecimal,
  description: optionalString,
  internalNotes: optionalString,
})

export type ForkliftInput = z.infer<typeof forkliftSchema>

export const customerSchema = z.object({
  company: optionalString,
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  email: z
    .string()
    .trim()
    .email('Invalid email')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  phone: optionalString,
  address1: optionalString,
  address2: optionalString,
  city: optionalString,
  state: optionalString,
  zip: optionalString,
  notes: optionalString,
})

export type CustomerInput = z.infer<typeof customerSchema>

export const saleSchema = z.object({
  forkliftId: z.string().min(1, 'Forklift is required'),
  customerId: z.string().min(1, 'Customer is required'),
  saleDate: z
    .union([z.string(), z.date()])
    .transform((v) => {
      const d = v instanceof Date ? v : new Date(v)
      if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
      return d
    }),
  salePrice: z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === 'string' ? Number(v) : v
      if (!Number.isFinite(n) || n < 0) throw new Error('Sale price must be a positive number')
      return n.toFixed(2)
    }),
  saleType: z.nativeEnum(SaleType).default(SaleType.CASH),
  invoiceNumber: optionalString,
  notes: optionalString,
  isHistorical: z.coerce.boolean().default(false),
  dataCardId: optionalString,
})

export type SaleInput = z.infer<typeof saleSchema>

export const userSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().min(1).max(120),
  role: z.nativeEnum(UserRole),
  isActive: z.coerce.boolean().default(true),
})

export const newUserSchema = userSchema.extend({
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(200)
    .refine(
      (v) => /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v),
      'Password must include upper, lower, and a digit'
    ),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .refine(
        (v) => /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v),
        'Password must include upper, lower, and a digit'
      ),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
