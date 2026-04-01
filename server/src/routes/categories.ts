import { Hono } from 'hono'
import { db } from '../db/index.js'
import { categories, subCategories, expenses } from '../db/schema.js'
import { eq, asc } from 'drizzle-orm'

const app = new Hono()

// GET /api/categories - All categories with nested sub-categories
app.get('/', (c) => {
  const cats = db.select().from(categories).orderBy(asc(categories.sort_order)).all()
  const subs = db.select().from(subCategories).orderBy(asc(subCategories.sort_order)).all()

  const result = cats.map(cat => ({
    ...cat,
    sub_categories: subs.filter(s => s.category_id === cat.id),
  }))

  return c.json(result)
})

// POST /api/categories
app.post('/', async (c) => {
  const body = await c.req.json<{ name: string; icon?: string; sort_order?: number }>()
  const maxOrder = db.select().from(categories).all().length
  const result = db.insert(categories).values({
    name: body.name,
    icon: body.icon || 'folder',
    sort_order: body.sort_order ?? maxOrder + 1,
    created_at: new Date().toISOString(),
  }).returning().get()

  return c.json({ ...result, sub_categories: [] }, 201)
})

// PUT /api/categories/:id
app.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{ name?: string; icon?: string; sort_order?: number }>()

  const updates: any = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.icon !== undefined) updates.icon = body.icon
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order

  db.update(categories).set(updates).where(eq(categories.id, id)).run()
  const result = db.select().from(categories).where(eq(categories.id, id)).get()
  const subs = db.select().from(subCategories).where(eq(subCategories.category_id, id)).orderBy(asc(subCategories.sort_order)).all()

  return c.json({ ...result, sub_categories: subs })
})

// DELETE /api/categories/:id
app.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))

  // Check if any sub-category has expenses
  const subs = db.select().from(subCategories).where(eq(subCategories.category_id, id)).all()
  for (const sub of subs) {
    const hasExpenses = db.select().from(expenses).where(eq(expenses.sub_category_id, sub.id)).get()
    if (hasExpenses) {
      return c.json({ message: 'Cannot delete category with existing expenses' }, 400)
    }
  }

  // Delete sub-categories first, then category
  db.delete(subCategories).where(eq(subCategories.category_id, id)).run()
  db.delete(categories).where(eq(categories.id, id)).run()
  return c.json({ success: true })
})

// POST /api/categories/:id/subcategories
app.post('/:id/subcategories', async (c) => {
  const categoryId = parseInt(c.req.param('id'))
  const body = await c.req.json<{ name: string; icon?: string; sort_order?: number }>()

  const existingSubs = db.select().from(subCategories).where(eq(subCategories.category_id, categoryId)).all()
  const result = db.insert(subCategories).values({
    category_id: categoryId,
    name: body.name,
    icon: body.icon || null,
    sort_order: body.sort_order ?? existingSubs.length + 1,
    created_at: new Date().toISOString(),
  }).returning().get()

  return c.json(result, 201)
})

export default app
