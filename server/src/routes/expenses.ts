import { Hono } from 'hono'
import { db, sqlite } from '../db/index.js'
import { expenses, expenseShares, subCategories, categories, members } from '../db/schema.js'
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm'

const app = new Hono()

function getExpenseWithDetails(expenseId: number) {
  const expense = db.select().from(expenses).where(eq(expenses.id, expenseId)).get()
  if (!expense) return null

  const shares = sqlite.prepare(`
    SELECT es.*, m.name as member_name, m.color as member_color
    FROM expense_shares es
    JOIN members m ON m.id = es.member_id
    WHERE es.expense_id = ?
  `).all(expenseId) as any[]

  const subCat = db.select().from(subCategories).where(eq(subCategories.id, expense.sub_category_id)).get()
  const cat = subCat ? db.select().from(categories).where(eq(categories.id, subCat.category_id)).get() : null

  return {
    ...expense,
    shares,
    sub_category_name: subCat?.name,
    category_name: cat?.name,
    category_icon: cat?.icon,
  }
}

// GET /api/expenses
app.get('/', (c) => {
  const month = c.req.query('month')
  const memberId = c.req.query('member_id')
  const categoryId = c.req.query('category_id')

  let query = `
    SELECT DISTINCT e.* FROM expenses e
    JOIN expense_shares es ON es.expense_id = e.id
    JOIN sub_categories sc ON sc.id = e.sub_category_id
    WHERE 1=1
  `
  const params: any[] = []

  if (month) {
    query += ` AND e.date LIKE ? || '%'`
    params.push(month)
  }
  if (memberId) {
    query += ` AND es.member_id = ?`
    params.push(parseInt(memberId))
  }
  if (categoryId) {
    query += ` AND sc.category_id = ?`
    params.push(parseInt(categoryId))
  }

  query += ` ORDER BY e.date DESC, e.created_at DESC`

  const rows = sqlite.prepare(query).all(...params) as any[]

  const result = rows.map(row => {
    const shares = sqlite.prepare(`
      SELECT es.*, m.name as member_name, m.color as member_color
      FROM expense_shares es
      JOIN members m ON m.id = es.member_id
      WHERE es.expense_id = ?
    `).all(row.id) as any[]

    const subCat = db.select().from(subCategories).where(eq(subCategories.id, row.sub_category_id)).get()
    const cat = subCat ? db.select().from(categories).where(eq(categories.id, subCat.category_id)).get() : null

    return {
      ...row,
      shares,
      sub_category_name: subCat?.name,
      category_name: cat?.name,
      category_icon: cat?.icon,
    }
  })

  return c.json(result)
})

// POST /api/expenses
app.post('/', async (c) => {
  const body = await c.req.json<{
    amount: number
    description?: string
    sub_category_id: number
    date?: string
    payment_method?: string
    shares: { member_id: number; amount: number }[]
  }>()

  const now = new Date().toISOString()
  const expense = db.insert(expenses).values({
    amount: body.amount,
    description: body.description || null,
    sub_category_id: body.sub_category_id,
    date: body.date || now.split('T')[0],
    payment_method: body.payment_method || null,
    created_at: now,
    updated_at: now,
  }).returning().get()

  // Insert shares
  for (const share of body.shares) {
    db.insert(expenseShares).values({
      expense_id: expense.id,
      member_id: share.member_id,
      amount: share.amount,
    }).run()
  }

  return c.json(getExpenseWithDetails(expense.id), 201)
})

// PUT /api/expenses/:id
app.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{
    amount?: number
    description?: string
    sub_category_id?: number
    date?: string
    payment_method?: string
    shares?: { member_id: number; amount: number }[]
  }>()

  const updates: any = { updated_at: new Date().toISOString() }
  if (body.amount !== undefined) updates.amount = body.amount
  if (body.description !== undefined) updates.description = body.description
  if (body.sub_category_id !== undefined) updates.sub_category_id = body.sub_category_id
  if (body.date !== undefined) updates.date = body.date
  if (body.payment_method !== undefined) updates.payment_method = body.payment_method

  db.update(expenses).set(updates).where(eq(expenses.id, id)).run()

  // Update shares if provided
  if (body.shares) {
    db.delete(expenseShares).where(eq(expenseShares.expense_id, id)).run()
    for (const share of body.shares) {
      db.insert(expenseShares).values({
        expense_id: id,
        member_id: share.member_id,
        amount: share.amount,
      }).run()
    }
  }

  return c.json(getExpenseWithDetails(id))
})

// DELETE /api/expenses/:id
app.delete('/:id', (c) => {
  const id = parseInt(c.req.param('id'))
  db.delete(expenses).where(eq(expenses.id, id)).run()
  return c.json({ success: true })
})

export default app
