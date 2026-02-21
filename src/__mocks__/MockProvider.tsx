import { useEffect, useState } from 'react'

type MockProviderProps = {
	children: React.ReactNode
}

export function MockProvider({ children }: MockProviderProps) {
	const [ready, setReady] = useState(import.meta.env.VITE_MOCK_API !== 'true')

	useEffect(() => {
		let mounted = true
		if (import.meta.env.VITE_MOCK_API === 'true') {
			import('./init')
				.then((module) => module.initMocks())
				.then(() => {
					if (mounted) {
						setReady(true)
					}
				})
		}
		return () => {
			mounted = false
		}
	}, [])

	if (!ready) {
		return null
	}

	return <>{children}</>
}
