import {
  Check,
  ChevronsUpDown,
  LogOut,
  Mail,
  Plus,
  Settings
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface LocalHousehold {
  id: string
  name: string
}

type SidebarUserMenuProps = {
  user: {
    imageUrl?: string
    fullName?: string | null
    firstName?: string | null
    email?: string
  }
  households?: LocalHousehold[]
  selectedHouseholdId: string | null
  onSelectHousehold: (id: string) => void
  onCreateHousehold: () => void
  onEditHousehold: () => void
  onShowInvitations: () => void
  onSignOut: () => void
}

export function SidebarUserMenu({
  user,
  households,
  selectedHouseholdId,
  onSelectHousehold,
  onCreateHousehold,
  onEditHousehold,
  onShowInvitations,
  onSignOut
}: SidebarUserMenuProps) {
  const { t } = useTranslation()
  const userInitials =
    user.fullName
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') ||
    user.firstName?.slice(0, 2).toUpperCase() ||
    'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 p-4 text-left outline-hidden transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-purple-800"
        >
          <Avatar className="size-12">
            <AvatarImage
              src={user.imageUrl}
              alt={user.fullName ?? t('dashboard.userAlt')}
            />
            <AvatarFallback className="bg-cyan-300 text-white">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <p
              className="truncate leading-5 text-black"
              style={{
                fontFamily: 'var(--font-nunito-sans)',
                fontSize: '1rem',
                fontWeight: 700
              }}
            >
              {user.fullName}
            </p>
            <p
              className="truncate leading-4 text-gray-800"
              style={{
                fontFamily: 'var(--font-nunito-sans)',
                fontSize: '0.75rem',
                fontWeight: 500
              }}
            >
              {user.email}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        align="start"
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.fullName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ChevronsUpDown className="size-4" />
              <span>{t('dashboard.switchHousehold')}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="p-0">
              {households && households.length > 0 && (
                <>
                  {households.map((household) => (
                    <DropdownMenuItem
                      key={household.id}
                      onClick={() => onSelectHousehold(household.id)}
                    >
                      <Check
                        className={`size-4 ${
                          selectedHouseholdId === household.id
                            ? 'opacity-100'
                            : 'opacity-0'
                        }`}
                      />
                      {household.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={onCreateHousehold}>
                <Plus className="size-4" />
                <span>{t('forms.createHousehold')}</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={onEditHousehold}>
            <Settings className="size-4" />
            <span>{t('forms.editHousehold')}</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onShowInvitations}>
            <Mail className="size-4" />
            <span>{t('forms.invitations')}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="size-4" />
          <span>{t('dashboard.signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
