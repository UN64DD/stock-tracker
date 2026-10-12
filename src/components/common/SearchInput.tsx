import { Search, X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface SearchInputProps
  extends Omit<ComponentProps<'input'>, 'onChange' | 'value'> {
  value: string
  onValueChange: (value: string) => void
  containerClassName?: string
}

export function SearchInput({
  value,
  onValueChange,
  placeholder = 'Search',
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          'flex h-9 w-full rounded-lg border border-input bg-background py-1 pl-9 pr-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background [&::-webkit-search-cancel-button]:hidden',
          className,
        )}
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
