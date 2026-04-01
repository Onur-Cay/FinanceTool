import { Hono } from 'hono'
import { db } from '../db/index.js'
import { settings } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const app = new Hono()

// GET /api/settings
app.get('/', (c) => {
  const rows = db.select().from(settings).all()
  const result: Record<string, string> = {}
  for (const row of rows) {
    result[row.key] = row.value
  }
  return c.json(result)
})

// PUT /api/settings
app.put('/', async (c) => {
  const body = await c.req.json<Record<string, string>>()
  for (const [key, value] of Object.entries(body)) {
    const existing = db.select().from(settings).where(eq(settings.key, key)).get()
    if (existing) {
      db.update(settings).set({ value }).where(eq(settings.key, key)).run()
    } else {
      db.insert(settings).values({ key, value }).run()
    }
  }
  // Return updated settings
  const rows = db.select().from(settings).all()
  const result: Record<string, string> = {}
  for (const row of rows) {
    result[row.key] = row.value
  }
  return c.json(result)
})

export default app
