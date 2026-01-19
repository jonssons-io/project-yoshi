import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { useTRPC } from "@/integrations/trpc/react";
import type { TRPCRouter } from "@/integrations/trpc/router";

type RouterInputs = inferRouterInputs<TRPCRouter>;
type RouterOutputs = inferRouterOutputs<TRPCRouter>;

/**
 * Hook to create a new budget
 */
export function useCreateBudget(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["budgets"]["create"],
    variables: RouterInputs["budgets"]["create"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.budgets.create.mutationOptions({
      onSuccess: async (data, variables) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.budgets.list.queryKey({
            householdId: variables.householdId,
            userId: variables.userId,
          }),
        });
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}

/**
 * Hook to update an existing budget
 */
export function useUpdateBudget(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["budgets"]["update"],
    variables: RouterInputs["budgets"]["update"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.budgets.update.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["budgets"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.budgets.getById.queryKey({
              id: variables.id,
              userId: variables.userId,
            }),
          }),
        ]);
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}

/**
 * Hook to delete a budget
 * Invalidates budgets, transactions, and bills since they cascade on budget delete
 */
export function useDeleteBudget(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["budgets"]["delete"],
    variables: RouterInputs["budgets"]["delete"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.budgets.delete.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["budgets"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: ["transactions"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: ["bills"],
            refetchType: "all",
          }),
        ]);
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}

/**
 * Hook to link a category to a budget
 */
export function useLinkBudgetCategory(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["budgets"]["linkCategory"],
    variables: RouterInputs["budgets"]["linkCategory"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.budgets.linkCategory.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.budgets.getById.queryKey({
              id: variables.budgetId,
              userId: variables.userId,
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: ["categories"],
            refetchType: "all",
          }),
        ]);
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}

/**
 * Hook to unlink a category from a budget
 */
export function useUnlinkBudgetCategory(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["budgets"]["unlinkCategory"],
    variables: RouterInputs["budgets"]["unlinkCategory"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.budgets.unlinkCategory.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.budgets.getById.queryKey({
              id: variables.budgetId,
              userId: variables.userId,
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: ["categories"],
            refetchType: "all",
          }),
        ]);
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}

/**
 * Hook to link an account to a budget
 */
export function useLinkBudgetAccount(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["budgets"]["linkAccount"],
    variables: RouterInputs["budgets"]["linkAccount"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.budgets.linkAccount.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.budgets.getById.queryKey({
              id: variables.budgetId,
              userId: variables.userId,
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: ["accounts"],
            refetchType: "all",
          }),
        ]);
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}

/**
 * Hook to unlink an account from a budget
 */
export function useUnlinkBudgetAccount(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["budgets"]["unlinkAccount"],
    variables: RouterInputs["budgets"]["unlinkAccount"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.budgets.unlinkAccount.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.budgets.getById.queryKey({
              id: variables.budgetId,
              userId: variables.userId,
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: ["accounts"],
            refetchType: "all",
          }),
        ]);
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}
