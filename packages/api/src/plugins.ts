import type TwitterPlugin from "@crosspost/twitter";
import { createPluginRuntime } from "every-plugin";

declare module "every-plugin" {
  interface RegisteredPlugins {
    "@crosspost/twitter": typeof TwitterPlugin;
  }
}

export interface PluginEnv {
  TWITTER_PLUGIN_URL?: string;
  TWITTER_CLIENT_ID: string;
  TWITTER_CLIENT_SECRET: string;
}

export async function initializePlugins(env: PluginEnv) {
  const runtime = createPluginRuntime({
    registry: {
      "@crosspost/twitter": {
        remoteUrl: env.TWITTER_PLUGIN_URL || "http://localhost:3014/remoteEntry.js",
      },
    },
    secrets: {
      TWITTER_CLIENT_ID: env.TWITTER_CLIENT_ID,
      TWITTER_CLIENT_SECRET: env.TWITTER_CLIENT_SECRET,
    },
  });

  const twitter = await runtime.usePlugin("@crosspost/twitter", {
    variables: {},
    secrets: {
      clientId: "{{TWITTER_CLIENT_ID}}",
      clientSecret: "{{TWITTER_CLIENT_SECRET}}"
    },
  });

  return { twitter };
}

export type PluginsInstance = Awaited<ReturnType<typeof initializePlugins>>;
