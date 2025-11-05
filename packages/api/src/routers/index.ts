import type { RouterClient } from "@orpc/server";
import { os } from "@orpc/server";
import { plugins } from "../plugins";

export const router = {
	health: os
		.route({ method: "GET", path: "/health" })
		.handler(() => {
			return "OK";
		}),
	twitter: os.prefix('/twitter').router(plugins.twitter.router)
} as const;

export type AppRouter = typeof router;
export type AppRouterClient = RouterClient<AppRouter>;