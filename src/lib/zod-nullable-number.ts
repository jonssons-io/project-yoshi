import { z } from 'zod'

/**
 * `NumberField` stores `null` when empty or when the native `type="number"` value is not yet
 * a finite number (e.g. lone "."). Use for per-field / onChange validators; tighten on submit.
 */
export function nullablePositiveNumber(message: string) {
  return z.union([
    z.null(),
    z.number().positive(message)
  ])
}

export function nullableNonNegativeNumber(minMessage: string) {
  return z.union([
    z.null(),
    z.number().min(0, minMessage)
  ])
}

export function nullableNumber() {
  return z.union([
    z.null(),
    z.number()
  ])
}
