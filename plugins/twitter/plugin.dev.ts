import 'dotenv/config';
import type { PluginConfigInput } from 'every-plugin';
import packageJson from './package.json' with { type: 'json' };
import type Plugin from './src/index';

export default {
  pluginId: packageJson.name,
  port: 3015,
  config: {
    variables: {},
    secrets: {
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    }
  } satisfies PluginConfigInput<typeof Plugin>
}
