import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "@/db";

/**
 * Create tRPC context with Clerk authentication
 * For now using public procedures - will add Clerk auth integration later
 */
export const createTRPCContext = async (opts: { req: Request }) => {
  // TODO: Extract userId from Clerk session in request headers
  // For now, we'll use publicProcedure and require userId in inputs
  return {
    prisma,
    req: opts.req,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure that requires authentication
 * TODO: Add Clerk authentication check
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // TODO: Verify Clerk session and extract userId
  // For now, we'll pass through and require userId in inputs
  return next({
    ctx,
  });
});
