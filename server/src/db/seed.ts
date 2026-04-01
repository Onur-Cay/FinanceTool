import { db } from './index.js'
import { members, categories, subCategories, settings } from './schema.js'
import { eq } from 'drizzle-orm'

const defaultCategories = [
  {
    name: 'Bills', icon: 'receipt', sort_order: 1,
    subs: ['Electricity', 'Gas', 'Water', 'Internet', 'Phone', 'Council Tax']
  },
  {
    name: 'Rent', icon: 'home', sort_order: 2,
    subs: ['Rent']
  },
  {
    name: 'Groceries', icon: 'shopping-cart', sort_order: 3,
    subs: ['Supermarket', 'Market', 'Other']
  },
  {
    name: 'Eating Out', icon: 'utensils', sort_order: 4,
    subs: ['Restaurant', 'Takeaway', 'Coffee', 'Drinks']
  },
  {
    name: 'Transport', icon: 'car', sort_order: 5,
    subs: ['Fuel', 'Parking', 'Public Transport', 'Maintenance']
  },
  {
    name: 'Shopping', icon: 'shopping-bag', sort_order: 6,
    subs: ['Clothes', 'Electronics', 'Home', 'Other']
  },
  {
    name: 'Entertainment', icon: 'film', sort_order: 7,
    subs: ['Cinema', 'Games', 'Streaming', 'Events']
  },
  {
    name: 'Health', icon: 'heart-pulse', sort_order: 8,
    subs: ['Pharmacy', 'Gym', 'Other']
  },
  {
    name: 'Other', icon: 'more-horizontal', sort_order: 9,
    subs: ['Miscellaneous']
  },
]

export function seedDatabase() {
  // Check if already seeded
  const existingCategories = db.select().from(categories).all()
  if (existingCategories.length > 0) {
    console.log('Database already seeded, skipping.')
    return
  }

  console.log('Seeding database...')

  // Insert default member
  db.insert(members).values({
    name: 'Member 1',
    color: '#22c55e',
    is_default: 1,
    created_at: new Date().toISOString(),
  }).run()

  // Insert categories and sub-categories
  for (const cat of defaultCategories) {
    const result = db.insert(categories).values({
      name: cat.name,
      icon: cat.icon,
      sort_order: cat.sort_order,
      created_at: new Date().toISOString(),
    }).returning().get()

    for (let i = 0; i < cat.subs.length; i++) {
      db.insert(subCategories).values({
        category_id: result.id,
        name: cat.subs[i],
        sort_order: i + 1,
        created_at: new Date().toISOString(),
      }).run()
    }
  }

  // Insert default settings
  db.insert(settings).values([
    { key: 'currency', value: '£' },
    { key: 'theme', value: 'dark' },
    { key: 'accent_color', value: 'green' },
  ]).run()

  console.log('Database seeded successfully.')
}
