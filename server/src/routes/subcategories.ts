import { Hono } from 'hono'
import { db } from '../db/index.js'
import { subCategories, expenses } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const app = new Hono()

// PUT /api/subcategories/:id
app.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{ name?: string; icon?: string; sort_order?: number }>()

  const updates: any = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.icon !== undefined) updates.icon = body.icon
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order

  db.update(subCategories).set(updates).where(eq(subCategories.id, id)).run()
  const result = db.select().from(subCategories).where(eq(subCategories.id, id)).get()
  return c.json(result)
})

// DELETE /api/subcategories/:id
app.delete('/:id', (c) => {
  const id = parseInt(c.req.param('id'))

  const hasExpenses = db.select().from(expenses).where(eq(expenses.sub_category_id, id)).get()
  if (hasExpenses) {
    return c.json({ message: 'Cannot delete sub-category with existing expenses' }, 400)
  }

  db.delete(subCategories).where(eq(subCategories.id, id)).run()
  return c.json({ success: true })
})

export default app
