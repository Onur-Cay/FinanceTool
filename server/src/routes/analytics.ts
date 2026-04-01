import { Hono } from 'hono'
import { sqlite } from '../db/index.js'

const app = new Hono()

// GET /api/analytics/monthly?month=2026-02
app.get('/monthly', (c) => {
  const month = c.req.query('month')
  if (!month) return c.json({ message: 'month parameter required' }, 400)

  // Total spending
  const totalRow = sqlite.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE ? || '%'
  `).get(month) as any

  // By category
  const byCategory = sqlite.prepare(`
    SELECT c.id as category_id, c.name as category_name, c.icon as category_icon,
           COALESCE(SUM(e.amount), 0) as total
    FROM categories c
    LEFT JOIN sub_categories sc ON sc.category_id = c.id
    LEFT JOIN expenses e ON e.sub_category_id = sc.id AND e.date LIKE ? || '%'
    GROUP BY c.id
    HAVING total > 0
    ORDER BY total DESC
  `).all(month) as any[]

  // Sub-category breakdown for each category
  const byCategoryWithSubs = byCategory.map(cat => {
    const subs = sqlite.prepare(`
      SELECT sc.id as sub_category_id, sc.name as sub_category_name,
             COALESCE(SUM(e.amount), 0) as total
      FROM sub_categories sc
      LEFT JOIN expenses e ON e.sub_category_id = sc.id AND e.date LIKE ? || '%'
      WHERE sc.category_id = ?
      GROUP BY sc.id
      HAVING total > 0
      ORDER BY total DESC
    `).all(month, cat.category_id) as any[]
    return { ...cat, sub_categories: subs }
  })

  // By member
  const byMember = sqlite.prepare(`
    SELECT m.id as member_id, m.name as member_name, m.color as member_color,
           COALESCE(SUM(es.amount), 0) as total
    FROM members m
    LEFT JOIN expense_shares es ON es.member_id = m.id
    LEFT JOIN expenses e ON e.id = es.expense_id AND e.date LIKE ? || '%'
    GROUP BY m.id
    HAVING total > 0
    ORDER BY total DESC
  `).all(month) as any[]

  return c.json({
    total: totalRow.total,
    by_category: byCategoryWithSubs,
    by_member: byMember,
  })
})

// GET /api/analytics/yearly?year=2026
app.get('/yearly', (c) => {
  const year = c.req.query('year')
  if (!year) return c.json({ message: 'year parameter required' }, 400)

  const totalRow = sqlite.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE ? || '%'
  `).get(year) as any

  const monthlyTotals = sqlite.prepare(`
    SELECT substr(date, 1, 7) as month, COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE date LIKE ? || '%'
    GROUP BY substr(date, 1, 7)
    ORDER BY month
  `).all(year) as any[]

  return c.json({
    total: totalRow.total,
    monthly_totals: monthlyTotals,
  })
})

// GET /api/analytics/balance?month=2026-02
app.get('/balance', (c) => {
  const month = c.req.query('month')
  if (!month) return c.json({ message: 'month parameter required' }, 400)

  // Get total expenses for the month
  const totalRow = sqlite.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE ? || '%'
  `).get(month) as any
  const totalExpenses = totalRow.total

  // Get all members
  const allMembers = sqlite.prepare(`SELECT * FROM members`).all() as any[]
  const memberCount = allMembers.length
  const fairShare = memberCount > 0 ? totalExpenses / memberCount : 0

  // Get per-member paid amounts
  const balances = allMembers.map(member => {
    const paidRow = sqlite.prepare(`
      SELECT COALESCE(SUM(es.amount), 0) as total
      FROM expense_shares es
      JOIN expenses e ON e.id = es.expense_id
      WHERE es.member_id = ? AND e.date LIKE ? || '%'
    `).get(member.id, month) as any

    return {
      member_id: member.id,
      member_name: member.name,
      member_color: member.color,
      total_paid: paidRow.total,
      fair_share: fairShare,
      balance: paidRow.total - fairShare,
    }
  })

  // Get settlements for this month
  const settlements = sqlite.prepare(`
    SELECT s.*,
           m1.name as from_member_name,
           m2.name as to_member_name
    FROM settlements s
    JOIN members m1 ON m1.id = s.from_member_id
    JOIN members m2 ON m2.id = s.to_member_id
    WHERE s.date LIKE ? || '%'
    ORDER BY s.date DESC
  `).all(month) as any[]

  return c.json({ balances, settlements })
})

// GET /api/analytics/cumulative-balance
// Calculates balance across all time, factoring in settlements
app.get('/cumulative-balance', (c) => {
  // Get total expenses across all time
  const totalRow = sqlite.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses
  `).get() as any
  const totalExpenses = totalRow.total

  // Get all members
  const allMembers = sqlite.prepare(`SELECT * FROM members`).all() as any[]
  const memberCount = allMembers.length
  const fairShare = memberCount > 0 ? totalExpenses / memberCount : 0

  // Get per-member paid amounts across all time
  const balances = allMembers.map(member => {
    const paidRow = sqlite.prepare(`
      SELECT COALESCE(SUM(es.amount), 0) as total
      FROM expense_shares es
      JOIN expenses e ON e.id = es.expense_id
      WHERE es.member_id = ?
    `).get(member.id) as any

    // Factor in settlements: money sent out reduces balance, money received increases it
    const sentRow = sqlite.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM settlements WHERE from_member_id = ?
    `).get(member.id) as any

    const receivedRow = sqlite.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM settlements WHERE to_member_id = ?
    `).get(member.id) as any

    // balance = (what you paid for expenses) - (your fair share) - (settlements you sent) + (settlements you received)
    // If you overpaid expenses, you have positive balance (you're owed money)
    // If someone settles with you (sends you money), that reduces their debt / your credit
    const expenseBalance = paidRow.total - fairShare
    const settlementAdjustment = sentRow.total - receivedRow.total

    return {
      member_id: member.id,
      member_name: member.name,
      member_color: member.color,
      total_paid: paidRow.total,
      fair_share: fairShare,
      balance: expenseBalance + settlementAdjustment,
    }
  })

  // Get all settlements for display
  const allSettlements = sqlite.prepare(`
    SELECT s.*,
           m1.name as from_member_name,
           m2.name as to_member_name
    FROM settlements s
    JOIN members m1 ON m1.id = s.from_member_id
    JOIN members m2 ON m2.id = s.to_member_id
    ORDER BY s.date DESC
  `).all() as any[]

  return c.json({ balances, settlements: allSettlements })
})

export default app
