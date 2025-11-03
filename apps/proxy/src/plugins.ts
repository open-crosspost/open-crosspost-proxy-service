import { createPluginRuntime } from 'every-plugin/runtime';
import type { PlatformName } from '@crosspost/types';
import { getSecureEnv } from './config/env';

const env = getSecureEnv();

// Registry keys ARE the platform names
// This ensures type safety and no translation needed
export const PLUGIN_REGISTRY = {
  'twitter': {
    remoteUrl: env.TWITTER_PLUGIN_URL || 'http://localhost:3014/remoteEntry.js',
    version: '1.0.0'
  },
  // Add when ready:
  // 'farcaster': {
  //   remoteUrl: env.FARCASTER_PLUGIN_URL || 'http://localhost:3015/remoteEntry.js',
  //   version: '1.0.0'
  // },
} as const;

// Type-safe platform names derived from registry keys
export type PlatformPlugin = keyof typeof PLUGIN_REGISTRY;
export const AVAILABLE_PLATFORMS = Object.keys(PLUGIN_REGISTRY) as PlatformPlugin[];

// Create the plugin runtime
export const pluginRuntime = createPluginRuntime({
  registry: PLUGIN_REGISTRY
});

// Get secrets for a specific platform
function getSecretsForPlatform(platform: PlatformPlugin) {
  switch (platform) {
    case 'twitter':
      return {
        clientId: env.TWITTER_CLIENT_ID,
        clientSecret: env.TWITTER_CLIENT_SECRET,
      };
    // case 'farcaster':
    //   return {
    //     clientId: env.FARCASTER_CLIENT_ID,
    //     clientSecret: env.FARCASTER_CLIENT_SECRET,
    //   };
    default:
      throw new Error(`No secrets configured for platform: ${platform}`);
  }
}

// Type-safe plugin client getter
export async function getPlatformPlugin(platform: PlatformPlugin) {
  const { client } = await pluginRuntime.usePlugin(platform, {
    variables: {},
    secrets: getSecretsForPlatform(platform),
  });

  return client;
}

// Helper to check if a platform is supported
export function isSupportedPlatform(platform: string): platform is PlatformPlugin {
  return AVAILABLE_PLATFORMS.includes(platform as PlatformPlugin);
}

// For backward compatibility with existing PlatformName type
export async function getPluginForPlatformName(platform: PlatformName) {
  if (!isSupportedPlatform(platform)) {
    throw new Error(`Platform ${platform} is not supported by any plugin`);
  }

  return getPlatformPlugin(platform);
}
