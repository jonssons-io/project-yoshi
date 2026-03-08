import type { ProblemDetails } from '@/api/generated/types.gen'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  if (!isObject(value)) return false
  return (
    typeof value.status === 'number' &&
    typeof value.title === 'string' &&
    typeof value.detail === 'string'
  )
}

function getCandidateValues(error: unknown): unknown[] {
  if (!isObject(error))
    return [
      error
    ]
  return [
    error,
    error.body,
    error.data,
    error.response,
    isObject(error.response) ? error.response.data : undefined,
    isObject(error.response) ? error.response.body : undefined
  ]
}

export function getProblemDetails(error: unknown): ProblemDetails | undefined {
  for (const candidate of getCandidateValues(error)) {
    if (isProblemDetails(candidate)) return candidate
  }
  return undefined
}

export function getErrorMessage(error: unknown): string {
  const problemDetails = getProblemDetails(error)
  if (problemDetails?.detail) return problemDetails.detail
  if (problemDetails?.title) return problemDetails.title

  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return 'An unexpected error occurred'
}
