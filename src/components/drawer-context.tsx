import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState
} from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer'

interface DrawerContextType {
  isOpen: boolean
  openDrawer: (content: ReactNode, title?: string) => void
  closeDrawer: () => void
}

const DrawerContext = createContext<DrawerContextType | null>(null)
const DRAWER_CONTENT_DESCRIPTION = 'Drawer content'

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState<ReactNode>(null)
  const [title, setTitle] = useState<string | undefined>(undefined)

  const openDrawer = useCallback(
    (drawerContent: ReactNode, drawerTitle?: string) => {
      setContent(drawerContent)
      setTitle(drawerTitle)
      setIsOpen(true)
    },
    []
  )

  const closeDrawer = useCallback(() => {
    setIsOpen(false)
    // Clear content after animation completes
    setTimeout(() => {
      setContent(null)
      setTitle(undefined)
    }, 300)
  }, [])

  return (
    <DrawerContext.Provider
      value={{
        isOpen,
        openDrawer,
        closeDrawer
      }}
    >
      {children}
      <Drawer
        open={isOpen}
        onOpenChange={(open) => !open && closeDrawer()}
        direction="right"
      >
        <DrawerContent className="h-screen top-0 right-0 left-auto mt-0 w-125 rounded-none">
          {title && (
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription className="sr-only">
                {DRAWER_CONTENT_DESCRIPTION}
              </DrawerDescription>
            </DrawerHeader>
          )}
          {!title && (
            <DrawerDescription className="sr-only">
              {DRAWER_CONTENT_DESCRIPTION}
            </DrawerDescription>
          )}
          <div className="overflow-auto p-4">{content}</div>
        </DrawerContent>
      </Drawer>
    </DrawerContext.Provider>
  )
}

export function useDrawerContext() {
  const context = useContext(DrawerContext)
  if (!context) {
    throw new Error('useDrawerContext must be used within a DrawerProvider')
  }
  return context
}
