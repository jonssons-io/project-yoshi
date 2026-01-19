import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { useTRPC } from "@/integrations/trpc/react";
import type { TRPCRouter } from "@/integrations/trpc/router";

type RouterInputs = inferRouterInputs<TRPCRouter>;
type RouterOutputs = inferRouterOutputs<TRPCRouter>;

/**
 * Hook to create a new transaction
 */
export function useCreateTransaction(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["transactions"]["create"],
    variables: RouterInputs["transactions"]["create"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.transactions.create.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["transactions"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.accounts.getBalance.queryKey({
              id: variables.accountId,
              userId: variables.userId,
            }),
          }),
          ...(variables.billId
            ? [
                queryClient.invalidateQueries({
                  queryKey: ["bills"],
                  refetchType: "all",
                }),
              ]
            : []),
        ]);
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}

/**
 * Hook to update an existing transaction
 */
export function useUpdateTransaction(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["transactions"]["update"],
    variables: RouterInputs["transactions"]["update"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.transactions.update.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["transactions"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: ["accounts"],
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
 * Hook to delete a transaction
 */
export function useDeleteTransaction(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["transactions"]["delete"],
    variables: RouterInputs["transactions"]["delete"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.transactions.delete.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["transactions"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: ["accounts"],
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
 * Hook to clone a transaction
 */
export function useCloneTransaction(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["transactions"]["clone"],
    variables: RouterInputs["transactions"]["clone"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.transactions.clone.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["transactions"],
            refetchType: "all",
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
