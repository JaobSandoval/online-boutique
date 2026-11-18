import { MinusIcon, PlusIcon } from './Icons'

interface Props {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function QuantityStepper({ value, onChange, min = 1, max = 10, disabled, size = 'md' }: Props) {
  return (
    <div className={`qty-stepper qty-stepper-${size}`}>
      <button
        type="button"
        aria-label="Disminuir cantidad"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
      >
        <MinusIcon size={16} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        aria-label="Aumentar cantidad"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
      >
        <PlusIcon size={16} />
      </button>
    </div>
  )
}
