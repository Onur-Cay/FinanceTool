import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import { runMigrations } from './db/migrate.js'
import { seedDatabase } from './db/seed.js'
import expensesRouter from './routes/expenses.js'
import categoriesRouter from './routes/categories.js'
import subcategoriesRouter from './routes/subcategories.js'
import membersRouter from './routes/members.js'
import analyticsRouter from './routes/analytics.js'
import settlementsRouter from './routes/settlements.js'
import settingsRouter from './routes/settings.js'
import budgetLimitsRouter from './routes/budget-limits.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// Initialize database
runMigrations()
seedDatabase()

const app = new Hono()

// CORS for development
app.use('/api/*', cors())

// API routes
app.route('/api/expenses', expensesRouter)
app.route('/api/categories', categoriesRouter)
app.route('/api/subcategories', subcategoriesRouter)
app.route('/api/members', membersRouter)
app.route('/api/analytics', analyticsRouter)
app.route('/api/settlements', settlementsRouter)
app.route('/api/settings', settingsRouter)
app.route('/api/budget-limits', budgetLimitsRouter)

// Resolve the public directory relative to this file
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')
const hasPublicDir = fs.existsSync(publicDir)

if (hasPublicDir) {
  // Serve static files
  app.use('/*', serveStatic({ root: path.relative(process.cwd(), publicDir) }))

  // SPA fallback - serve index.html for non-API, non-file routes
  // no-cache ensures PWA always fetches fresh HTML so JS/CSS updates propagate
  app.get('*', (c) => {
    const indexPath = path.join(publicDir, 'index.html')
    const html = fs.readFileSync(indexPath, 'utf-8')
    return c.html(html, 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    })
  })
} else {
  console.log(`Static files not found at ${publicDir} - running in API-only mode`)
}

const port = parseInt(process.env.PORT || '3000')
console.log(`FinanceTool server running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})
