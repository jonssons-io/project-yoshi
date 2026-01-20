/**
 * Categories page - Manage income and expense categories
 */

import { createFileRoute } from "@tanstack/react-router";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import {
	useBudgetsList,
	useCategoriesList,
	useCategoryById,
	useCreateCategory,
	useDeleteCategory,
	useUpdateCategory,
} from "@/hooks/api";

export const Route = createFileRoute("/_authenticated/categories/")({
	component: CategoriesPage,
});

function CategoriesPage() {
	const { userId, householdId } = useAuth();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
		null,
	);
	const [filter, setFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");

	// Fetch full category details when editing (including budget links)
	const { data: editingCategory } = useCategoryById({
		categoryId: editingCategoryId,
		userId,
		enabled: !!editingCategoryId,
	});

	const {
		data: categories,
		isLoading,
		refetch,
	} = useCategoriesList({
		householdId,
		userId,
		type: filter === "ALL" ? undefined : filter,
	});

	// Fetch budgets for linking when creating categories
	const { data: budgets } = useBudgetsList({
		householdId,
		userId,
	});

	const { mutate: createCategory } = useCreateCategory({
		onSuccess: () => {
			refetch();
			setCreateDialogOpen(false);
		},
	});

	const { mutate: updateCategory } = useUpdateCategory({
		onSuccess: () => {
			refetch();
			setEditingCategoryId(null);
		},
	});

	const { mutate: deleteCategory } = useDeleteCategory({
		onSuccess: () => {
			refetch();
		},
		onError: (error) => {
			alert(
				error instanceof Error ? error.message : "Failed to delete category",
			);
		},
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center">
				<p className="text-muted-foreground">Loading categories...</p>
			</div>
		);
	}

	const incomeCount =
		categories?.filter((c) => c.type === "INCOME").length ?? 0;
	const expenseCount =
		categories?.filter((c) => c.type === "EXPENSE").length ?? 0;

	return (
		<div className="space-y-6">
			{/* Toolbar */}
			<div className="flex items-center justify-end gap-2">
				<div className="flex gap-2">
					<Button
						variant={filter === "ALL" ? "default" : "outline"}
						onClick={() => setFilter("ALL")}
						size="sm"
					>
						All ({categories?.length ?? 0})
					</Button>
					<Button
						variant={filter === "INCOME" ? "default" : "outline"}
						onClick={() => setFilter("INCOME")}
						size="sm"
					>
						Income ({incomeCount})
					</Button>
					<Button
						variant={filter === "EXPENSE" ? "default" : "outline"}
						onClick={() => setFilter("EXPENSE")}
						size="sm"
					>
						Expenses ({expenseCount})
					</Button>
				</div>

				<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<PlusIcon className="mr-2 h-4 w-4" />
							Add Category
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create New Category</DialogTitle>
							<DialogDescription>
								Add a new income or expense category
							</DialogDescription>
						</DialogHeader>
						<CategoryForm
							onSubmit={async (data) => {
								createCategory({
									...data,
									householdId,
									userId,
								});
							}}
							onCancel={() => setCreateDialogOpen(false)}
							submitLabel="Create Category"
							budgets={budgets ?? []}
						/>
					</DialogContent>
				</Dialog>
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
						<Button onClick={() => setCreateDialogOpen(true)}>
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
										<Badge
											variant={
												category.type === "INCOME" ? "default" : "secondary"
											}
										>
											{category.type}
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
															`Cannot delete "${category.name}" because it has ${category._count.transactions} transaction(s). Please reassign or delete those transactions first.`,
														);
														return;
													}
													if (
														confirm(
															`Are you sure you want to delete "${category.name}"?`,
														)
													) {
														deleteCategory({
															id: category.id,
															userId,
														});
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

			{/* Edit Category Dialog */}
			<Dialog
				open={!!editingCategoryId}
				onOpenChange={(open) => !open && setEditingCategoryId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Category</DialogTitle>
						<DialogDescription>
							Update category information and budget access
						</DialogDescription>
					</DialogHeader>
					{editingCategory && (
						<CategoryForm
							defaultValues={{
								name: editingCategory.name,
								type: editingCategory.type,
								budgetIds: editingCategory.budgets.map((b) => b.budgetId),
							}}
							onSubmit={async (data) => {
								updateCategory({
									id: editingCategory.id,
									userId,
									...data,
								});
							}}
							onCancel={() => setEditingCategoryId(null)}
							submitLabel="Update Category"
							budgets={budgets ?? []}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
