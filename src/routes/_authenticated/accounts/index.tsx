/**
 * Accounts page - Manage financial accounts
 */

import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/card/Card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { AccountForm } from "@/forms/AccountForm";
import {
	useAccountById,
	useAccountsList,
	useBudgetsList,
	useCreateAccount,
	useUpdateAccount,
} from "@/hooks/api";
import { useDrawer } from "@/hooks/use-drawer";
import { AccountsTable } from "./-components/AccountsTable";

export const Route = createFileRoute("/_authenticated/accounts/")({
	component: AccountsPage,
});

function AccountsPage() {
	const { userId, householdId } = useAuth();
	const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
	const { openDrawer, closeDrawer } = useDrawer();

	// Fetch full account details when editing (including budget links)
	const { data: editingAccount } = useAccountById({
		accountId: editingAccountId,
		userId,
	});

	const {
		data: accounts,
		isLoading,
		refetch,
	} = useAccountsList({
		householdId,
		userId,
	});

	// Fetch budgets for linking when creating accounts
	const { data: budgets } = useBudgetsList({
		householdId,
		userId,
	});

	const { mutate: createAccount } = useCreateAccount({
		onSuccess: () => {
			refetch();
			closeDrawer();
		},
	});

	const { mutate: updateAccount } = useUpdateAccount({
		onSuccess: () => {
			refetch();
			setEditingAccountId(null);
			closeDrawer();
		},
	});

	const handleEditAccount = () => {
		if (!editingAccount) return;

		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Edit Account</h2>
				<p className="text-muted-foreground mb-6">
					Update account information and budget access
				</p>
				<AccountForm
					defaultValues={{
						name: editingAccount.name,
						externalIdentifier: editingAccount.externalIdentifier ?? "",
						initialBalance: editingAccount.initialBalance,
						budgetIds: editingAccount.budgets.map((b) => b.budgetId),
					}}
					onSubmit={async (data) => {
						updateAccount({
							id: editingAccount.id,
							userId,
							...data,
						});
					}}
					onCancel={() => {
						setEditingAccountId(null);
						closeDrawer();
					}}
					submitLabel="Update Account"
					budgets={budgets ?? []}
				/>
			</div>,
			"Edit Account",
		);
	};

	// Open drawer when editingAccountId is set
	useEffect(() => {
		if (editingAccountId && editingAccount) {
			handleEditAccount();
		}
	}, [editingAccountId, editingAccount, handleEditAccount]);

	const handleCreateAccount = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Create New Account</h2>
				<p className="text-muted-foreground mb-6">
					Add a new financial account to track
				</p>
				<AccountForm
					onSubmit={async (data) => {
						createAccount({
							...data,
							householdId,
							userId,
						});
					}}
					onCancel={closeDrawer}
					submitLabel="Create Account"
					budgets={budgets ?? []}
				/>
			</div>,
			"Create Account",
		);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center">
				<p className="text-muted-foreground">Loading accounts...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Toolbar */}
			<div className="flex items-center justify-end">
				<Button onClick={handleCreateAccount}>
					<PlusIcon className="mr-2 h-4 w-4" />
					Add Account
				</Button>
			</div>

			{accounts?.length === 0 ? (
				<Card
					title="No accounts yet"
					description="Get started by creating your first account"
				>
					<Button onClick={handleCreateAccount}>
						<PlusIcon className="mr-2 h-4 w-4" />
						Create Your First Account
					</Button>
				</Card>
			) : (
				<Card>
					<AccountsTable
						userId={userId}
						selectedHouseholdId={householdId}
						setEditingAccountId={setEditingAccountId}
					/>
				</Card>
			)}
		</div>
	);
}
