import { os } from "@orpc/server";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

// Plugin exports
export { runtime, plugins } from './plugins';
export { router, type AppRouter, type AppRouterClient } from './routers';
