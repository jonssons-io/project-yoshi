import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAccountsList, useDeleteAccount } from "@/hooks/api";
import { AccountRow } from "./AccountsTableRow";

const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount);
};

export const AccountsTable = ({
	userId,
	selectedHouseholdId,
	setEditingAccountId,
}: {
	userId: string;
	selectedHouseholdId: string;
	setEditingAccountId: (id: string) => void;
}) => {
	const { data: accounts, refetch } = useAccountsList({
		householdId: selectedHouseholdId,
		userId,
	});

	const { mutate: deleteAccount } = useDeleteAccount({
		onSuccess: () => {
			refetch();
		},
	});

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>External ID</TableHead>
					<TableHead className="text-right">Initial Balance</TableHead>
					<TableHead className="text-right">Current Balance</TableHead>
					<TableHead>Transactions</TableHead>
					<TableHead className="text-right">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{accounts?.map((account) => (
					<AccountRow
						key={account.id}
						account={account}
						userId={userId}
						onEdit={(acc) => setEditingAccountId(acc.id)}
						onDelete={deleteAccount}
						formatCurrency={formatCurrency}
					/>
				))}
			</TableBody>
		</Table>
	);
};
