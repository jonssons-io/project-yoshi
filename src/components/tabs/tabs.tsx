import { createContext, type ReactNode, useContext } from 'react'

type TabsContextValue = {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext)
  if (!ctx) {
    throw new Error('Tabs components must be used within <Tabs>')
  }
  return ctx
}

export type TabsProps = {
  /** Currently selected tab value */
  value: string
  /** Called when the user selects a different tab */
  onValueChange: (value: string) => void
  children: ReactNode
}

/**
 * Controlled tab group. Pair with {@link TabsList} and {@link TabsTrigger}.
 */
export function Tabs({ value, onValueChange, children }: TabsProps) {
  return (
    <TabsContext.Provider
      value={{
        value,
        onValueChange
      }}
    >
      {children}
    </TabsContext.Provider>
  )
}

/**
 * Full-width bar with bottom border and container padding (horizontal 0.5rem, top 0.25rem, no bottom).
 */
export function TabsList({ children }: { children: ReactNode }) {
  return (
    <div
      role="tablist"
      className="relative flex w-full min-w-0 flex-wrap border-b border-gray-300 px-2 pt-1"
    >
      {children}
    </div>
  )
}

export type TabsTriggerProps = {
  value: string
  /** 1×1rem icon (e.g. Lucide); line-height 1.5 is applied in the icon slot */
  icon: ReactNode
  /** Tab label */
  children: ReactNode
}

/**
 * Single tab control with icon + label. Selected state is driven by the parent {@link Tabs} value.
 */
export function TabsTrigger({ value, icon, children }: TabsTriggerProps) {
  const { value: selected, onValueChange } = useTabsContext()
  const isSelected = selected === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? 'active' : 'inactive'}
      className={
        isSelected
          ? 'relative z-10 inline-flex cursor-pointer items-center justify-center gap-2 px-4 py-1 text-purple-800 after:pointer-events-none after:absolute after:-bottom-px after:left-0 after:right-0 after:z-10 after:h-px after:bg-purple-800'
          : 'relative z-0 inline-flex cursor-pointer items-center justify-center gap-2 px-4 py-1 text-black'
      }
      onClick={() => {
        onValueChange(value)
      }}
    >
      <span
        className="inline-flex size-4 shrink-0 items-center justify-center leading-normal"
        aria-hidden={true}
      >
        {icon}
      </span>
      <span className="type-label-semibold">{children}</span>
    </button>
  )
}
