import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/sign-in/sso-callback')({
	component: SSOCallback
})

function SSOCallback() {
	const { t } = useTranslation()
	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="text-center">
				<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
				<p className="mt-4 text-muted-foreground">
					{t('auth.completingSignIn')}
				</p>
			</div>
		</div>
	)
}
