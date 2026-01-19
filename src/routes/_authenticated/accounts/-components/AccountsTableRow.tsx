import { PencilIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { useAccountBalance } from "@/hooks/api";

interface Account {
	id: string;
	name: string;
	externalIdentifier: string | null;
	initialBalance: number;
	_count: { transactions: number };
}

interface AccountRowProps {
	account: Account;
	userId: string;
	onEdit: (account: Account) => void;
	onDelete: (data: { id: string; userId: string }) => void;
	formatCurrency: (amount: number) => string;
}

export const AccountRow = ({
	account,
	userId,
	onEdit,
	onDelete,
	formatCurrency,
}: AccountRowProps) => {
	const { data: balance } = useAccountBalance({
		accountId: account.id,
		userId,
	});

	return (
		<TableRow>
			<TableCell className="font-medium">{account.name}</TableCell>
			<TableCell className="text-muted-foreground">
				{account.externalIdentifier || "—"}
			</TableCell>
			<TableCell className="text-right">
				{formatCurrency(account.initialBalance)}
			</TableCell>
			<TableCell className="text-right font-medium">
				{balance ? formatCurrency(balance.currentBalance) : "..."}
			</TableCell>
			<TableCell>{account._count.transactions}</TableCell>
			<TableCell className="text-right">
				<div className="flex justify-end gap-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={() =>
							onEdit({
								id: account.id,
								name: account.name,
								externalIdentifier: account.externalIdentifier,
								initialBalance: account.initialBalance,
								_count: account._count,
							})
						}
					>
						<PencilIcon className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => {
							if (account._count.transactions > 0) {
								alert(
									`Cannot delete "${account.name}" because it has ${account._count.transactions} transaction(s). Please reassign or delete those transactions first.`,
								);
								return;
							}
							if (
								confirm(`Are you sure you want to delete "${account.name}"?`)
							) {
								onDelete({
									id: account.id,
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
	);
};
