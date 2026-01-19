import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { useTRPC } from "@/integrations/trpc/react";
import type { TRPCRouter } from "@/integrations/trpc/router";

type RouterInputs = inferRouterInputs<TRPCRouter>;
type RouterOutputs = inferRouterOutputs<TRPCRouter>;

/**
 * Hook to create a new category
 */
export function useCreateCategory(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["categories"]["create"],
    variables: RouterInputs["categories"]["create"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.categories.create.mutationOptions({
      onSuccess: async (data, variables) => {
        await queryClient.invalidateQueries({
          queryKey: ["categories"],
          refetchType: "all",
        });
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}

/**
 * Hook to update an existing category
 */
export function useUpdateCategory(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["categories"]["update"],
    variables: RouterInputs["categories"]["update"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.categories.update.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["categories"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.categories.getById.queryKey({
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
 * Hook to delete a category
 * Note: Categories cannot be deleted if transactions or bills reference them (Restrict policy)
 */
export function useDeleteCategory(callbacks?: {
  onSuccess?: (
    data: RouterOutputs["categories"]["delete"],
    variables: RouterInputs["categories"]["delete"]
  ) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.categories.delete.mutationOptions({
      onSuccess: async (data, variables) => {
        await queryClient.invalidateQueries({
          queryKey: ["categories"],
          refetchType: "all",
        });
        callbacks?.onSuccess?.(data, variables);
      },
    }),
  });
}
