import type { TFunction } from 'i18next'
import { ArrowRight, Undo2Icon } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/badge/badge'
import { IconButton } from '@/components/icon-button/icon-button'
import type { RevisionLabelLookups } from './format-revision-value'
import { formatBlueprintRevisionValue } from './format-revision-value'
import {
  type BlueprintRevisionLike,
  groupRevisionsByCalendarDayDescending,
  resolveCurrentRevisionBadgePlacement,
  revisionCalendarDay,
  splitTrailingCreationRevision
} from './revision-helpers'

export type BlueprintRevisionTimelineKind = 'income' | 'bill'

export type BlueprintRevisionTimelineProps = {
  kind: BlueprintRevisionTimelineKind
  t: TFunction
  revisions: BlueprintRevisionLike[]
  lookups: RevisionLabelLookups
  onUndo: (revision: BlueprintRevisionLike) => void
  undoingRevisionId: string | null
}

function fieldLabelKey(
  kind: BlueprintRevisionTimelineKind,
  field: string
): string {
  return `drawers.${kind}Revisions.fields.${field}`
}

type RevisionChangeListProps = {
  kind: BlueprintRevisionTimelineKind
  t: TFunction
  lookups: RevisionLabelLookups
  dayRevisions: BlueprintRevisionLike[]
  undoingRevisionId: string | null
  onUndo: (revision: BlueprintRevisionLike) => void
}

function RevisionChangeList({
  kind,
  t,
  lookups,
  dayRevisions,
  undoingRevisionId,
  onUndo
}: RevisionChangeListProps) {
  return (
    <ul className="flex list-none flex-col gap-1 p-0">
      {dayRevisions.flatMap((revision) =>
        revision.changes.map((change, changeIdx) => {
          const labelKey = fieldLabelKey(kind, change.field)
          const fieldLabel =
            t(labelKey) === labelKey ? change.field : t(labelKey)
          const labelWithColon = `${fieldLabel}:`
          const isScheduled = revision.scheduled === true
          const isLastChange = changeIdx === revision.changes.length - 1

          return (
            <li
              key={`${revision.id}:${change.field}:${changeIdx}`}
              className="type-body-small flex flex-row flex-wrap items-start gap-2 text-foreground"
            >
              <div className="min-w-0 flex-1">
                <span className="text-muted-foreground">{labelWithColon}</span>{' '}
                {change.previousValue === null ||
                change.previousValue === undefined ? (
                  <span>
                    {formatBlueprintRevisionValue(
                      change.field,
                      change.newValue,
                      t,
                      lookups
                    )}
                  </span>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <span className="line-through decoration-foreground/50">
                      {formatBlueprintRevisionValue(
                        change.field,
                        change.previousValue,
                        t,
                        lookups
                      )}
                    </span>
                    <ArrowRight
                      className="inline-block size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span>
                      {formatBlueprintRevisionValue(
                        change.field,
                        change.newValue,
                        t,
                        lookups
                      )}
                    </span>
                  </span>
                )}
              </div>
              {isScheduled && isLastChange ? (
                <span className="shrink-0">
                  <IconButton
                    type="button"
                    variant="text"
                    color="subtle"
                    icon={<Undo2Icon className="size-4" />}
                    title={t('drawers.blueprintRevisions.undoTitle')}
                    aria-label={t('drawers.blueprintRevisions.undoTitle')}
                    disabled={undoingRevisionId === revision.id}
                    onClick={() => {
                      onUndo(revision)
                    }}
                  />
                </span>
              ) : null}
            </li>
          )
        })
      )}
    </ul>
  )
}

/**
 * Scrollable revision history for a recurring income or bill blueprint (Swedish UI).
 */
export function BlueprintRevisionTimeline({
  kind,
  t,
  revisions,
  lookups,
  onUndo,
  undoingRevisionId
}: BlueprintRevisionTimelineProps) {
  const { timelineRevisions, creationTail } = useMemo(
    () => splitTrailingCreationRevision(revisions),
    [
      revisions
    ]
  )

  const currentBadge = useMemo(
    () =>
      resolveCurrentRevisionBadgePlacement(
        revisions,
        timelineRevisions,
        creationTail
      ),
    [
      revisions,
      timelineRevisions,
      creationTail
    ]
  )

  const dayGroups = useMemo(
    () => groupRevisionsByCalendarDayDescending(timelineRevisions),
    [
      timelineRevisions
    ]
  )

  const creationDay =
    creationTail !== null ? revisionCalendarDay(creationTail) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1">
      {dayGroups.map(({ day, revisions: dayRevisions }) => {
        const showCurrent =
          currentBadge?.kind === 'day' && currentBadge.day === day
        const showPlanned = dayRevisions.some((r) => r.scheduled === true)

        return (
          <section
            key={day}
            className="flex flex-col gap-3 type-label-small"
            aria-label={t('drawers.blueprintRevisions.sectionAria', {
              date: day
            })}
          >
            <div className="flex flex-row flex-wrap items-center gap-2">
              <span className="type-body-strong text-foreground">{day}</span>
              {showCurrent ? (
                <Badge
                  color="green"
                  label={t('drawers.blueprintRevisions.badgeCurrent')}
                />
              ) : null}
              {showPlanned ? (
                <Badge
                  color="orange"
                  label={t('drawers.blueprintRevisions.badgePlanned')}
                />
              ) : null}
            </div>
            <RevisionChangeList
              kind={kind}
              t={t}
              lookups={lookups}
              dayRevisions={dayRevisions}
              undoingRevisionId={undoingRevisionId}
              onUndo={onUndo}
            />
          </section>
        )
      })}
      {creationTail !== null && creationDay !== null ? (
        <section
          key={`creation-${creationTail.id}`}
          className="flex flex-col gap-3 type-label-small"
          aria-label={t('drawers.blueprintRevisions.sectionAria', {
            date: creationDay
          })}
        >
          <div className="flex flex-row flex-wrap items-center gap-2">
            <span className="type-body-strong text-foreground">
              {creationDay}
            </span>
            <Badge
              color="blue"
              label={
                kind === 'income'
                  ? t('drawers.incomeRevisions.badgeCreated')
                  : t('drawers.billRevisions.badgeCreated')
              }
            />
            {currentBadge?.kind === 'creation' ? (
              <Badge
                color="green"
                label={t('drawers.blueprintRevisions.badgeCurrent')}
              />
            ) : null}
            {creationTail.scheduled === true ? (
              <Badge
                color="orange"
                label={t('drawers.blueprintRevisions.badgePlanned')}
              />
            ) : null}
          </div>
          <RevisionChangeList
            kind={kind}
            t={t}
            lookups={lookups}
            dayRevisions={[
              creationTail
            ]}
            undoingRevisionId={undoingRevisionId}
            onUndo={onUndo}
          />
        </section>
      ) : null}
    </div>
  )
}
