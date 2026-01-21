/**
 * ComboboxField component for TanStack Form
 *
 * A searchable dropdown that allows:
 * - Selecting from existing options
 * - Typing to filter options
 * - Creating new items when no match exists
 */

import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useFieldContext } from "@/hooks/form";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
	value: string;
	label: string;
}

/**
 * Value can be either:
 * - A string ID (existing item selected)
 * - An object with isNew flag (new item to create)
 */
export type ComboboxValue = string | { isNew: true; name: string } | null;

export interface ComboboxFieldProps {
	/**
	 * Label text for the field
	 */
	label: string;

	/**
	 * Optional description text shown below the label
	 */
	description?: string;

	/**
	 * Optional placeholder text
	 */
	placeholder?: string;

	/**
	 * Placeholder for the search input
	 */
	searchPlaceholder?: string;

	/**
	 * Text shown when no options match the search
	 */
	emptyText?: string;

	/**
	 * Whether the field is disabled
	 */
	disabled?: boolean;

	/**
	 * Available options to select from
	 */
	options: ComboboxOption[];

	/**
	 * Whether to allow creating new items
	 */
	allowCreate?: boolean;

	/**
	 * Label for the create option (e.g., "Create category")
	 */
	createLabel?: string;
}

export function ComboboxField({
	label,
	description,
	placeholder = "Select an option",
	searchPlaceholder = "Search...",
	emptyText = "No results found.",
	disabled,
	options,
	allowCreate = false,
	createLabel = "Create",
}: ComboboxFieldProps) {
	const field = useFieldContext<ComboboxValue>();
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");

	const hasError =
		field.state.meta.isTouched && field.state.meta.errors.length > 0;

	// Get display value based on current field value
	const getDisplayValue = (): string => {
		const value = field.state.value;
		if (!value) return "";

		if (typeof value === "string") {
			const option = options.find((opt) => opt.value === value);
			return option?.label ?? "";
		}

		if (typeof value === "object" && value.isNew) {
			return value.name;
		}

		return "";
	};

	// Check if the search term exactly matches an existing option
	const exactMatch = options.find(
		(opt) => opt.label.toLowerCase() === searchValue.toLowerCase(),
	);

	// Filter options based on search
	const filteredOptions = options.filter((opt) =>
		opt.label.toLowerCase().includes(searchValue.toLowerCase()),
	);

	// Should show create option?
	const showCreateOption =
		allowCreate && searchValue.trim() !== "" && !exactMatch;

	const handleSelect = (optionValue: string) => {
		field.handleChange(optionValue);
		setOpen(false);
		setSearchValue("");
	};

	const handleCreate = () => {
		field.handleChange({ isNew: true, name: searchValue.trim() });
		setOpen(false);
		setSearchValue("");
	};

	const displayValue = getDisplayValue();
	const isNewValue =
		typeof field.state.value === "object" && field.state.value?.isNew;

	return (
		<Field data-invalid={hasError || undefined}>
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldDescription>{description}</FieldDescription>}

				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							id={field.name}
							variant="outline"
							aria-expanded={open}
							className={cn(
								"w-full justify-between font-normal",
								!displayValue && "text-muted-foreground",
							)}
							disabled={disabled}
						>
							<span className="truncate">
								{displayValue ? (
									<span className="flex items-center gap-2">
										{isNewValue && (
											<span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
												New
											</span>
										)}
										{displayValue}
									</span>
								) : (
									placeholder
								)}
							</span>
							<ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-(--radix-popover-trigger-width) p-0">
						<Command shouldFilter={false}>
							<CommandInput
								placeholder={searchPlaceholder}
								value={searchValue}
								onValueChange={setSearchValue}
							/>
							<CommandList>
								{filteredOptions.length === 0 && !showCreateOption && (
									<CommandEmpty>{emptyText}</CommandEmpty>
								)}

								{filteredOptions.length > 0 && (
									<CommandGroup>
										{filteredOptions.map((option) => (
											<CommandItem
												key={option.value}
												value={option.value}
												onSelect={handleSelect}
											>
												<CheckIcon
													className={cn(
														"mr-2 h-4 w-4",
														field.state.value === option.value
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												{option.label}
											</CommandItem>
										))}
									</CommandGroup>
								)}

								{showCreateOption && (
									<CommandGroup>
										<CommandItem
											value={`create-${searchValue}`}
											onSelect={handleCreate}
											className="text-primary"
										>
											<PlusIcon className="mr-2 h-4 w-4" />
											{createLabel} "{searchValue.trim()}"
										</CommandItem>
									</CommandGroup>
								)}
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>

				{hasError && (
					<FieldError>{field.state.meta.errors.join(", ")}</FieldError>
				)}
				{field.state.meta.isValidating && (
					<span className="text-sm text-muted-foreground">Validating...</span>
				)}
			</FieldContent>
		</Field>
	);
}
