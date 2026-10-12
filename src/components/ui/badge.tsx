import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        positive:
          'border-success/20 bg-success/10 text-emerald-700 dark:text-emerald-400',
        negative:
          'border-destructive/20 bg-destructive/10 text-red-700 dark:text-red-400',
        neutral:
          'border-border bg-muted text-muted-foreground',
        info: 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400',
        warning:
          'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type BadgeProps = ComponentProps<'span'> &
  VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
