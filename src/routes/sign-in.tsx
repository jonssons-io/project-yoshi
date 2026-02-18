import { useClerk, useUser } from '@clerk/clerk-react'
import { SignIn } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/sign-in')({
	component: SignInPage
})

function SignInPage() {
	const { t } = useTranslation()
	const { user, isLoaded } = useUser()
	const { signOut } = useClerk()
	const [clientTime, setClientTime] = useState('')

	useEffect(() => {
		setClientTime(new Date().toLocaleString('sv-SE'))
	}, [])

	// If the user is loaded and exists, but we are on the sign-in page,
	// it means the server likely rejected the session (e.g., clock skew)
	// and redirected us here. We prevent the <SignIn /> component from
	// redirecting back to the app (causing a loop) and show a help message.
	if (isLoaded && user) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 text-center">
				<div className="max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm">
					<h1 className="text-xl font-bold text-destructive">
						{t('auth.clockSkewTitle')}
					</h1>
					<p className="text-muted-foreground">{t('auth.clockSkewDesc')}</p>

					<div className="rounded bg-muted p-3 text-left text-sm font-mono space-y-1">
						<div className="flex justify-between">
							<span>{`${t('auth.yourTime')}:`}</span>
							<span>{clientTime}</span>
						</div>
					</div>

					<p className="text-sm text-muted-foreground">
						{t('auth.instruction')}
					</p>

					<div className="flex gap-2 justify-center pt-2">
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 overflow-hidden cursor-pointer"
						>
							{t('auth.retry')}
						</button>
						<button
							type="button"
							onClick={() => signOut({ redirectUrl: '/sign-in' })}
							className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
						>
							{t('auth.signOut')}
						</button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<SignIn
				routing="path"
				path="/sign-in"
				signUpUrl="/sign-up"
				forceRedirectUrl="/"
			/>
		</div>
	)
}
