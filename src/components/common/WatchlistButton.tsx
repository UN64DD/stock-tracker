import { Star, StarOff } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { useToast } from '@/contexts/toast-context'
import { useWatchlist } from '@/contexts/watchlist-context'
import { cn } from '@/lib/utils'

interface WatchlistButtonProps {
  symbol: string
  showLabel?: boolean
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
}

export function WatchlistButton({
  symbol,
  showLabel = false,
  variant = 'outline',
  size,
  className,
}: WatchlistButtonProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist()
  const { toast } = useToast()
  const active = isInWatchlist(symbol)

  const handleClick = () => {
    toggleWatchlist(symbol)
    toast({
      title: active ? `${symbol} removed from watchlist` : `${symbol} added to watchlist`,
      description: 'Saved to this browser only (demo localStorage).',
      variant: active ? 'default' : 'success',
    })
  }

  return (
    <Button
      variant={variant}
      size={showLabel ? (size ?? 'default') : (size ?? 'icon')}
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      className={cn(active && 'border-amber-400/60 text-amber-600 dark:text-amber-400', className)}
    >
      {active ? (
        <Star className="fill-current" aria-hidden="true" />
      ) : (
        <StarOff aria-hidden="true" />
      )}
      {showLabel ? (
        <span>{active ? 'In watchlist' : 'Add to watchlist'}</span>
      ) : null}
    </Button>
  )
}
