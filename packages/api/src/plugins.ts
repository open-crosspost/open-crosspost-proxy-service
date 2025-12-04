import TwitterPlugin from "@crosspost/twitter";
import { createPluginRuntime } from "every-plugin";

const env = {
  TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID!,
  TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET!,
};

export const runtime = createPluginRuntime({
  registry: {
    "@crosspost/twitter": {
      module: TwitterPlugin,
    },
  },
  secrets: env,
});

const twitter = await runtime.usePlugin("@crosspost/twitter", {
  variables: {},
  secrets: {
    clientId: "{{TWITTER_CLIENT_ID}}",
    clientSecret: "{{TWITTER_CLIENT_SECRET}}"
  },
});

export const plugins = { twitter } as const;
