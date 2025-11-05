import type TwitterPlugin from "@crosspost/twitter";
import { createPluginRuntime } from "every-plugin";

declare module "every-plugin" {
  interface RegisteredPlugins {
    "@crosspost/twitter": typeof TwitterPlugin;
  }
}

export const runtime = createPluginRuntime({
  registry: {
    "@crosspost/twitter": {
      remoteUrl: process.env.TWITTER_PLUGIN_URL || "http://localhost:3014/remoteEntry.js",
    },
  },
  secrets: {
    TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID!,
    TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET!,
  },
});

const twitter = await runtime.usePlugin("@crosspost/twitter", {
  variables: {},
  secrets: {
    clientId: "{{TWITTER_CLIENT_ID}}",
    clientSecret: "{{TWITTER_CLIENT_SECRET}}"
  },
});

export const plugins = { twitter } as const;
