import { os } from "@orpc/server";
import type { PluginsInstance } from "../plugins";
import type { RouterClient } from "@orpc/server";

export function createAppRouter(plugins: PluginsInstance) {
	return {
		health: os
			.route({ method: "GET", path: "/health" })
			.handler(() => {
				return "OK";
			}),
		twitter: plugins.twitter.router
	};
}

export type AppRouter = ReturnType<typeof createAppRouter>;
export type AppRouterClient = RouterClient<AppRouter>;
