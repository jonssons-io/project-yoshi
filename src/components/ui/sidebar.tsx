import { PanelLeftIcon } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { BaseButton } from '@/components/base-button/base-button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

type SidebarContextProps = {
  isMobile: boolean
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.')
  }

  return context
}

function SidebarProvider({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  React.useEffect(() => {
    if (!isMobile && openMobile) {
      setOpenMobile(false)
    }
  }, [
    isMobile,
    openMobile
  ])

  const toggleSidebar = React.useCallback(() => {
    setOpenMobile((open) => !open)
  }, [])

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar
    }),
    [
      isMobile,
      openMobile,
      toggleSidebar
    ]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        className={cn('flex h-svh w-full overflow-hidden', className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

/**
 * Renders the application sidebar.
 */
function Sidebar({
  className,
  children,
  ...props
}: React.ComponentProps<'aside'>) {
  const { isMobile, openMobile, setOpenMobile } = useSidebar()
  const { t } = useTranslation()

  if (!isMobile) {
    return (
      <aside
        data-slot="sidebar"
        className={cn(
          'box-border flex h-svh w-fit shrink-0 flex-col border-r border-gray-300 bg-white pt-4',
          className
        )}
        {...props}
      >
        {children}
      </aside>
    )
  }

  return (
    <Sheet
      open={openMobile}
      onOpenChange={setOpenMobile}
    >
      <SheetContent
        side="left"
        data-slot="sidebar-mobile"
        className="w-auto max-w-[calc(100vw-2rem)] bg-white p-0 [&>button]:hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t('dashboard.sidebar')}</SheetTitle>
          <SheetDescription>
            {t('dashboard.sidebarDescription')}
          </SheetDescription>
        </SheetHeader>
        <aside
          className={cn(
            'box-border flex h-full w-fit min-w-0 flex-col pt-4',
            className
          )}
          {...props}
        >
          {children}
        </aside>
      </SheetContent>
    </Sheet>
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        'flex h-svh min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
        className
      )}
      {...props}
    />
  )
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: Omit<React.ComponentProps<'button'>, 'color'>) {
  const { isMobile, toggleSidebar } = useSidebar()
  const { t } = useTranslation()

  if (!isMobile) {
    return null
  }

  return (
    <BaseButton
      data-slot="sidebar-trigger"
      variant="text"
      color="subtle"
      iconOnly
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">{t('dashboard.toggleSidebar')}</span>
    </BaseButton>
  )
}

export { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger }
