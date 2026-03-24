import {
  type ComponentType,
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import { DrawerShell } from '@/components/drawer/drawer'

import { type DrawerPropsMap, drawerComponents, drawerMeta } from './registry'

const DRAWER_CLOSE_CLEAR_MS = 300

type DrawerBodyComponent = ComponentType<
  Record<string, unknown> & {
    onClose: () => void
  }
>

type DrawerMetaEntry = {
  title: string
  description?: string
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
const drawerTitles = drawerMeta as Record<string, DrawerMetaEntry>

export interface DrawerContextValue {
  openDrawer: <K extends keyof DrawerPropsMap>(
    name: K,
    props: DrawerPropsMap[K]
  ) => void
  closeDrawer: () => void
}

export const DrawerContext = createContext<DrawerContextValue | null>(null)

export function DrawerProvider({ children }: { children: ReactNode }) {
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
  ) as DrawerContextValue['openDrawer']

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

  return (
    <DrawerContext.Provider
      value={{
        openDrawer,
        closeDrawer
      }}
    >
      {children}
      <DrawerShell
        open={drawerOpen && activeDrawer !== null}
        onOpenChange={handleOpenChange}
        title={meta?.title}
        description={meta?.description}
      >
        {Body !== undefined && activeDrawer !== null
          ? createElement(Body, {
              ...(activeDrawer.props as Record<string, unknown>),
              onClose: closeDrawer
            })
          : null}
      </DrawerShell>
    </DrawerContext.Provider>
  )
}
