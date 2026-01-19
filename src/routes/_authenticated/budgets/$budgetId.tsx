/**
 * Budget detail page - View and manage a specific budget
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useBudgetById } from "@/hooks/api";

export const Route = createFileRoute("/_authenticated/budgets/$budgetId")({
	component: BudgetDetailPage,
});

function BudgetDetailPage() {
	const { budgetId } = Route.useParams();
	const { userId } = useAuth();

	const { data: budget, isLoading } = useBudgetById({
		budgetId,
		userId,
		enabled: true,
	});

	if (isLoading) {
		return (
			<div className="container">
				<div className="flex items-center justify-center">
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	if (!budget) {
		return (
			<div className="container">
				<Card>
					<CardHeader>
						<CardTitle>Budget Not Found</CardTitle>
						<CardDescription>
							The budget you're looking for doesn't exist or you don't have
							access to it.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild>
							<Link to="/budgets">Back to Budgets</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container">
			<div className="mb-6">
				<Button asChild variant="ghost" size="sm" className="mb-4">
					<Link to="/budgets">
						<ArrowLeftIcon className="mr-2 h-4 w-4" />
						Back to Budgets
					</Link>
				</Button>
				<h1 className="text-3xl font-bold">{budget.name}</h1>
				<p className="text-muted-foreground">
					Started {format(new Date(budget.startDate), "PPP")}
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Transactions</CardTitle>
						<CardDescription>Income and expenses</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="text-4xl font-bold">
								{budget._count.transactions}
							</div>
							<Button asChild className="w-full">
								<Link to="/transactions" search={{ budgetId }}>
									View Transactions
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Bills</CardTitle>
						<CardDescription>Recurring and one-time bills</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="text-4xl font-bold">
								{budget._count.bills || 0}
							</div>
							<Button asChild className="w-full">
								<Link to="/bills" search={{ budgetId }}>
									Manage Bills
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="mt-6">
				<Card>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
						<CardDescription>Manage your budget data</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-2">
							<Button asChild>
								<Link to="/transactions" search={{ budgetId }}>
									Add Transaction
								</Link>
							</Button>
							<Button asChild variant="outline">
								<Link to="/bills" search={{ budgetId }}>
									Add Bill
								</Link>
							</Button>
							<Button asChild variant="outline">
								<Link to="/categories">Manage Categories</Link>
							</Button>
							<Button asChild variant="outline">
								<Link to="/accounts">Manage Accounts</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
