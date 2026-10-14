export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown
  readonly retryAfterSeconds?: number

  constructor(
    status: number,
    code: string,
    message: string,
    options: { details?: unknown; retryAfterSeconds?: number } = {},
  ) {
    super(message)
    this.name = new.target.name
    this.status = status
    this.code = code
    this.details = options.details
    this.retryAfterSeconds = options.retryAfterSeconds
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'validation_error', message, { details })
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.') {
    super(404, 'not_found', message)
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = 'You must be signed in to do that.',
    code = 'unauthorized',
  ) {
    super(401, code, message)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'That resource already exists.') {
    super(409, 'conflict', message)
  }
}

export class ProviderError extends AppError {
  constructor(
    message = 'The market data provider returned an error.',
    options: { status?: number; code?: string; details?: unknown } = {},
  ) {
    super(options.status ?? 502, options.code ?? 'provider_error', message, {
      details: options.details,
    })
  }
}

export class ProviderAuthError extends AppError {
  constructor(message = 'The market data provider rejected the API key.') {
    super(502, 'provider_auth_error', message)
  }
}

export class ProviderRateLimitError extends AppError {
  constructor(retryAfterSeconds = 60) {
    super(429, 'provider_rate_limited', 'The market data provider rate limit was reached.', {
      retryAfterSeconds,
    })
  }
}

/**
 * Internal marker for endpoints that are gated behind a higher provider plan.
 * Never surfaced directly to clients; callers degrade gracefully instead.
 */
export class ProviderPlanRestrictedError extends AppError {
  constructor(message = 'This data requires a higher market data plan.') {
    super(402, 'provider_plan_restricted', message)
  }
}

export class ConfigurationError extends AppError {
  constructor(message = 'The market data provider is not configured on the server.') {
    super(503, 'not_configured', message)
  }
}

export class UpstreamTimeoutError extends AppError {
  constructor(message = 'The market data provider did not respond in time.') {
    super(504, 'provider_timeout', message)
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
