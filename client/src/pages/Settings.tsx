import { useState, useEffect } from 'react'
import { Plus, Trash2, Star, Pencil, ChevronDown, ChevronRight, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import { useTheme } from '@/hooks/use-theme'
import type { Member, Category } from '@/lib/types'

const MEMBER_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ef4444', '#ec4899', '#14b8a6', '#eab308']
const ACCENT_COLORS = [
  { name: 'green', label: 'Green', color: '#22c55e' },
  { name: 'blue', label: 'Blue', color: '#3b82f6' },
  { name: 'purple', label: 'Purple', color: '#a855f7' },
  { name: 'orange', label: 'Orange', color: '#f97316' },
  { name: 'red', label: 'Red', color: '#ef4444' },
  { name: 'pink', label: 'Pink', color: '#ec4899' },
]

export default function Settings() {
  const { theme, setTheme, accentColor, setAccentColor, defaultMemberId, setDefaultMemberId } = useTheme()
  const [members, setMembers] = useState<Member[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [currency, setCurrency] = useState('£')
  const [budgetLimits, setBudgetLimits] = useState<any[]>([])

  // Member dialog
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [memberName, setMemberName] = useState('')
  const [memberColor, setMemberColor] = useState(MEMBER_COLORS[0])

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryIcon, setCategoryIcon] = useState('folder')

  // Sub-category dialog
  const [subCategoryDialogOpen, setSubCategoryDialogOpen] = useState(false)
  const [subCategoryParentId, setSubCategoryParentId] = useState<number | null>(null)
  const [subCategoryName, setSubCategoryName] = useState('')
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<number | null>(null)

  // Budget limit dialog
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [budgetCategoryId, setBudgetCategoryId] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')

  // Expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())

  const fetchData = async () => {
    try {
      const [memData, catData, settingsData, budgetData] = await Promise.all([
        api.getMembers(),
        api.getCategories(),
        api.getSettings(),
        api.getBudgetLimits(),
      ])
      setMembers(memData)
      setCategories(catData)
      setCurrency(settingsData.currency || '£')
      setBudgetLimits(budgetData)
    } catch (err) {
      console.error('Failed to fetch settings data', err)
    }
  }

  useEffect(() => { fetchData() }, [])

  // ---- Members ----
  const handleSaveMember = async () => {
    if (!memberName.trim()) return
    try {
      if (editingMember) {
        await api.updateMember(editingMember.id, { name: memberName, color: memberColor })
      } else {
        await api.createMember({ name: memberName, color: memberColor })
      }
      toast({ title: editingMember ? 'Member updated' : 'Member added' })
      setMemberDialogOpen(false)
      fetchData()
    } catch {
      toast({ title: 'Failed to save member', variant: 'destructive' })
    }
  }

  const handleDeleteMember = async (id: number) => {
    try {
      await api.deleteMember(id)
      toast({ title: 'Member deleted' })
      fetchData()
    } catch (err: any) {
      toast({ title: err.message || 'Cannot delete member', variant: 'destructive' })
    }
  }

  const handleSetDefault = (id: number) => {
    setDefaultMemberId(String(id))
    toast({ title: 'Default member updated' })
  }

  // ---- Categories ----
  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, { name: categoryName, icon: categoryIcon })
      } else {
        await api.createCategory({ name: categoryName, icon: categoryIcon })
      }
      toast({ title: editingCategory ? 'Category updated' : 'Category added' })
      setCategoryDialogOpen(false)
      fetchData()
    } catch {
      toast({ title: 'Failed to save category', variant: 'destructive' })
    }
  }

  const handleDeleteCategory = async (id: number) => {
    try {
      await api.deleteCategory(id)
      toast({ title: 'Category deleted' })
      fetchData()
    } catch (err: any) {
      toast({ title: err.message || 'Cannot delete category', variant: 'destructive' })
    }
  }

  // ---- Sub-categories ----
  const handleSaveSubCategory = async () => {
    if (!subCategoryName.trim() || !subCategoryParentId) return
    try {
      if (editingSubCategoryId) {
        await api.updateSubCategory(editingSubCategoryId, { name: subCategoryName })
      } else {
        await api.createSubCategory(subCategoryParentId, { name: subCategoryName })
      }
      toast({ title: editingSubCategoryId ? 'Sub-category updated' : 'Sub-category added' })
      setSubCategoryDialogOpen(false)
      fetchData()
    } catch {
      toast({ title: 'Failed to save sub-category', variant: 'destructive' })
    }
  }

  const handleDeleteSubCategory = async (id: number) => {
    try {
      await api.deleteSubCategory(id)
      toast({ title: 'Sub-category deleted' })
      fetchData()
    } catch (err: any) {
      toast({ title: err.message || 'Cannot delete sub-category', variant: 'destructive' })
    }
  }

  // ---- Budget Limits ----
  const handleSaveBudgetLimit = async () => {
    if (!budgetCategoryId || !budgetAmount) return
    try {
      await api.upsertBudgetLimit({
        category_id: parseInt(budgetCategoryId),
        monthly_limit: parseFloat(budgetAmount),
      })
      toast({ title: 'Budget limit saved' })
      setBudgetDialogOpen(false)
      fetchData()
    } catch {
      toast({ title: 'Failed to save budget limit', variant: 'destructive' })
    }
  }

  // ---- Currency ----
  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency)
    try {
      await api.updateSettings({ currency: newCurrency })
      toast({ title: 'Currency updated' })
    } catch {
      toast({ title: 'Failed to update currency', variant: 'destructive' })
    }
  }

  const toggleCategoryExpand = (id: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Theme & Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <Label>Dark Mode</Label>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
          <Separator />
          <div>
            <Label className="mb-2 block">Accent Color</Label>
            <div className="flex gap-2">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.name}
                  onClick={() => setAccentColor(c.name)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    accentColor === c.name ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <Separator />
          <div>
            <Label className="mb-2 block">Currency Symbol</Label>
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="£">£ GBP</SelectItem>
                <SelectItem value="$">$ USD</SelectItem>
                <SelectItem value="€">€ EUR</SelectItem>
                <SelectItem value="₺">₺ TRY</SelectItem>
                <SelectItem value="¥">¥ JPY</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Members</CardTitle>
          <Button size="sm" onClick={() => {
            setEditingMember(null)
            setMemberName('')
            setMemberColor(MEMBER_COLORS[members.length % MEMBER_COLORS.length])
            setMemberDialogOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="font-medium">{m.name}</span>
                  {String(m.id) === defaultMemberId && (
                    <span className="text-xs text-primary font-medium">(Default)</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {String(m.id) !== defaultMemberId && (
                    <Button variant="ghost" size="icon" onClick={() => handleSetDefault(m.id)} title="Set as default">
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => {
                    setEditingMember(m)
                    setMemberName(m.name)
                    setMemberColor(m.color)
                    setMemberDialogOpen(true)
                  }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteMember(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categories</CardTitle>
          <Button size="sm" onClick={() => {
            setEditingCategory(null)
            setCategoryName('')
            setCategoryIcon('folder')
            setCategoryDialogOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {categories.map(cat => (
              <div key={cat.id}>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-1"
                    onClick={() => toggleCategoryExpand(cat.id)}
                  >
                    {expandedCategories.has(cat.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({cat.sub_categories.length} sub)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setSubCategoryParentId(cat.id)
                      setSubCategoryName('')
                      setEditingSubCategoryId(null)
                      setSubCategoryDialogOpen(true)
                    }} title="Add sub-category">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingCategory(cat)
                      setCategoryName(cat.name)
                      setCategoryIcon(cat.icon)
                      setCategoryDialogOpen(true)
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {expandedCategories.has(cat.id) && (
                  <div className="ml-8 space-y-1 mt-1">
                    {cat.sub_categories.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between p-2 rounded border">
                        <span className="text-sm">{sub.name}</span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setSubCategoryParentId(cat.id)
                            setSubCategoryName(sub.name)
                            setEditingSubCategoryId(sub.id)
                            setSubCategoryDialogOpen(true)
                          }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteSubCategory(sub.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Budget Limits */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget Limits</CardTitle>
          <Button size="sm" onClick={() => {
            setBudgetCategoryId('')
            setBudgetAmount('')
            setBudgetDialogOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-1" /> Set Limit
          </Button>
        </CardHeader>
        <CardContent>
          {budgetLimits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No budget limits set.</p>
          ) : (
            <div className="space-y-2">
              {budgetLimits.map((bl: any) => (
                <div key={bl.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <span className="font-medium">{bl.category_name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {currency}{bl.monthly_limit}/month
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={async () => {
                    await api.deleteBudgetLimit(bl.id)
                    toast({ title: 'Budget limit removed' })
                    fetchData()
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit Member' : 'Add Member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Name" />
            </div>
            <div>
              <Label className="mb-2 block">Color</Label>
              <div className="flex gap-2">
                {MEMBER_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setMemberColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      memberColor === c ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMember}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Category name" />
            </div>
            <div>
              <Label>Icon name</Label>
              <Input value={categoryIcon} onChange={(e) => setCategoryIcon(e.target.value)} placeholder="e.g. receipt, home, car" />
              <p className="text-xs text-muted-foreground mt-1">Use Lucide icon name</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Category Dialog */}
      <Dialog open={subCategoryDialogOpen} onOpenChange={setSubCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubCategoryId ? 'Edit Sub-category' : 'Add Sub-category'}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Name</Label>
            <Input value={subCategoryName} onChange={(e) => setSubCategoryName(e.target.value)} placeholder="Sub-category name" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSubCategory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Budget Limit Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Budget Limit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={budgetCategoryId} onValueChange={setBudgetCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monthly Limit ({currency})</Label>
              <Input
                type="number"
                step="0.01"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBudgetLimit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
