import { useLocation } from '@tanstack/react-router'

// Route path to human-readable label mapping
const routeLabels: Record<string, string> = {
	'/': 'Dashboard',
	'/accounts': 'Accounts',
	'/budgets': 'Budgets',
	'/transactions': 'Transactions',
	'/bills': 'Bills',
	'/categories': 'Categories'
}

export interface BreadcrumbItem {
	label: string
	path: string
	isLast: boolean
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
	// Remove trailing slash and split
	const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean)

	const crumbs: BreadcrumbItem[] = []

	// Always start with Dashboard
	crumbs.push({
		label: 'Dashboard',
		path: '/',
		isLast: segments.length === 0
	})

	// Build up the path progressively
	let currentPath = ''
	for (let i = 0; i < segments.length; i++) {
		currentPath += `/${segments[i]}`
		const label = routeLabels[currentPath] || segments[i].replace(/-/g, ' ')
		crumbs.push({
			label: label.charAt(0).toUpperCase() + label.slice(1),
			path: currentPath,
			isLast: i === segments.length - 1
		})
	}

	return crumbs
}

export function useBreadcrumbs(): BreadcrumbItem[] {
	const location = useLocation()
	return getBreadcrumbs(location.pathname)
}
