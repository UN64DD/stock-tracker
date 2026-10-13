import { createApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const app = createApp({ config })

app.listen(config.port, () => {
  const base = `http://localhost:${config.port}`
  console.log(`[stock-tracker] API proxy listening on ${base}`)
  console.log(`[stock-tracker] health check: ${base}/api/health`)
  if (!config.stockApiKey) {
    console.warn(
      '[stock-tracker] STOCK_API_KEY is not set. Stock endpoints will return 503 until it is configured in server/.env.',
    )
  }
})
