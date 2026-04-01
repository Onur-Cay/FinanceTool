import { Hono } from 'hono'
import { db, sqlite } from '../db/index.js'
import { budgetLimits } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const app = new Hono()

// GET /api/budget-limits
app.get('/', (c) => {
  const month = c.req.query('month') || new Date().toISOString().substring(0, 7)

  const result = sqlite.prepare(`
    SELECT bl.*, c.name as category_name, c.icon as category_icon,
           COALESCE((
             SELECT SUM(e.amount)
             FROM expenses e
             JOIN sub_categories sc ON sc.id = e.sub_category_id
             WHERE sc.category_id = bl.category_id
             AND e.date LIKE ? || '%'
           ), 0) as spent
    FROM budget_limits bl
    JOIN categories c ON c.id = bl.category_id
    ORDER BY c.sort_order
  `).all(month) as any[]

  return c.json(result)
})

// POST /api/budget-limits (upsert)
app.post('/', async (c) => {
  const body = await c.req.json<{ category_id: number; monthly_limit: number }>()

  // Check if limit exists for this category
  const existing = db.select().from(budgetLimits).where(eq(budgetLimits.category_id, body.category_id)).get()

  if (existing) {
    db.update(budgetLimits)
      .set({ monthly_limit: body.monthly_limit })
      .where(eq(budgetLimits.id, existing.id))
      .run()
    return c.json({ ...existing, monthly_limit: body.monthly_limit })
  }

  const result = db.insert(budgetLimits).values({
    category_id: body.category_id,
    monthly_limit: body.monthly_limit,
    created_at: new Date().toISOString(),
  }).returning().get()

  return c.json(result, 201)
})

// DELETE /api/budget-limits/:id
app.delete('/:id', (c) => {
  const id = parseInt(c.req.param('id'))
  db.delete(budgetLimits).where(eq(budgetLimits.id, id)).run()
  return c.json({ success: true })
})

export default app
