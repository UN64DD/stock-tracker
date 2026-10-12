import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist in this demo.
        </p>
      </div>
      <Link to="/" className={cn(buttonVariants())}>
        Back to dashboard
      </Link>
    </div>
  )
}
