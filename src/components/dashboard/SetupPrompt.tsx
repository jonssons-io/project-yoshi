import { PlusIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { HouseholdForm } from "@/forms/HouseholdForm";
import { AccountForm } from "@/forms/AccountForm";
import { BudgetForm } from "@/forms/BudgetForm";
import { useHouseholdContext } from "@/contexts/household-context";
import {
  useBudgetsList,
  useCreateAccount,
  useCreateBudget,
  useCreateHousehold,
} from "@/hooks/api";
import { useDrawer } from "@/hooks/use-drawer";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Illustration,
  type IllustrationVariant,
} from "../illustrations/Illustration";

export type SetupPromptVariant = "no-household" | "no-budget" | "no-account";

type SetupPromptConfig = {
  titleKey: string;
  descriptionKey: string;
  buttonKey: string;
};

type SetupPromptProps = {
  variant: SetupPromptVariant;
  onCompleted?: () => void;
};

const SETUP_PROMPT_CONFIG: Record<SetupPromptVariant, SetupPromptConfig> = {
  "no-household": {
    titleKey: "setup.noHouseholdTitle",
    descriptionKey: "setup.noHouseholdDescription",
    buttonKey: "setup.noHouseholdButton",
  },
  "no-budget": {
    titleKey: "setup.noBudgetTitle",
    descriptionKey: "setup.noBudgetDescription",
    buttonKey: "setup.noBudgetButton",
  },
  "no-account": {
    titleKey: "setup.noAccountTitle",
    descriptionKey: "setup.noAccountDescription",
    buttonKey: "setup.noAccountButton",
  },
};

const ILLUSTRATIONS_MAP: Record<SetupPromptVariant, IllustrationVariant> = {
  "no-household": "pana-no-household",
  "no-budget": "pana-no-budget",
  "no-account": "pana-no-account",
};

/**
 * Reusable setup state shown on dashboard before the user has:
 * household -> budget -> account.
 */
export function SetupPrompt({ variant, onCompleted }: SetupPromptProps) {
  const { t } = useTranslation();
  const { userId, selectedHouseholdId } = useHouseholdContext();
  const { openDrawer, closeDrawer } = useDrawer();

  const { data: budgets } = useBudgetsList({
    householdId: selectedHouseholdId,
    userId,
    enabled: variant === "no-account",
  });

  const { mutate: createHousehold } = useCreateHousehold({
    onSuccess: () => {
      onCompleted?.();
      closeDrawer();
    },
  });

  const { mutate: createBudget } = useCreateBudget({
    onSuccess: () => {
      onCompleted?.();
      closeDrawer();
    },
  });

  const { mutate: createAccount } = useCreateAccount({
    onSuccess: () => {
      onCompleted?.();
      closeDrawer();
    },
  });

  const config = SETUP_PROMPT_CONFIG[variant];

  const isActionDisabled = useMemo(() => {
    if (variant === "no-household") return false;
    return !selectedHouseholdId;
  }, [variant, selectedHouseholdId]);

  const handleOpenSetupDrawer = () => {
    if (variant === "no-household") {
      openDrawer(
        <div className="p-4">
          <h2 className="mb-4 text-2xl font-bold">{t(config.titleKey)}</h2>
          <p className="mb-6 text-muted-foreground">
            {t(config.descriptionKey)}
          </p>
          <HouseholdForm
            onSubmit={(data) => {
              createHousehold({
                name: data.name,
                userId,
              });
            }}
            onCancel={closeDrawer}
            submitLabel={t(config.buttonKey)}
          />
        </div>,
        t(config.buttonKey),
      );
      return;
    }

    if (!selectedHouseholdId) return;

    if (variant === "no-budget") {
      openDrawer(
        <div className="p-4">
          <h2 className="mb-4 text-2xl font-bold">{t(config.titleKey)}</h2>
          <p className="mb-6 text-muted-foreground">
            {t(config.descriptionKey)}
          </p>
          <BudgetForm
            onSubmit={(data) => {
              createBudget({
                name: data.name,
                startDate: data.startDate,
                householdId: selectedHouseholdId,
                userId,
              });
            }}
            onCancel={closeDrawer}
            submitLabel={t(config.buttonKey)}
          />
        </div>,
        t(config.buttonKey),
      );
      return;
    }

    openDrawer(
      <div className="p-4">
        <h2 className="mb-4 text-2xl font-bold">{t(config.titleKey)}</h2>
        <p className="mb-6 text-muted-foreground">{t(config.descriptionKey)}</p>
        <AccountForm
          onSubmit={(data) => {
            createAccount({
              ...data,
              householdId: selectedHouseholdId,
              userId,
            });
          }}
          onCancel={closeDrawer}
          submitLabel={t(config.buttonKey)}
          budgets={budgets ?? []}
        />
      </div>,
      t(config.buttonKey),
    );
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-xl">
        <CardHeader className="items-center text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-42 w-42 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 bg-muted/40 text-xs text-muted-foreground">
              <Illustration variant={ILLUSTRATIONS_MAP[variant]} />
            </div>
          </div>
          <CardTitle>{t(config.titleKey)}</CardTitle>
          <CardDescription>{t(config.descriptionKey)}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button disabled={isActionDisabled} onClick={handleOpenSetupDrawer}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t(config.buttonKey)}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
