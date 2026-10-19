import { describe, expect, it } from 'vitest'
import { renderAlertTriggerEmail } from './emailTemplate.js'

const base = {
  recipientName: 'Ada',
  symbol: 'AAPL',
  companyName: 'Apple Inc.',
  condition: 'price_above' as const,
  threshold: 250,
  triggerPrice: 251.5,
  changePercent: null,
  triggeredAt: '2026-10-19T09:30:00.000Z',
  stockUrl: 'http://localhost:5173/stocks/AAPL',
  alertsUrl: 'http://localhost:5173/alerts',
}

describe('renderAlertTriggerEmail', () => {
  it('includes the symbol in the subject and greets the recipient by name', () => {
    const rendered = renderAlertTriggerEmail(base)
    expect(rendered.subject).toBe('Price alert triggered: AAPL')
    expect(rendered.text).toContain('Hi Ada,')
  })

  it('falls back to a generic greeting without a display name', () => {
    const rendered = renderAlertTriggerEmail({ ...base, recipientName: null })
    expect(rendered.text).toContain('Hi there,')
  })

  it('contains the company name, condition, threshold, price and timestamp', () => {
    const rendered = renderAlertTriggerEmail(base)
    for (const body of [rendered.text, rendered.html]) {
      expect(body).toContain('Apple Inc.')
      expect(body).toContain('Price rose to or above your target')
      expect(body).toContain('$250.00')
      expect(body).toContain('$251.50')
      expect(body).toContain('2026-10-19 09:30:00 UTC')
    }
  })

  it('renders percentage thresholds and the session change for percent conditions', () => {
    const rendered = renderAlertTriggerEmail({
      ...base,
      symbol: 'NVDA',
      companyName: null,
      condition: 'percent_increase',
      threshold: 10,
      changePercent: 50,
    })
    expect(rendered.text).toContain('Your threshold: 10.00%')
    expect(rendered.text).toContain('Session change: +50.00%')
    expect(rendered.html).toContain('10.00%')
    expect(rendered.html).toContain('+50.00%')
  })

  it('omits the session-change row for price conditions', () => {
    const rendered = renderAlertTriggerEmail(base)
    expect(rendered.text).not.toContain('Session change')
  })

  it('links back to the stock page and the alerts dashboard', () => {
    const rendered = renderAlertTriggerEmail(base)
    expect(rendered.text).toContain(base.stockUrl)
    expect(rendered.text).toContain(base.alertsUrl)
    expect(rendered.html).toContain(`href="${base.stockUrl}"`)
    expect(rendered.html).toContain(`href="${base.alertsUrl}"`)
  })

  it('escapes HTML in every interpolated value', () => {
    const rendered = renderAlertTriggerEmail({
      ...base,
      companyName: '<script>alert("xss")</script>',
      symbol: 'EVIL&CO',
    })
    expect(rendered.html).not.toContain('<script>')
    expect(rendered.html).toContain('&lt;script&gt;')
    expect(rendered.html).toContain('EVIL&amp;CO')
    expect(rendered.subject).toBe('Price alert triggered: EVIL&CO')
  })

  it('always pairs the HTML body with a non-empty plain-text fallback', () => {
    const rendered = renderAlertTriggerEmail(base)
    expect(rendered.html.trim().length).toBeGreaterThan(0)
    expect(rendered.text.trim().length).toBeGreaterThan(0)
    expect(rendered.text).not.toContain('<')
  })

  it('handles an unavailable trigger price without inventing a value', () => {
    const rendered = renderAlertTriggerEmail({ ...base, triggerPrice: null })
    expect(rendered.text).toContain('Triggering price: Unavailable')
  })
})
