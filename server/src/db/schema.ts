import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const members = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  is_default: integer('is_default').default(0),
  created_at: text('created_at').default(new Date().toISOString()),
})

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon').default('folder'),
  sort_order: integer('sort_order').default(0),
  created_at: text('created_at').default(new Date().toISOString()),
})

export const subCategories = sqliteTable('sub_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category_id: integer('category_id').notNull().references(() => categories.id),
  name: text('name').notNull(),
  icon: text('icon'),
  sort_order: integer('sort_order').default(0),
  created_at: text('created_at').default(new Date().toISOString()),
})

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  description: text('description'),
  sub_category_id: integer('sub_category_id').notNull().references(() => subCategories.id),
  date: text('date').notNull(),
  payment_method: text('payment_method'),
  created_at: text('created_at').default(new Date().toISOString()),
  updated_at: text('updated_at').default(new Date().toISOString()),
})

export const expenseShares = sqliteTable('expense_shares', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  expense_id: integer('expense_id').notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  member_id: integer('member_id').notNull().references(() => members.id),
  amount: real('amount').notNull(),
})

export const settlements = sqliteTable('settlements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  from_member_id: integer('from_member_id').notNull().references(() => members.id),
  to_member_id: integer('to_member_id').notNull().references(() => members.id),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  note: text('note'),
  created_at: text('created_at').default(new Date().toISOString()),
})

export const budgetLimits = sqliteTable('budget_limits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category_id: integer('category_id').notNull().references(() => categories.id),
  monthly_limit: real('monthly_limit').notNull(),
  created_at: text('created_at').default(new Date().toISOString()),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
