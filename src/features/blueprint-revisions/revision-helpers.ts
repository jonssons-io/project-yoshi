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

export type CurrentRevisionBadgePlacement =
  | {
      kind: 'day'
      day: string
    }
  | {
      kind: 'creation'
    }

/**
 * Where to show the “Nuvarande” badge: today’s day if any revision falls on today; otherwise
 * the latest revision calendar day strictly before today. If that day is only represented by
 * the bundled creation snapshot (no timeline rows for that day), the badge belongs on the
 * creation row next to “Inkomst skapad” / “Räkning skapad”.
 */
export function resolveCurrentRevisionBadgePlacement(
  allRevisions: BlueprintRevisionLike[],
  timelineRevisions: BlueprintRevisionLike[],
  creationTail: BlueprintRevisionLike | null
): CurrentRevisionBadgePlacement | null {
  if (allRevisions.length === 0) return null

  const today = localIsoDate()
  const daySet = new Set(allRevisions.map((r) => revisionCalendarDay(r)))

  let currentDay: string | null = null
  if (daySet.has(today)) {
    currentDay = today
  } else {
    const strictlyBeforeToday = [
      ...daySet
    ].filter((d) => d < today)
    if (strictlyBeforeToday.length > 0) {
      strictlyBeforeToday.sort((a, b) => b.localeCompare(a))
      currentDay = strictlyBeforeToday[0] ?? null
    }
  }

  if (currentDay === null) return null

  const creationDay =
    creationTail !== null ? revisionCalendarDay(creationTail) : null
  if (
    creationDay !== null &&
    currentDay === creationDay &&
    !timelineRevisions.some((r) => revisionCalendarDay(r) === currentDay)
  ) {
    return {
      kind: 'creation'
    }
  }

  return {
    kind: 'day',
    day: currentDay
  }
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
