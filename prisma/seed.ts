/**
 * Seed script — creates the initial admin user and a small amount of demo data.
 * Run with: pnpm db:seed
 *
 * Re-runnable: uses upsert semantics, so it's safe to run repeatedly. Demo
 * data is only created if no forklifts exist yet, to avoid duplicate seeding.
 */
import { PrismaClient, UserRole, Condition, FuelType, ForkliftClass, TireType, InventoryStatus, SaleType } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMeImmediately!1'
  const adminName = process.env.SEED_ADMIN_NAME ?? 'Administrator'

  const passwordHash = await hash(adminPassword, 12)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: UserRole.ADMIN,
      mustChangePwd: true,
    },
    update: {},
  })
  console.log(`✓ Admin user: ${admin.email}`)

  const existingCount = await prisma.forklift.count()
  if (existingCount > 0) {
    console.log(`✓ Inventory already has ${existingCount} units — skipping demo data`)
    return
  }

  // A handful of representative units so a fresh install isn't empty.
  await prisma.forklift.createMany({
    data: [
      {
        stockNumber: 'N-1001',
        condition: Condition.NEW,
        status: InventoryStatus.AVAILABLE,
        make: 'Toyota',
        model: '8FGCU25',
        year: 2025,
        serialNumber: '8FGCU25-DEMO-001',
        fuelType: FuelType.LP_GAS,
        forkliftClass: ForkliftClass.CLASS_IV,
        capacityLbs: 5000,
        mastType: 'Triple Stage',
        mastLoweredIn: 87,
        mastRaisedIn: 189,
        sideShift: true,
        tireType: TireType.CUSHION,
        listPrice: '38500.00',
        acquisitionCost: '31200.00',
        yardLocation: 'A-12',
      },
      {
        stockNumber: 'U-2042',
        condition: Condition.USED,
        status: InventoryStatus.AVAILABLE,
        make: 'Hyster',
        model: 'H80FT',
        year: 2019,
        serialNumber: 'H80FT-DEMO-2042',
        fuelType: FuelType.DIESEL,
        forkliftClass: ForkliftClass.CLASS_V,
        capacityLbs: 8000,
        hours: 4120,
        mastType: 'Two Stage',
        sideShift: false,
        tireType: TireType.PNEUMATIC,
        listPrice: '24750.00',
        acquisitionCost: '18000.00',
        yardLocation: 'B-03',
      },
      {
        stockNumber: 'U-2043',
        condition: Condition.USED,
        status: InventoryStatus.AVAILABLE,
        make: 'Crown',
        model: 'RR5725',
        year: 2021,
        serialNumber: 'RR5725-DEMO-2043',
        fuelType: FuelType.ELECTRIC,
        forkliftClass: ForkliftClass.CLASS_II,
        capacityLbs: 4500,
        hours: 1850,
        batteryVolts: 36,
        sideShift: true,
        tireType: TireType.SOLID_PNEUMATIC,
        listPrice: '32900.00',
        acquisitionCost: '26500.00',
        yardLocation: 'A-07',
      },
    ],
  })
  console.log('✓ Created 3 demo inventory units')

  const customer = await prisma.customer.create({
    data: {
      company: 'Acme Warehousing LLC',
      firstName: 'Jordan',
      lastName: 'Rivers',
      email: 'jordan@acme-warehousing.example',
      phone: '555-0101',
      city: 'Portland',
      state: 'OR',
    },
  })
  console.log(`✓ Created demo customer: ${customer.company}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
