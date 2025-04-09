import { Context } from "../../deps.ts";
import { PlatformName } from "@crosspost/types";

/**
 * Create a mock context for testing
 * @param options Options for the mock context
 * @returns A mock context
 */
export function createMockContext(options: {
  signerId?: string;
  validatedBody?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
} = {}): Context {
  const c = {
    // Mock basic context properties
    req: {
      url: "https://example.com",
      method: "GET",
      headers: new Headers(options.headers || {}),
    },
    // Mock context methods
    get: (key: string) => {
      if (key === "signerId") return options.signerId || "test.near";
      if (key === "validatedBody") return options.validatedBody || {};
      return undefined;
    },
    set: (key: string, value: unknown) => {},
    status: (code: number) => c,
    json: (data: unknown) => new Response(JSON.stringify(data), { 
      headers: { "Content-Type": "application/json" } 
    }),
    // Add params if provided
    params: options.params || {},
  } as unknown as Context;
  
  return c;
}

/**
 * Create a test user ID
 * @param platform Platform name
 * @returns A test user ID for the platform
 */
export function createTestUserId(platform: PlatformName): string {
  return `test-user-${platform}`;
}
