import { Hono } from 'hono'
import { db } from '../db/index.js'
import { members, expenseShares } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const app = new Hono()

// GET /api/members
app.get('/', (c) => {
  const result = db.select().from(members).all()
  return c.json(result)
})

// POST /api/members
app.post('/', async (c) => {
  const body = await c.req.json<{ name: string; color: string; is_default?: number }>()

  if (body.is_default) {
    // Unset other defaults
    db.update(members).set({ is_default: 0 }).run()
  }

  const result = db.insert(members).values({
    name: body.name,
    color: body.color,
    is_default: body.is_default || 0,
    created_at: new Date().toISOString(),
  }).returning().get()

  return c.json(result, 201)
})

// PUT /api/members/:id
app.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{ name?: string; color?: string; is_default?: number }>()

  if (body.is_default) {
    db.update(members).set({ is_default: 0 }).run()
  }

  const updates: any = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.color !== undefined) updates.color = body.color
  if (body.is_default !== undefined) updates.is_default = body.is_default

  db.update(members).set(updates).where(eq(members.id, id)).run()
  const result = db.select().from(members).where(eq(members.id, id)).get()
  return c.json(result)
})

// DELETE /api/members/:id
app.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))

  // Check if member has expenses
  const hasExpenses = db.select().from(expenseShares).where(eq(expenseShares.member_id, id)).get()
  if (hasExpenses) {
    return c.json({ message: 'Cannot delete member with existing expenses' }, 400)
  }

  db.delete(members).where(eq(members.id, id)).run()
  return c.json({ success: true })
})

export default app
