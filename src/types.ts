import { Env } from './index';

/**
 * Extended Request interface with additional properties used in the application
 */
export interface ExtendedRequest extends Request {
  /**
   * Environment variables and bindings
   */
  env: Env;
  
  /**
   * Execution context for the request
   */
  ctx: ExecutionContext;
  
  /**
   * CORS headers to be applied to the response
   */
  corsHeaders?: {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Methods': string;
    'Access-Control-Allow-Headers': string;
    'Access-Control-Max-Age': string;
  };
}
