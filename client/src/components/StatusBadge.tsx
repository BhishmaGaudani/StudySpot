import { STATUS_STYLE } from '../lib/status'
import type { SpotStatus } from '../types'

export function StatusBadge({ status }: { status: SpotStatus }) {
  const style = STATUS_STYLE[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.color }} />
      {style.label}
    </span>
  )
}
