export type SentimentLabel = 'positive' | 'neutral' | 'negative'

export interface ArticleSentiment {
  label: SentimentLabel
  /** Normalized score in [-1, 1]; 0 when no sentiment terms were found. */
  score: number
}

/**
 * Aggregate sentiment across a set of articles. `label` is `insufficient` when
 * there are too few articles for a meaningful reading; `score` is then `null`.
 */
export interface SentimentSummary {
  label: SentimentLabel | 'insufficient'
  score: number | null
  positive: number
  neutral: number
  negative: number
  articleCount: number
}

export interface AnalyzableArticle {
  headline: string
  summary?: string | null
}

/**
 * Returns sentiment for a single article and an aggregate summary for a list.
 * The only implementation is a transparent, explainable lexicon heuristic —
 * deliberately not an ML/AI model, and not a price prediction.
 */
export interface SentimentService {
  analyzeArticle(article: AnalyzableArticle): ArticleSentiment
  summarizeSentiment(articles: AnalyzableArticle[]): SentimentSummary
}

/** Below this many articles, an aggregate is not considered meaningful. */
export const MIN_ARTICLES_FOR_SUMMARY = 3

/** Score magnitude at or above which a label is assigned (else neutral). */
const LABEL_THRESHOLD = 0.2

/**
 * A small, fixed finance/news lexicon. This is intentionally simple and fully
 * inspectable: it counts positive and negative terms in the headline (weighted
 * double) and summary, applies a short-range negation flip, and normalizes by
 * the number of matched terms. It is a coarse signal, not a trained model.
 */
const POSITIVE_TERMS = new Set([
  'beat', 'beats', 'boost', 'boosted', 'boosts', 'breakthrough', 'bullish', 'climb',
  'climbs', 'deal', 'dividend', 'expand', 'expands', 'expansion', 'gain', 'gains',
  'growth', 'higher', 'improve', 'improved', 'improvement', 'improves', 'jump',
  'jumps', 'momentum', 'optimistic', 'outperform', 'outperforms', 'partnership',
  'profit', 'profits', 'profitable', 'rally', 'rallies', 'raise', 'raised', 'raises',
  'record', 'recovery', 'resilient', 'rise', 'rises', 'rising', 'robust', 'soar',
  'soars', 'strength', 'strong', 'succeed', 'success', 'successful', 'surge',
  'surges', 'upbeat', 'upgrade', 'upgraded', 'upgrades', 'win', 'wins', 'approval',
  'approved', 'exceed', 'exceeds', 'exceeded', 'tops', 'led', 'leads',
])

const NEGATIVE_TERMS = new Set([
  'bankruptcy', 'bearish', 'concern', 'concerns', 'cut', 'cuts', 'decline',
  'declines', 'declining', 'default', 'deficit', 'delay', 'delays', 'downgrade',
  'downgraded', 'downgrades', 'drop', 'drops', 'fall', 'falls', 'falling', 'fear',
  'fears', 'fine', 'fraud', 'gloomy', 'halt', 'halted', 'investigation', 'lawsuit',
  'layoff', 'layoffs', 'loss', 'losses', 'lower', 'lowers', 'miss', 'misses',
  'missed', 'penalty', 'plunge', 'plunges', 'pressure', 'pressures', 'probe',
  'recall', 'recession', 'risk', 'risks', 'sanction', 'sanctions', 'selloff',
  'shortage', 'shortages', 'slowdown', 'slump', 'slumps', 'slide', 'slides',
  'sink', 'sinks', 'struggle', 'struggles', 'tumble', 'tumbles', 'underperform',
  'underperforms', 'warning', 'warnings', 'warns', 'warned', 'weak', 'weakened',
  'weakness', 'worse', 'worst', 'debt', 'sued',
])

const NEGATIONS = new Set([
  'no', 'not', 'never', 'without', 'lacks', 'lack', 'isnt', 'arent', 'wasnt',
  'werent', 'doesnt', 'dont', 'didnt', 'cannot', 'cant', 'wont', 'wouldnt',
  'shouldnt', 'hardly', 'rarely', 'barely', 'fails', 'fail', 'failed',
])

const NEGATION_WINDOW = 3

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z']+/g) ?? []
}

function isNegated(tokens: string[], index: number): boolean {
  const start = Math.max(0, index - NEGATION_WINDOW)
  for (let i = start; i < index; i += 1) {
    if (NEGATIONS.has(tokens[i])) return true
  }
  return false
}

interface TermCounts {
  positive: number
  negative: number
}

function countTerms(text: string, weight: number, counts: TermCounts): void {
  const tokens = tokenize(text)
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    const positive = POSITIVE_TERMS.has(token)
    const negative = NEGATIVE_TERMS.has(token)
    if (!positive && !negative) continue
    const flipped = isNegated(tokens, i)
    const effectivePositive = positive !== flipped
    if (effectivePositive) counts.positive += weight
    else counts.negative += weight
  }
}

function labelForScore(score: number): SentimentLabel {
  if (score >= LABEL_THRESHOLD) return 'positive'
  if (score <= -LABEL_THRESHOLD) return 'negative'
  return 'neutral'
}

export class LexiconSentimentService implements SentimentService {
  analyzeArticle({ headline, summary }: AnalyzableArticle): ArticleSentiment {
    const counts: TermCounts = { positive: 0, negative: 0 }
    countTerms(headline, 2, counts)
    if (summary) countTerms(summary, 1, counts)

    const total = counts.positive + counts.negative
    if (total === 0) return { label: 'neutral', score: 0 }

    const score = round2((counts.positive - counts.negative) / total)
    return { label: labelForScore(score), score }
  }

  summarizeSentiment(articles: AnalyzableArticle[]): SentimentSummary {
    let positive = 0
    let neutral = 0
    let negative = 0
    let scoreTotal = 0

    for (const article of articles) {
      const { label, score } = this.analyzeArticle(article)
      if (label === 'positive') positive += 1
      else if (label === 'negative') negative += 1
      else neutral += 1
      scoreTotal += score
    }

    const articleCount = articles.length
    const counts = { positive, neutral, negative, articleCount }

    if (articleCount < MIN_ARTICLES_FOR_SUMMARY) {
      return { label: 'insufficient', score: null, ...counts }
    }

    const score = round2(scoreTotal / articleCount)
    return { label: labelForScore(score), score, ...counts }
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function createSentimentService(): SentimentService {
  return new LexiconSentimentService()
}
