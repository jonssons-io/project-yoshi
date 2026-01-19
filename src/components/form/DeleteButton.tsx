/**
 * DeleteButton component for TanStack Form
 *
 * A pre-bound destructive button for delete actions in forms.
 * Only renders when onDelete is provided.
 */

import { Button } from "@/components/ui/button";

export interface DeleteButtonProps {
	/**
	 * Callback when delete is clicked
	 */
	onDelete?: () => void;

	/**
	 * Button text
	 * @default "Delete"
	 */
	children?: React.ReactNode;

	/**
	 * Button size
	 * @default "default"
	 */
	size?: React.ComponentProps<typeof Button>["size"];

	/**
	 * Additional props to pass to the Button component
	 */
	buttonProps?: Omit<
		React.ComponentProps<typeof Button>,
		"type" | "onClick" | "children" | "variant"
	>;
}

export function DeleteButton({
	onDelete,
	children = "Delete",
	size = "default",
	buttonProps,
}: DeleteButtonProps) {
	if (!onDelete) {
		return null;
	}

	return (
		<Button
			type="button"
			variant="destructive"
			size={size}
			onClick={onDelete}
			className="mr-auto"
			{...buttonProps}
		>
			{children}
		</Button>
	);
}
