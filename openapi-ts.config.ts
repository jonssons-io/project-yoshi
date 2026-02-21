import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
	input: './src/api/luigi.yaml',
	output: {
		path: './src/api/generated'
	},
	plugins: [
		'@hey-api/typescript',
		{
			name: '@hey-api/sdk',
			auth: true,
			validator: 'zod'
		},
		{
			name: 'zod'
		},
		{
			name: '@tanstack/react-query',
			queryOptions: true,
			infiniteQueryOptions: true,
			mutationOptions: true,
			queryKeys: true,
			infiniteQueryKeys: true
		}
	]
})
