import { os } from "@orpc/server";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

// Plugin exports
export { initializePlugins, type PluginEnv, type PluginsInstance } from './plugins';
export { createAppRouter, type AppRouter, type AppRouterClient } from './routers';
