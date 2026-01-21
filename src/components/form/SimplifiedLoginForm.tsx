/**
 * Simplified form example using validation helpers
 *
 * This demonstrates how the validation helpers make forms cleaner
 */

import { z } from 'zod'
import { useAppForm } from '@/hooks/form'
import {
	createAsyncValidator,
	createZodValidator,
	validateForm
} from '@/lib/form-validation'

const loginSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters')
})

export function SimplifiedLoginForm() {
	const form = useAppForm({
		defaultValues: {
			email: '',
			password: ''
		},
		onSubmit: async ({ value }) => {
			try {
				// validateForm throws if invalid, returns typed data if valid
				const data = validateForm(loginSchema, value)

				console.log('Valid login data:', data)
				// data is typed as { email: string; password: string }

				// TODO: Send to API
				alert(`Logging in as ${data.email}`)
			} catch (error) {
				console.error('Validation failed:', error)
			}
		}
	})

	return (
		<div className="mx-auto max-w-md space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-bold">Login</h1>
				<p className="text-muted-foreground mt-1">
					Example using validation helpers
				</p>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault()
					e.stopPropagation()
					form.handleSubmit()
				}}
				className="space-y-4"
			>
				{/* Email field with sync + async validation */}
				<form.AppField
					name="email"
					validators={{
						// Simple! No manual safeParse needed
						onChange: createZodValidator(loginSchema.shape.email),
						// Async validation made easy
						...createAsyncValidator(async (value: string) => {
							// Simulate checking if email exists
							await new Promise((resolve) => setTimeout(resolve, 300))

							if (value === 'notfound@example.com') {
								return 'This email is not registered'
							}

							return undefined
						}, 500)
					}}
				>
					{(field) => (
						<field.TextField
							label="Email"
							type="email"
							placeholder="you@example.com"
						/>
					)}
				</form.AppField>

				{/* Password field with simple validation */}
				<form.AppField
					name="password"
					validators={{
						onChange: createZodValidator(loginSchema.shape.password)
					}}
				>
					{(field) => (
						<field.TextField
							label="Password"
							type="password"
							placeholder="••••••••"
						/>
					)}
				</form.AppField>

				{/* Submit button */}
				<form.AppForm>
					<form.SubmitButton>Sign In</form.SubmitButton>
				</form.AppForm>
			</form>
		</div>
	)
}
