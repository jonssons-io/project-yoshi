import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Format a number as currency (SEK)
 * @example formatCurrency(1234.56) // "1,234.56 SEK"
 */
export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('sv-SE', {
		style: 'currency',
		currency: 'SEK'
	}).format(amount)
}
