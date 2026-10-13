import { Router } from 'express'
import type { MarketDataService } from '../services/marketDataService.js'

export function createHealthRouter(service: MarketDataService): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    const provider = service.getProviderInfo()
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      provider: {
        name: provider.name,
        configured: provider.configured,
        dataStatus: provider.dataStatus,
        dataStatusNote: provider.dataStatusNote,
      },
    })
  })

  return router
}
