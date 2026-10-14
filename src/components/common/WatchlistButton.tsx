import { LoaderCircle, Star, StarOff } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, type ButtonProps } from '@/components/ui/button'
import { useToast } from '@/contexts/toast-context'
import { useWatchlist } from '@/contexts/watchlist-context'
import { isApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

interface WatchlistButtonProps {
  symbol: string
  name?: string | null
  currency?: string | null
  exchange?: string | null
  showLabel?: boolean
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
}

function messageFor(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Please try again.'
}

export function WatchlistButton({
  symbol,
  name,
  currency,
  exchange,
  showLabel = false,
  variant = 'outline',
  size,
  className,
}: WatchlistButtonProps) {
  const {
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    pendingSymbols,
    isAuthenticated,
  } = useWatchlist()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const active = isInWatchlist(symbol)
  const pending = pendingSymbols.includes(symbol.toUpperCase())

  const handleClick = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Sign in to use your watchlist',
        description: 'Your watchlist is stored on your account, not in this browser.',
      })
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    try {
      if (active) {
        await removeFromWatchlist(symbol)
        toast({ title: `${symbol} removed from watchlist` })
      } else {
        await addToWatchlist({ symbol, name, currency, exchange })
        toast({
          title: `${symbol} added to watchlist`,
          description: 'Saved to your account.',
          variant: 'success',
        })
      }
    } catch (error) {
      toast({
        title: active ? `Could not remove ${symbol}` : `Could not add ${symbol}`,
        description: messageFor(error),
        variant: 'error',
      })
    }
  }

  return (
    <Button
      variant={variant}
      size={showLabel ? (size ?? 'default') : (size ?? 'icon')}
      onClick={handleClick}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      className={cn(active && 'border-amber-400/60 text-amber-600 dark:text-amber-400', className)}
    >
      {pending ? (
        <LoaderCircle className="animate-spin" aria-hidden="true" />
      ) : active ? (
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
