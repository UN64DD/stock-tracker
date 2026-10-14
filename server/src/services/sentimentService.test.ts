import { describe, expect, it } from 'vitest'
import { createSentimentService, MIN_ARTICLES_FOR_SUMMARY } from './sentimentService.js'

const service = createSentimentService()

describe('LexiconSentimentService.analyzeArticle', () => {
  it('labels an upbeat headline positive', () => {
    const result = service.analyzeArticle({ headline: 'Company beats earnings as shares surge' })
    expect(result.label).toBe('positive')
    expect(result.score).toBeGreaterThan(0)
  })

  it('labels a downbeat headline negative', () => {
    const result = service.analyzeArticle({ headline: 'Regulator opens probe; shares fall' })
    expect(result.label).toBe('negative')
    expect(result.score).toBeLessThan(0)
  })

  it('returns neutral with a zero score when no terms are present', () => {
    const result = service.analyzeArticle({ headline: 'Company files routine form with regulator' })
    expect(result).toEqual({ label: 'neutral', score: 0 })
  })

  it('flips polarity for a nearby negation', () => {
    const result = service.analyzeArticle({ headline: 'Outlook is not strong' })
    expect(result.label).toBe('negative')
  })

  it('weights the headline above the summary', () => {
    const headlineOnly = service.analyzeArticle({ headline: 'Record profit' })
    const withWeakSummary = service.analyzeArticle({
      headline: 'Record profit',
      summary: 'A weak result misses guidance',
    })
    expect(headlineOnly.score).toBeGreaterThan(0)
    expect(withWeakSummary.score).toBeLessThan(headlineOnly.score)
  })
})

describe('LexiconSentimentService.summarizeSentiment', () => {
  it('reports insufficient data below the minimum article count', () => {
    const summary = service.summarizeSentiment([
      { headline: 'Shares surge' },
      { headline: 'Profit rises' },
    ])
    expect(summary.label).toBe('insufficient')
    expect(summary.score).toBeNull()
    expect(summary.articleCount).toBe(2)
    expect(summary.positive).toBe(2)
  })

  it('aggregates counts and an average score at or above the minimum', () => {
    const articles = [
      { headline: 'Company beats earnings as shares surge' },
      { headline: 'Analyst upgrade lifts outlook' },
      { headline: 'Regulator opens probe; shares fall' },
      { headline: 'Routine filing notes no material change' },
    ]
    expect(articles.length).toBeGreaterThanOrEqual(MIN_ARTICLES_FOR_SUMMARY)

    const summary = service.summarizeSentiment(articles)
    expect(summary.articleCount).toBe(4)
    expect(summary.positive).toBe(2)
    expect(summary.negative).toBe(1)
    expect(summary.neutral).toBe(1)
    expect(summary.score).not.toBeNull()
    expect(summary.label).toBe('positive')
  })

  it('handles an empty list', () => {
    const summary = service.summarizeSentiment([])
    expect(summary).toEqual({
      label: 'insufficient',
      score: null,
      positive: 0,
      neutral: 0,
      negative: 0,
      articleCount: 0,
    })
  })
})
