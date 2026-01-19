import { PlusIcon } from "lucide-react";
import { HouseholdForm } from "@/forms/HouseholdForm";
import { useCreateHousehold } from "@/hooks/api";
import { useDrawer } from "@/hooks/use-drawer";
import { useSelectedHousehold } from "@/hooks/use-selected-household";
import { Card } from "../card/Card";
import { Button } from "../ui/button";

export const NoHousehold = ({ userId }: { userId: string }) => {
	const { openDrawer, closeDrawer } = useDrawer();
	const { setSelectedHousehold } = useSelectedHousehold(userId);

	const { mutate: createHousehold } = useCreateHousehold({
		onSuccess: (household) => {
			setSelectedHousehold(household.id);
			closeDrawer();
		},
	});

	const handleCreateHousehold = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Create Your First Household</h2>
				<p className="text-muted-foreground mb-6">
					A household is a shared space for managing budgets and finances
					together.
				</p>
				<HouseholdForm
					onSubmit={(data) => {
						createHousehold({
							name: data.name,
							userId,
						});
					}}
					onCancel={closeDrawer}
					submitLabel="Create Household"
				/>
			</div>,
			"Create Household",
		);
	};

	return (
		<div className="container py-8 flex items-center justify-center">
			<Card
				title="Welcome to Your Budget App!"
				description="Get started by creating your first household"
			>
				<Button onClick={handleCreateHousehold}>
					<PlusIcon className="mr-2 h-4 w-4" />
					Create Your First Household
				</Button>
			</Card>
		</div>
	);
};
