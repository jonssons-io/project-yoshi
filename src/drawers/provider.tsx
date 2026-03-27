import {
  type ComponentType,
  createContext,
  createElement,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'

import { DrawerShell } from '@/components/drawer/drawer'

import { type DrawerPropsMap, drawerComponents, drawerMeta } from './registry'

const DRAWER_CLOSE_CLEAR_MS = 300

type DrawerBodyComponent = ComponentType<
  Record<string, unknown> & {
    onClose: () => void
  }
>

type DrawerMetaEntry = {
  titleKey: string
  descriptionKey?: string
  titleParams?: (props: Record<string, unknown>) => Record<string, unknown>
  descriptionParams?: (props: Record<string, unknown>) => Record<string, unknown>
}

/** Runtime snapshot; typed entry is enforced at `openDrawer` call sites. */
type ActiveDrawerSnapshot = {
  name: string
  props: unknown
} | null

const drawerBodies = drawerComponents as unknown as Record<
  string,
  DrawerBodyComponent
>
const drawerTitles = drawerMeta as unknown as Record<string, DrawerMetaEntry>

export interface DrawerActionsContextValue {
  openDrawer: <K extends keyof DrawerPropsMap>(
    name: K,
    props: DrawerPropsMap[K]
  ) => void
  closeDrawer: () => void
}

export interface DrawerStateContextValue {
  /**
   * True when no drawer is active and the shell is closed, including after the
   * post-close delay that keeps the body mounted for exit animation. Use to
   * defer heavy main-content swaps until Vaul portaled nodes are gone.
   */
  isDrawerSettled: boolean
}

export const DrawerActionsContext =
  createContext<DrawerActionsContextValue | null>(null)
export const DrawerStateContext = createContext<DrawerStateContextValue | null>(
  null
)

const DrawerContentHost = memo(function DrawerContentHost({
  children
}: {
  children: ReactNode
}) {
  return <>{children}</>
})

export function DrawerProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawerSnapshot>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPendingTimer = useCallback(() => {
    if (clearTimerRef.current !== null) {
      clearTimeout(clearTimerRef.current)
      clearTimerRef.current = null
    }
  }, [])

  const scheduleClearActive = useCallback(() => {
    clearPendingTimer()
    clearTimerRef.current = setTimeout(() => {
      setActiveDrawer(null)
      clearTimerRef.current = null
    }, DRAWER_CLOSE_CLEAR_MS)
  }, [
    clearPendingTimer
  ])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    scheduleClearActive()
  }, [
    scheduleClearActive
  ])

  const openDrawer = useCallback(
    <K extends keyof DrawerPropsMap>(name: K, props: DrawerPropsMap[K]) => {
      clearPendingTimer()
      setActiveDrawer({
        name,
        props
      })
      setDrawerOpen(true)
    },
    [
      clearPendingTimer
    ]
  ) as DrawerActionsContextValue['openDrawer']

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setDrawerOpen(false)
        scheduleClearActive()
      } else {
        setDrawerOpen(true)
      }
    },
    [
      scheduleClearActive
    ]
  )

  useEffect(() => {
    return () => {
      clearPendingTimer()
    }
  }, [
    clearPendingTimer
  ])

  const meta =
    activeDrawer !== null ? drawerTitles[activeDrawer.name] : undefined
  const Body =
    activeDrawer !== null ? drawerBodies[activeDrawer.name] : undefined
  const activeDrawerProps = activeDrawer?.props as
    | Record<string, unknown>
    | undefined

  const shellTitle = useMemo(() => {
    if (meta === undefined) return undefined
    const params = meta.titleParams?.(activeDrawerProps ?? {}) ?? {}
    return t(meta.titleKey, params)
  }, [
    activeDrawerProps,
    meta,
    t
  ])

  const shellDescription = useMemo(() => {
    if (meta === undefined || meta.descriptionKey === undefined) return undefined
    const params = meta.descriptionParams?.(activeDrawerProps ?? {}) ?? {}
    return t(meta.descriptionKey, params)
  }, [
    activeDrawerProps,
    meta,
    t
  ])

  const isDrawerSettled = activeDrawer === null && !drawerOpen
  const actionsValue = useMemo(
    () => ({
      openDrawer,
      closeDrawer
    }),
    [
      closeDrawer,
      openDrawer
    ]
  )
  const stateValue = useMemo(
    () => ({
      isDrawerSettled
    }),
    [
      isDrawerSettled
    ]
  )

  return (
    <DrawerActionsContext.Provider value={actionsValue}>
      <DrawerStateContext.Provider value={stateValue}>
        <DrawerContentHost>{children}</DrawerContentHost>
        <DrawerShell
          open={drawerOpen && activeDrawer !== null}
          onOpenChange={handleOpenChange}
          title={shellTitle}
          description={shellDescription}
        >
          {Body !== undefined && activeDrawer !== null
            ? createElement(Body, {
                ...(activeDrawer.props as Record<string, unknown>),
                onClose: closeDrawer
              })
            : null}
        </DrawerShell>
      </DrawerStateContext.Provider>
    </DrawerActionsContext.Provider>
  )
}
