// Define OpenAPI types
export interface OpenAPIObject {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
    responses?: Record<string, any>;
    parameters?: Record<string, any>;
    examples?: Record<string, any>;
    requestBodies?: Record<string, any>;
    headers?: Record<string, any>;
    links?: Record<string, any>;
    callbacks?: Record<string, any>;
  };
  security?: Array<Record<string, string[]>>;
}

// Import paths and schemas
import { paths } from './paths/index';
import { schemas } from './schemas/index';

/**
 * OpenAPI Specification
 * Defines the API documentation
 */
export const openApiSpec: OpenAPIObject = {
  openapi: '3.0.3',
  info: {
    title: 'Twitter API Proxy',
    description: 'A secure proxy for the Twitter API that allows authorized frontends to perform Twitter actions on behalf of users who have granted permission.',
    version: '1.0.0',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'https://api.example.com/v1',
      description: 'Production server',
    },
    {
      url: 'https://staging-api.example.com/v1',
      description: 'Staging server',
    },
    {
      url: 'http://localhost:8787',
      description: 'Local development server',
    },
  ],
  tags: [
    {
      name: 'auth',
      description: 'Authentication operations',
    },
    {
      name: 'posts',
      description: 'Post operations (tweets, retweets, etc.)',
    },
    {
      name: 'media',
      description: 'Media operations (upload, status, etc.)',
    },
    {
      name: 'rate-limits',
      description: 'Rate limit operations',
    },
  ],
  paths,
  components: {
    schemas,
    securitySchemes: {
    },
  },
  security: [
    {
      apiKey: [],
    },
  ],
};

/**
 * Generate OpenAPI JSON
 * @returns OpenAPI specification as JSON string
 */
export function generateOpenApiJson(): string {
  return JSON.stringify(openApiSpec, null, 2);
}

/**
 * Generate OpenAPI YAML
 * @returns OpenAPI specification as YAML string
 */
export function generateOpenApiYaml(): string {
  // This is a simple JSON to YAML converter
  // In a real implementation, you would use a proper YAML library
  const json = generateOpenApiJson();
  let yaml = json
    .replace(/"/g, '')
    .replace(/,/g, '')
    .replace(/{/g, '')
    .replace(/}/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/:/g, ': ')
    .replace(/\n/g, '\n');

  return yaml;
}
