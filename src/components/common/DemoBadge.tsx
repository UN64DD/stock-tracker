import { Badge } from '@/components/ui/badge'

export function DemoBadge({ label = 'Demo data' }: { label?: string }) {
  return (
    <Badge variant="outline" className="border-dashed font-normal text-muted-foreground">
      {label}
    </Badge>
  )
}
