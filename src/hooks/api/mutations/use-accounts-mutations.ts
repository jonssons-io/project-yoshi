import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { useTRPC } from "@/integrations/trpc/react";
import type { TRPCRouter } from "@/integrations/trpc/router";

type RouterInputs = inferRouterInputs<TRPCRouter>;
type RouterOutputs = inferRouterOutputs<TRPCRouter>;

/**
 * Hook to create a new account
 */
export function useCreateAccount(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["accounts"]["create"],
    variables: RouterInputs["accounts"]["create"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.accounts.create.mutationOptions({
      onSuccess: async (data, variables) => {
        await queryClient.invalidateQueries({
          queryKey: ["accounts"],
          refetchType: "all",
        });
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}

/**
 * Hook to update an existing account
 */
export function useUpdateAccount(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["accounts"]["update"],
    variables: RouterInputs["accounts"]["update"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.accounts.update.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["accounts"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.accounts.getById.queryKey({
              id: variables.id,
              userId: variables.userId,
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.accounts.getBalance.queryKey({
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
 * Hook to delete an account
 * Note: Accounts cannot be deleted if transactions or bills reference them (Restrict policy)
 */
export function useDeleteAccount(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["accounts"]["delete"],
    variables: RouterInputs["accounts"]["delete"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.accounts.delete.mutationOptions({
      onSuccess: async (data, variables) => {
        await queryClient.invalidateQueries({
          queryKey: ["accounts"],
          refetchType: "all",
        });
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}
