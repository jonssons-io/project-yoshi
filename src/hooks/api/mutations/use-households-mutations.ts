import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { useTRPC } from "@/integrations/trpc/react";
import type { TRPCRouter } from "@/integrations/trpc/router";

type RouterInputs = inferRouterInputs<TRPCRouter>;
type RouterOutputs = inferRouterOutputs<TRPCRouter>;

/**
 * Hook to create a new household
 */
export function useCreateHousehold(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["households"]["create"],
    variables: RouterInputs["households"]["create"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.households.create.mutationOptions({
      onSuccess: async (data, variables) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.households.list.queryKey({ userId: variables.userId }),
        });
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}

/**
 * Hook to update an existing household
 */
export function useUpdateHousehold(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["households"]["update"],
    variables: RouterInputs["households"]["update"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.households.update.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.households.list.queryKey({ userId: variables.userId }),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.households.getById.queryKey({
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
 * Hook to delete a household
 * Invalidates ALL query keys since a household contains budgets, categories, accounts,
 * and all child data (transactions, bills)
 */
export function useDeleteHousehold(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["households"]["delete"],
    variables: RouterInputs["households"]["delete"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.households.delete.mutationOptions({
      onSuccess: async (data, variables) => {
        // Must invalidate all queries since household deletion cascades to:
        // - Budgets -> Transactions, Bills
        // - Categories
        // - Accounts
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.households.list.queryKey({ userId: variables.userId }),
          }),
          queryClient.invalidateQueries({
            queryKey: ["budgets"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: ["categories"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: ["accounts"],
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
 * Hook to add a user to a household
 */
export function useAddHouseholdUser(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["households"]["addUser"],
    variables: RouterInputs["households"]["addUser"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.households.addUser.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.households.list.queryKey({ userId: variables.userId }),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.households.getById.queryKey({
              id: variables.householdId,
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
 * Hook to remove a user from a household
 */
export function useRemoveHouseholdUser(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["households"]["removeUser"],
    variables: RouterInputs["households"]["removeUser"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.households.removeUser.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.households.list.queryKey({ userId: variables.userId }),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.households.getById.queryKey({
              id: variables.householdId,
              userId: variables.userId,
            }),
          }),
        ]);
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}
