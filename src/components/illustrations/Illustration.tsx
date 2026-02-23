import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import PanaNoHousehold from "./PanaNoHousehold";
import PanaNoBudget from "./PanaNoBudget";
import PanaNoAccount from "./PanaNoAccount";

const ILLUSTRATION_COMPONENTS = {
  "pana-no-household": PanaNoHousehold,
  "pana-no-budget": PanaNoBudget,
  "pana-no-account": PanaNoAccount,
} as const;

export type IllustrationVariant = keyof typeof ILLUSTRATION_COMPONENTS;

type IllustrationProps = Omit<ComponentProps<"div">, "children"> & {
  variant: IllustrationVariant;
};

/**
 * Renders an illustration by variant and always fills its parent.
 */
export function Illustration({
  variant,
  className,
  ...props
}: IllustrationProps) {
  const SelectedIllustration = ILLUSTRATION_COMPONENTS[variant];

  return (
    <div className={cn("h-full w-full", className)} {...props}>
      <SelectedIllustration className="h-full w-full" />
    </div>
  );
}
