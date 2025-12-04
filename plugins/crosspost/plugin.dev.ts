import 'dotenv/config';
import type { PluginConfigInput } from 'every-plugin';
import packageJson from './package.json' with { type: 'json' };
import type Plugin from './src/index';

export default {
  pluginId: packageJson.name,
  port: 3014,
  config: {
    variables: {
      baseUrl: process.env.BASE_URL || "https://api.opencrosspost.com",
      timeout: 10000,
    },
    secrets: {
      nearAuthData: process.env.NEAR_AUTH_DATA || JSON.stringify({
        account_id: 'test.near',
        public_key: 'ed25519:test',
        signature: 'test',
        message: 'test',
        nonce: [1, 2, 3],
        recipient: 'crosspost.near',
      }),
    }
  } satisfies PluginConfigInput<typeof Plugin>
}
