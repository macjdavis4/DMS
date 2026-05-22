/**
 * Shared test bootstrapping.
 *
 * Tests that touch the database require a live Postgres at `TEST_DATABASE_URL`
 * (or DATABASE_URL). The CI workflow boots one in a service container.
 */
import { beforeAll } from 'vitest'

if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = 'test-secret-test-secret-test-secret-test-12345'
}
if (!process.env.NEXTAUTH_URL) process.env.NEXTAUTH_URL = 'http://localhost:3000'
if (!process.env.STORAGE_ROOT) process.env.STORAGE_ROOT = '/tmp/forklift-dms-test-storage'

beforeAll(() => {
  // Surface unhandled rejections in tests so silent prisma failures are visible.
  process.on('unhandledRejection', (e) => {
    console.error('unhandledRejection:', e)
    throw e
  })
})
