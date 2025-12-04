import type { RouterClient } from "every-plugin/orpc";
import { os } from "every-plugin/orpc";
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