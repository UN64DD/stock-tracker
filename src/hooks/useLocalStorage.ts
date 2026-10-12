import { useCallback, useState } from 'react'
import { readStorage, writeStorage } from '@/lib/storage'

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((previous: T) => T)) => void] {
  const [state, setState] = useState<T>(() => readStorage(key, initialValue))

  const setValue = useCallback(
    (value: T | ((previous: T) => T)) => {
      setState((previous) => {
        const next =
          typeof value === 'function'
            ? (value as (prev: T) => T)(previous)
            : value
        writeStorage(key, next)
        return next
      })
    },
    [key],
  )

  return [state, setValue]
}
