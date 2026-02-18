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
import { Button } from '@/components/ui/button'
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

interface HeaderUserMenuProps {
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

export function HeaderUserMenu({
	user,
	households,
	selectedHouseholdId,
	onSelectHousehold,
	onCreateHousehold,
	onEditHousehold,
	onShowInvitations,
	onSignOut
}: HeaderUserMenuProps) {
	const { t } = useTranslation()

	const userInitials = user.firstName
		? user.firstName.slice(0, 2).toUpperCase()
		: 'U'

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="relative h-8 w-8 rounded-full cursor-pointer"
				>
					<Avatar className="h-8 w-8">
						<AvatarImage
							src={user.imageUrl}
							alt={user.fullName ?? t('dashboard.userAlt')}
						/>
						<AvatarFallback>{userInitials}</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
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
							<ChevronsUpDown className="mr-2 h-4 w-4" />
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
												className={`mr-2 h-4 w-4 ${
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
								<Plus className="mr-2 h-4 w-4" />
								<span>{t('forms.createHousehold')}</span>
							</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>

					<DropdownMenuItem onClick={onEditHousehold}>
						<Settings className="mr-2 h-4 w-4" />
						<span>{t('forms.editHousehold')}</span>
					</DropdownMenuItem>

					<DropdownMenuItem onClick={onShowInvitations}>
						<Mail className="mr-2 h-4 w-4" />
						<span>{t('forms.invitations')}</span>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={onSignOut}>
					<LogOut className="mr-2 h-4 w-4" />
					<span>{t('dashboard.signOut')}</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
