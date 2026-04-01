import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToasterContextType {
  toast: (t: Omit<Toast, 'id'>) => void
}

const ToasterContext = createContext<ToasterContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToasterContext)
}

// Simple global toast state
let globalToasts: Toast[] = []
let listeners: (() => void)[] = []

function addToast(t: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  globalToasts = [...globalToasts, { ...t, id }]
  listeners.forEach(l => l())
  setTimeout(() => {
    globalToasts = globalToasts.filter(toast => toast.id !== id)
    listeners.forEach(l => l())
  }, 4000)
}

export function toast(t: Omit<Toast, 'id'>) {
  addToast(t)
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = () => setToasts([...globalToasts])
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'rounded-lg border px-4 py-3 shadow-lg min-w-[300px] max-w-[420px] animate-in slide-in-from-bottom-5',
            t.variant === 'destructive'
              ? 'border-destructive bg-destructive text-destructive-foreground'
              : 'border bg-background text-foreground'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="text-sm opacity-90 mt-1">{t.description}</p>}
            </div>
            <button
              onClick={() => {
                globalToasts = globalToasts.filter(toast => toast.id !== t.id)
                listeners.forEach(l => l())
              }}
              className="opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
