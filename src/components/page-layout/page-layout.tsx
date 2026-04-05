import type { MouseEventHandler, ReactNode } from 'react'

import { Button } from '@/components/button/button'
import { InfoCard, type InfoCardProps } from '@/components/info-card/info-card'
import { Skeleton } from '@/components/ui/skeleton'

export type PageLayoutQuickAction = {
  /** Stable key when multiple actions share a label */
  id?: string
  label: string
  icon: ReactNode
  onClick: MouseEventHandler<HTMLButtonElement>
}

export type PageLayoutProps = {
  title: string
  description: ReactNode
  /** When true, replaces title, description, quick actions, and info cards with skeletons */
  loadingHeader?: boolean
  /** When true, replaces main content with a row skeleton */
  loadingContent?: boolean
  /** Filled subtle buttons; order preserved left-to-right in the row */
  quickActions?: PageLayoutQuickAction[]
  /** Right-aligned cards; first item is visually rightmost (fills leftward) */
  infoCards?: Array<
    InfoCardProps & {
      id?: string
    }
  >
  /** Full-width tab row (e.g. {@link Tabs} + {@link TabsList}); border should span edge to edge */
  tabs?: ReactNode
  children: ReactNode
}

const CONTENT_SKELETON_ROW_IDS = [
  'r0',
  'r1',
  'r2',
  'r3',
  'r4',
  'r5',
  'r6',
  'r7',
  'r8'
] as const
const CONTENT_SKELETON_ROW_CLASS = 'h-4 w-full max-w-full rounded-sm'

function PageLayoutHeaderSkeleton() {
  return (
    <output
      aria-busy={true}
      aria-live="polite"
      aria-label="Loading page header"
      className="block px-4 pt-6 pb-6"
    >
      <div className="flex min-h-0 flex-row items-stretch justify-between gap-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <div className="flex shrink-0 flex-col gap-3">
            <Skeleton className="h-9 w-56 max-w-full rounded-md" />
            <Skeleton className="h-5 w-full max-w-2xl rounded-md" />
            <Skeleton className="h-5 w-[min(100%,28rem)] rounded-md" />
          </div>
        </div>
        <div className="flex max-w-full shrink-0 flex-row-reverse flex-wrap items-start justify-end gap-2">
          <Skeleton className="shrink-0 rounded-sm w-24 sm:w-32 h-full" />
          <Skeleton className="shrink-0 rounded-sm w-24 sm:w-32 h-full" />
          <Skeleton className="shrink-0 rounded-sm w-24 sm:w-32 h-full" />
          <Skeleton className="shrink-0 rounded-sm w-24 sm:w-32 h-full" />
        </div>
      </div>
    </output>
  )
}

function PageLayoutContentSkeleton() {
  return (
    <output
      aria-busy={true}
      aria-live="polite"
      aria-label="Loading content"
      className="flex min-h-0 flex-1 flex-col gap-4 py-1"
    >
      {CONTENT_SKELETON_ROW_IDS.map((rowId) => (
        <Skeleton
          key={rowId}
          className={CONTENT_SKELETON_ROW_CLASS}
        />
      ))}
    </output>
  )
}

/**
 * Standard page shell: title + description, optional quick actions (bottom of header block),
 * optional info cards (right, right-aligned), optional full-width tabs, then main content.
 */
export function PageLayout({
  title,
  description,
  loadingHeader = false,
  loadingContent = false,
  quickActions,
  infoCards,
  tabs,
  children
}: PageLayoutProps) {
  const hasQuickActions = Boolean(quickActions?.length)
  const hasInfoCards = Boolean(infoCards?.length)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {loadingHeader ? (
        <PageLayoutHeaderSkeleton />
      ) : (
        <div className="px-4 pt-6 pb-6">
          <div className="flex min-h-0 flex-row items-stretch justify-between gap-4">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
              <div className="flex shrink-0 flex-col gap-3">
                <h1 className="type-title-large text-black">{title}</h1>
                <div className="type-body-medium text-gray-800">
                  {description}
                </div>
              </div>
              {hasQuickActions ? (
                <div className="flex min-h-0 flex-1 flex-col justify-end">
                  <div className="flex flex-wrap gap-2">
                    {(quickActions ?? []).map((action) => (
                      <Button
                        key={action.id ?? action.label}
                        variant="filled"
                        color="subtle"
                        label={action.label}
                        icon={action.icon}
                        onClick={action.onClick}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            {hasInfoCards ? (
              <div className="flex max-w-full shrink-0 flex-row-reverse flex-wrap items-start justify-end gap-2">
                {(infoCards ?? []).map((card) => {
                  const { id: _listId, ...cardProps } = card
                  return (
                    <InfoCard
                      key={_listId ?? `${card.color}-${card.label}`}
                      {...cardProps}
                    />
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}
      {tabs}
      <div className="flex min-h-0 flex-1 flex-col border-t border-gray-300 p-4">
        {loadingContent ? <PageLayoutContentSkeleton /> : children}
      </div>
    </div>
  )
}
