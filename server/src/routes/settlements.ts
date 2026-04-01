import { Hono } from 'hono'
import { db, sqlite } from '../db/index.js'
import { settlements } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const app = new Hono()

// GET /api/settlements
app.get('/', (c) => {
  const month = c.req.query('month')

  let query = `
    SELECT s.*,
           m1.name as from_member_name, m1.color as from_member_color,
           m2.name as to_member_name, m2.color as to_member_color
    FROM settlements s
    JOIN members m1 ON m1.id = s.from_member_id
    JOIN members m2 ON m2.id = s.to_member_id
  `
  const params: any[] = []

  if (month) {
    query += ` WHERE s.date LIKE ? || '%'`
    params.push(month)
  }

  query += ` ORDER BY s.date DESC`

  const result = sqlite.prepare(query).all(...params)
  return c.json(result)
})

// POST /api/settlements
app.post('/', async (c) => {
  const body = await c.req.json<{
    from_member_id: number
    to_member_id: number
    amount: number
    date?: string
    note?: string
  }>()

  const result = db.insert(settlements).values({
    from_member_id: body.from_member_id,
    to_member_id: body.to_member_id,
    amount: body.amount,
    date: body.date || new Date().toISOString().split('T')[0],
    note: body.note || null,
    created_at: new Date().toISOString(),
  }).returning().get()

  return c.json(result, 201)
})

// DELETE /api/settlements/:id
app.delete('/:id', (c) => {
  const id = parseInt(c.req.param('id'))
  db.delete(settlements).where(eq(settlements.id, id)).run()
  return c.json({ success: true })
})

export default app
