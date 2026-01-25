/**
 * Categories page - Manage income and expense categories
 */

import { createFileRoute } from '@tanstack/react-router'
import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CategoryForm } from '@/components/categories/CategoryForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { useAuth } from '@/contexts/auth-context'
import {
	useBudgetsList,
	useCategoriesList,
	useCategoryById,
	useCreateCategory,
	useDeleteCategory,
	useUpdateCategory
} from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'

export const Route = createFileRoute('/_authenticated/categories/')({
	component: CategoriesPage
})

function CategoriesPage() {
	const { userId, householdId } = useAuth()
	const { openDrawer, closeDrawer } = useDrawer()
	const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
		null
	)
	const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')

	// Fetch full category details when editing (including budget links)
	const { data: editingCategory } = useCategoryById({
		categoryId: editingCategoryId,
		userId,
		enabled: !!editingCategoryId
	})

	const { data: categories, refetch } = useCategoriesList({
		householdId,
		userId,
		type: filter === 'ALL' ? undefined : filter
	})

	// Fetch budgets for linking when creating categories
	const { data: budgets } = useBudgetsList({
		householdId,
		userId
	})

	const { mutate: createCategory } = useCreateCategory({
		onSuccess: () => {
			refetch()
			closeDrawer()
		}
	})

	const { mutate: updateCategory } = useUpdateCategory({
		onSuccess: () => {
			refetch()
			closeDrawer()
			setEditingCategoryId(null)
		}
	})

	const { mutate: deleteCategory } = useDeleteCategory({
		onSuccess: () => {
			refetch()
		},
		onError: (error) => {
			alert(
				error instanceof Error ? error.message : 'Failed to delete category'
			)
		}
	})

	const handleCreate = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Create New Category</h2>
				<p className="text-muted-foreground mb-6">
					Add a new income or expense category
				</p>
				<CategoryForm
					onSubmit={async (data) => {
						createCategory({
							...data,
							householdId,
							userId
						})
					}}
					onCancel={closeDrawer}
					submitLabel="Create Category"
					budgets={budgets ?? []}
				/>
			</div>,
			'Create Category'
		)
	}

	// Open drawer when editingCategoryId is set and data is loaded
	useEffect(() => {
		if (editingCategoryId && editingCategory) {
			openDrawer(
				<div className="p-4">
					<h2 className="text-2xl font-bold mb-4">Edit Category</h2>
					<p className="text-muted-foreground mb-6">
						Update category information and budget access
					</p>
					<CategoryForm
						defaultValues={{
							name: editingCategory.name,
							types: editingCategory.types,
							budgetIds: editingCategory.budgets.map((b) => b.budgetId)
						}}
						onSubmit={async (data) => {
							updateCategory({
								id: editingCategory.id,
								userId,
								...data
							})
						}}
						onCancel={() => {
							closeDrawer()
							setEditingCategoryId(null)
						}}
						submitLabel="Update Category"
						budgets={budgets ?? []}
					/>
				</div>,
				'Edit Category'
			)
		}
	}, [
		editingCategoryId,
		editingCategory,
		openDrawer,
		closeDrawer,
		updateCategory,
		userId,
		budgets
	])

	const incomeCount =
		categories?.filter((c) => c.types.includes('INCOME')).length ?? 0
	const expenseCount =
		categories?.filter((c) => c.types.includes('EXPENSE')).length ?? 0

	return (
		<div className="space-y-6">
			{/* Toolbar */}
			<div className="flex items-center justify-end gap-2">
				<div className="flex gap-2">
					<Button
						variant={filter === 'ALL' ? 'default' : 'outline'}
						onClick={() => setFilter('ALL')}
						size="sm"
					>
						All ({categories?.length ?? 0})
					</Button>
					<Button
						variant={filter === 'INCOME' ? 'default' : 'outline'}
						onClick={() => setFilter('INCOME')}
						size="sm"
					>
						Income ({incomeCount})
					</Button>
					<Button
						variant={filter === 'EXPENSE' ? 'default' : 'outline'}
						onClick={() => setFilter('EXPENSE')}
						size="sm"
					>
						Expenses ({expenseCount})
					</Button>
				</div>

				<Button onClick={handleCreate}>
					<PlusIcon className="mr-2 h-4 w-4" />
					Add Category
				</Button>
			</div>

			{categories?.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>No categories yet</CardTitle>
						<CardDescription>
							Get started by creating your first category
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={handleCreate}>
							<PlusIcon className="mr-2 h-4 w-4" />
							Create Your First Category
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Transactions</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{categories?.map((category) => (
								<TableRow key={category.id}>
									<TableCell className="font-medium">{category.name}</TableCell>
									<TableCell>
										<Badge variant="outline">
											{category.types
												.map(
													(t) =>
														t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
												)
												.join(' & ')}
										</Badge>
									</TableCell>
									<TableCell>{category._count.transactions}</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-2">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => setEditingCategoryId(category.id)}
											>
												<PencilIcon className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													if (category._count.transactions > 0) {
														alert(
															`Cannot delete "${category.name}" because it has ${category._count.transactions} transaction(s). Please reassign or delete those transactions first.`
														)
														return
													}
													if (
														confirm(
															`Are you sure you want to delete "${category.name}"?`
														)
													) {
														deleteCategory({
															id: category.id,
															userId
														})
													}
												}}
											>
												<TrashIcon className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>
			)}
		</div>
	)
}
