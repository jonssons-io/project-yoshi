import type { MouseEventHandler, ReactNode } from 'react'

import { Button } from '@/components/button/button'
import { InfoCard, type InfoCardProps } from '@/components/info-card/info-card'

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

/**
 * Standard page shell: title + description, optional quick actions (bottom of header block),
 * optional info cards (right, right-aligned), optional full-width tabs, then main content.
 */
export function PageLayout({
  title,
  description,
  quickActions,
  infoCards,
  tabs,
  children
}: PageLayoutProps) {
  const hasQuickActions = Boolean(quickActions?.length)
  const hasInfoCards = Boolean(infoCards?.length)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
      {tabs}
      <div className="flex min-h-0 flex-1 flex-col border-t border-gray-300 px-4 pt-6 pb-6">
        {children}
      </div>
    </div>
  )
}
