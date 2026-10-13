import type { NextFunction, Request, Response } from 'express'

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown

/** Wraps an async Express handler so rejected promises reach the error middleware. */
export function asyncHandler(handler: Handler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(handler(req, res, next)).catch(next)
  }
}

/** Aborts in-flight provider calls when the client disconnects. */
export function requestSignal(res: Response): AbortSignal {
  const controller = new AbortController()
  res.on('close', () => controller.abort())
  return controller.signal
}
