import clsx from 'clsx'
import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export default function Card({ title, subtitle, action, children, className }: CardProps) {
  return (
    <div className={clsx('rounded-xl border border-border bg-surface-alt p-4 shadow-sm', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between">
          <div>
            {title && <h3 className="text-sm font-semibold text-brand-900">{title}</h3>}
            {subtitle && <p className="text-xs text-status-idle">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
