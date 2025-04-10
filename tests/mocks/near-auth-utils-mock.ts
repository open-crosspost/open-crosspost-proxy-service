import { ApiError, ApiErrorCode, PlatformName } from "@crosspost/types";
import { Context } from "../../deps.ts";
import { mockToken } from "./near-auth-service-mock.ts";

/**
 * Mock implementation of near-auth.utils.ts for testing
 */

/**
 * NEAR UNAUTHORIZED Data
 */
export interface NearAuthData {
  account_id: string;
  public_key: string;
  signature: string;
  message: string;
  nonce: string;
  recipient?: string;
  callback_url?: string;
}

/**
 * Mock implementation of extractAndValidateNearAuth
 * Always returns a successful validation with the provided signerId
 */
export async function extractAndValidateNearAuth(c: Context): Promise<{
  authData: NearAuthData;
  signerId: string;
}> {
  // Get the signerId from the context if available, otherwise use a default
  const signerId = c.get("signerId") as string || "test.near";
  
  // Create a mock authData object
  const authData: NearAuthData = {
    account_id: signerId,
    public_key: "mock-public-key",
    signature: "mock-signature",
    message: "mock-message",
    nonce: "mock-nonce",
    recipient: "crosspost.near",
    callback_url: c.req.url,
  };
  
  return {
    authData,
    signerId,
  };
}

/**
 * Mock implementation of verifyPlatformAccess
 * Always returns the mock token for successful verification
 */
export async function verifyPlatformAccess(
  signerId: string,
  platform: PlatformName,
  userId: string,
): Promise<any> {
  // For testing, you can add conditions to simulate different scenarios
  // For example, to simulate an unauthorized error for a specific user:
  if (userId === "unauthorized-user") {
    throw new ApiError(
      `No connected ${platform} account found for user ID ${userId}`,
      ApiErrorCode.UNAUTHORIZED,
      401,
    );
  }
  
  // Otherwise, return the mock token
  return mockToken;
}
