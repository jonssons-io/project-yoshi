export type BlueprintRevisionChangeLike = {
  field: string
  previousValue: unknown
  newValue: unknown
}

export type BlueprintRevisionLike = {
  id: string
  createdAt: string
  effectiveFrom?: string | null
  scope?: string | null
  /** When true, the revision is not yet applied to the blueprint (cancel via DELETE …/revisions/{id}). */
  scheduled?: boolean
  changes: BlueprintRevisionChangeLike[]
}

export function revisionCalendarDay(revision: BlueprintRevisionLike): string {
  const raw = revision.effectiveFrom ?? revision.createdAt
  return raw.slice(0, 10)
}

function localIsoDate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Calendar day (YYYY-MM-DD) for the revision group that should show the “Nuvarande” badge.
 *
 * Primary rule: newest-first list — use the calendar day of the revision immediately before
 * the first `scheduled === true` row. If none are scheduled, the newest revision’s day.
 * If the list starts with a scheduled row, fall back to today / last revision on or before today.
 */
export function resolveCurrentRevisionDay(
  revisions: BlueprintRevisionLike[]
): string | null {
  if (revisions.length === 0) return null

  const firstScheduledIdx = revisions.findIndex((r) => r.scheduled === true)

  if (firstScheduledIdx > 0) {
    const beforeScheduled = revisions[firstScheduledIdx - 1]
    if (beforeScheduled) return revisionCalendarDay(beforeScheduled)
  }
  if (firstScheduledIdx === -1) {
    const newest = revisions[0]
    if (newest) return revisionCalendarDay(newest)
    return null
  }

  const today = localIsoDate()
  const days = revisions.map((r) => revisionCalendarDay(r))
  if (days.includes(today)) return today

  const pastOrToday = days.filter((d) => d <= today)
  if (pastOrToday.length > 0) {
    const sorted = [
      ...pastOrToday
    ].sort((a, b) => b.localeCompare(a))
    const best = sorted[0]
    if (best) return best
  }

  const sortedDays = [
    ...days
  ].sort((a, b) => b.localeCompare(a))
  return sortedDays[0] ?? null
}

export type RevisionDayGroup = {
  day: string
  revisions: BlueprintRevisionLike[]
}

/**
 * `GET …/revisions` returns **newest first**; the **last** element is always the bundled creation snapshot.
 * Timeline UI groups earlier items by calendar day and renders creation in its own block at the bottom.
 */
export function splitTrailingCreationRevision(
  revisions: BlueprintRevisionLike[]
): {
  timelineRevisions: BlueprintRevisionLike[]
  creationTail: BlueprintRevisionLike | null
} {
  if (revisions.length === 0) {
    return {
      timelineRevisions: [],
      creationTail: null
    }
  }
  const creationTail = revisions[revisions.length - 1] ?? null
  return {
    timelineRevisions: revisions.slice(0, -1),
    creationTail
  }
}

/**
 * Groups revisions by {@link revisionCalendarDay}, preserving API order (newest first) within each day.
 * Days are sorted newest-first.
 */
export function groupRevisionsByCalendarDayDescending(
  revisions: BlueprintRevisionLike[]
): RevisionDayGroup[] {
  const byDay = new Map<string, BlueprintRevisionLike[]>()
  for (const r of revisions) {
    const day = revisionCalendarDay(r)
    const list = byDay.get(day)
    if (list) list.push(r)
    else
      byDay.set(day, [
        r
      ])
  }
  const days = [
    ...byDay.keys()
  ].sort((a, b) => b.localeCompare(a))
  return days.map((day) => ({
    day,
    revisions: byDay.get(day) ?? []
  }))
}
