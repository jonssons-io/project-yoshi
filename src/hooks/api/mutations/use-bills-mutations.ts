import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { useTRPC } from "@/integrations/trpc/react";
import type { TRPCRouter } from "@/integrations/trpc/router";

type RouterInputs = inferRouterInputs<TRPCRouter>;
type RouterOutputs = inferRouterOutputs<TRPCRouter>;

/**
 * Hook to create a new bill
 */
export function useCreateBill(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["bills"]["create"],
    variables: RouterInputs["bills"]["create"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.bills.create.mutationOptions({
      onSuccess: async (data, variables) => {
        await queryClient.invalidateQueries({
          queryKey: ["bills"],
          refetchType: "all",
        });
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}

/**
 * Hook to update an existing bill
 */
export function useUpdateBill(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["bills"]["update"],
    variables: RouterInputs["bills"]["update"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.bills.update.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["bills"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.bills.getById.queryKey({ id: variables.id }),
          }),
        ]);
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}

/**
 * Hook to delete a bill
 * Bill deletion sets billId to null on linked transactions (SetNull policy)
 */
export function useDeleteBill(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["bills"]["delete"],
    variables: RouterInputs["bills"]["delete"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.bills.delete.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["bills"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: ["transactions"],
            refetchType: "all",
          }),
        ]);
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}

/**
 * Hook to archive a bill
 */
export function useArchiveBill(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["bills"]["archive"],
    variables: RouterInputs["bills"]["archive"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.bills.archive.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["bills"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.bills.getById.queryKey({ id: variables.id }),
          }),
        ]);
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}
