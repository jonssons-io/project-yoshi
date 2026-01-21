import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-up/sso-callback')({
	component: SSOCallback
})

function SSOCallback() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="text-center">
				<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
				<p className="mt-4 text-muted-foreground">Completing sign up...</p>
			</div>
		</div>
	)
}
