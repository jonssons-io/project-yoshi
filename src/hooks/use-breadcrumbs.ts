import { useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

// Route path to translation key mapping
const routeKeyMap: Record<string, string> = {
	'/': 'nav.dashboard',
	'/accounts': 'nav.accounts',
	'/budgets': 'nav.budgets',
	'/transactions': 'nav.transactions',
	'/income': 'nav.income',
	'/bills': 'nav.bills',
	'/categories': 'nav.categories',
	'/plan': 'nav.plan'
}

export interface BreadcrumbItem {
	label: string
	path: string
	isLast: boolean
}

function getBreadcrumbs(
	pathname: string,
	t: (key: string) => string
): BreadcrumbItem[] {
	// Remove trailing slash and split
	const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean)

	const crumbs: BreadcrumbItem[] = []

	// Always start with Dashboard/Home
	crumbs.push({
		label: t('nav.dashboard'),
		path: '/',
		isLast: segments.length === 0
	})

	// Build up the path progressively
	let currentPath = ''
	for (let i = 0; i < segments.length; i++) {
		currentPath += `/${segments[i]}`

		let label = ''
		if (routeKeyMap[currentPath]) {
			label = t(routeKeyMap[currentPath])
		} else {
			// Fallback: capitalize and replace hyphens
			const rawLabel = segments[i].replace(/-/g, ' ')
			label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
		}

		crumbs.push({
			label,
			path: currentPath,
			isLast: i === segments.length - 1
		})
	}

	return crumbs
}

export function useBreadcrumbs(): BreadcrumbItem[] {
	const location = useLocation()
	const { t } = useTranslation()
	return getBreadcrumbs(location.pathname, t)
}
