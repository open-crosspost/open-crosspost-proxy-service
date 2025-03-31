/**
 * OpenAPI Types Wrapper
 * 
 * This module re-exports the generated OpenAPI types with the correct extensions
 * to make them compatible with Deno's module system.
 */

// Re-export all types from the generated files
import * as runtime from './generated/runtime.ts';
import * as apis from './generated/apis/index.ts';
import * as models from './generated/models/index.ts';

// Export the types with the correct structure
export { runtime, apis, models };

// Export a namespace for backward compatibility
export namespace OpenAPI {
  export import runtime = runtime;
  export import apis = apis;
  export import models = models;
}
