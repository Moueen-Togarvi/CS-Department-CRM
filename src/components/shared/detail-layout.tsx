import type { ReactNode } from 'react'

/**
 * Shared building blocks for the entity detail sheets (course, faculty,
 * student, profile). Each module previously kept its own byte-identical copy.
 */

/** A titled card wrapping a two-column grid of InfoItems. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <h4 className="text-sm font-semibold tracking-tight text-foreground/90 border-b border-border/40 pb-2 mb-3">
        {title}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

/** One icon + label + value row inside a Section. */
export function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 text-sm p-1">
      <div className="text-muted-foreground bg-muted/60 p-2 rounded-lg shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <div className="font-semibold text-foreground/90 truncate mt-0.5">{value}</div>
      </div>
    </div>
  )
}
