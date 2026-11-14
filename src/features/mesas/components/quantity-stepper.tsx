import { MinusIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function QuantityStepper({ value, min = 0, max, onChange, disabled, label }: {
  value: number; min?: number; max: number; onChange: (value: number) => void
  disabled?: boolean; label: string
}) {
  const change = (next: number) => onChange(Math.min(max, Math.max(min, next)))
  return (
    <div className="flex items-center justify-between gap-5 rounded-xl border bg-muted/30 p-3" role="group" aria-label={label}>
      <Button variant="outline" size="icon-lg" type="button" aria-label={`Disminuir ${label.toLowerCase()}`} disabled={disabled || value <= min} onClick={() => change(value - 1)}><MinusIcon /></Button>
      <output role="spinbutton" tabIndex={disabled ? -1 : 0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-disabled={disabled} className="min-w-12 text-center text-3xl font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring" onKeyDown={(event) => {
        if (disabled) return
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault()
          change(value + (event.key === 'ArrowUp' ? 1 : -1))
        }
      }}>{value}</output>
      <Button variant="outline" size="icon-lg" type="button" aria-label={`Aumentar ${label.toLowerCase()}`} disabled={disabled || value >= max} onClick={() => change(value + 1)}><PlusIcon /></Button>
    </div>
  )
}
