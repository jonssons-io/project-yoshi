import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Card as CardWrapper
} from '@/components/ui/card'

interface CardProps {
	title?: string
	description?: string
	children: React.ReactNode
}

export const Card = ({ title, description, children }: CardProps) => {
	return (
		<CardWrapper>
			<CardHeader>
				{title && <CardTitle>{title}</CardTitle>}
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent>{children}</CardContent>
		</CardWrapper>
	)
}
