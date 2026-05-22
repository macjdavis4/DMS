'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Loader2 } from 'lucide-react'

interface SearchResult {
  forklifts: Array<{ id: string; stockNumber: string; make: string; model: string; year: number | null }>
  customers: Array<{ id: string; display: string }>
  sales: Array<{ id: string; display: string; saleDate: string }>
}

export function GlobalSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcut: Cmd/Ctrl-K focuses the search input.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close popover on click outside
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('click', click)
    return () => window.removeEventListener('click', click)
  }, [])

  // Debounced fetch
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null)
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal })
        if (res.ok) {
          setResults(await res.json())
          setOpen(true)
        }
      } catch {
        // aborted or network — ignore
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => {
      ctrl.abort()
      clearTimeout(timer)
    }
  }, [q])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    router.push(`/inventory?q=${encodeURIComponent(q.trim())}`)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <form onSubmit={onSubmit} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results && setOpen(true)}
          placeholder="Search… (⌘K)"
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Search"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </form>

      {open && results && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[60vh] overflow-y-auto rounded-md border bg-popover p-2 text-popover-foreground shadow-lg">
          {results.forklifts.length === 0 && results.customers.length === 0 && results.sales.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches for &ldquo;{q}&rdquo;</p>
          ) : (
            <div className="space-y-3">
              {results.forklifts.length > 0 && (
                <Section title="Inventory">
                  {results.forklifts.map((f) => (
                    <Item
                      key={f.id}
                      href={`/inventory/${f.id}`}
                      onSelect={() => setOpen(false)}
                      primary={`${f.year ?? ''} ${f.make} ${f.model}`.trim()}
                      secondary={f.stockNumber}
                    />
                  ))}
                </Section>
              )}
              {results.customers.length > 0 && (
                <Section title="Customers">
                  {results.customers.map((c) => (
                    <Item key={c.id} href={`/customers/${c.id}`} onSelect={() => setOpen(false)} primary={c.display} />
                  ))}
                </Section>
              )}
              {results.sales.length > 0 && (
                <Section title="Sales">
                  {results.sales.map((s) => (
                    <Item
                      key={s.id}
                      href={`/sales/${s.id}`}
                      onSelect={() => setOpen(false)}
                      primary={s.display}
                      secondary={new Date(s.saleDate).toLocaleDateString()}
                    />
                  ))}
                </Section>
              )}
              <div className="border-t pt-2 text-center">
                <Link
                  href={`/inventory?q=${encodeURIComponent(q.trim())}`}
                  onClick={() => setOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  See all inventory matches →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  )
}

function Item({
  href,
  onSelect,
  primary,
  secondary,
}: {
  href: string
  onSelect: () => void
  primary: string
  secondary?: string
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onSelect}
        className="flex items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
      >
        <span className="truncate">{primary}</span>
        {secondary && <span className="shrink-0 text-xs text-muted-foreground">{secondary}</span>}
      </Link>
    </li>
  )
}
