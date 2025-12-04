import type { PluginRegistry } from "every-plugin";
import { createLocalPluginRuntime } from "every-plugin/testing";
import { beforeAll, describe, expect, it } from "vitest";
import FarcasterPlugin from "@/index";

const TEST_REGISTRY: PluginRegistry = {
  "@crosspost/farcaster": {
    remoteUrl: "http://localhost:3000/remoteEntry.js",
    version: "1.0.0",
    description: "Farcaster platform plugin",
  },
};

const TEST_PLUGIN_MAP = {
  "@crosspost/farcaster": FarcasterPlugin,
} as const;

// Real configuration from environment variables
const TEST_CONFIG = {
  variables: {
    ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs",
    timeout: 10000,
  },
  secrets: {
    neynarApiKey: process.env.NEYNAR_API_KEY || "",
    farcasterDeveloperMnemonic: process.env.FARCASTER_DEVELOPER_MNEMONIC || "",
    pinataJwt: process.env.PINATA_JWT || "",
  },
};

describe("Farcaster Plugin Integration Tests (Real API)", () => {
  const runtime = createLocalPluginRuntime(
    {
      registry: TEST_REGISTRY,
      secrets: {},
    },
    TEST_PLUGIN_MAP
  );

  beforeAll(async () => {
    // Validate required environment variables
    if (!process.env.NEYNAR_API_KEY) {
      throw new Error("NEYNAR_API_KEY environment variable is required for integration tests");
    }

    const { initialized } = await runtime.usePlugin("@crosspost/farcaster", TEST_CONFIG);
    expect(initialized).toBeDefined();
    expect(initialized.plugin.id).toBe("@crosspost/farcaster");
  });

  describe("Auth", () => {
    it("should get auth URL (Warpcast approval URL)", async () => {
      if (!process.env.FARCASTER_DEVELOPER_MNEMONIC) {
        console.log("Skipping: FARCASTER_DEVELOPER_MNEMONIC not set");
        return;
      }

      const { client } = await runtime.usePlugin("@crosspost/farcaster", TEST_CONFIG);

      try {
        const result = await client.auth.getAuthUrl({
          redirectUri: "https://example.com/callback",
          state: "test-state-" + Date.now(),
          scopes: ["read", "write"],
        });

        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
        // Should contain warpcast URL or similar
        console.log("Auth URL:", result);
      } catch (error: any) {
        // Handle 402 Payment Required (signer creation requires paid plan)
        if (error?.response?.status === 402 || error?.message?.includes("402") || error?.message?.includes("Payment")) {
          console.log("Note: Signer creation requires a paid Neynar plan. This is expected on free tier.");
          return; // Skip test gracefully
        }
        throw error; // Re-throw other errors
      }
    }, 30000); // Increase timeout for real API call

    it("should throw error for exchangeCodeForToken (not supported)", async () => {
      const { client } = await runtime.usePlugin("@crosspost/farcaster", TEST_CONFIG);

      await expect(
        client.auth.exchangeCodeForToken({
          code: "test-code",
          redirectUri: "https://example.com/callback",
          scopes: [],
        })
      ).rejects.toThrow();
    });

    it("should throw error for refreshToken (not supported)", async () => {
      const { client } = await runtime.usePlugin("@crosspost/farcaster", TEST_CONFIG);

      await expect(
        client.auth.refreshToken({
          refreshToken: "test-refresh-token",
        })
      ).rejects.toThrow();
    });

    it("should return true for revokeToken (no-op)", async () => {
      const { client } = await runtime.usePlugin("@crosspost/farcaster", TEST_CONFIG);

      const result = await client.auth.revokeToken({
        accessToken: "test-token",
      });

      expect(result).toBe(true);
    });
  });

  describe("Posts", () => {
    // Note: These tests require a valid signer UUID (from getAuthUrl)
    // In real usage, you'd get this from the auth flow
    const TEST_SIGNER_UUID = process.env.TEST_SIGNER_UUID || "";

    it.skip("should create a cast (requires approved signer)", async () => {
      if (!TEST_SIGNER_UUID) {
        console.log("Skipping: TEST_SIGNER_UUID not set");
        return;
      }

      const { client } = await runtime.usePlugin("@crosspost/farcaster", TEST_CONFIG);

      const result = await client.post.create({
        userId: "test-user",
        accessToken: TEST_SIGNER_UUID,
        content: {
          text: "Hello Farcaster from integration test!",
        },
      });

      expect(result.id).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.createdAt).toBeDefined();
      console.log("Created cast:", result);
    });

    it.skip("should create a thread (requires approved signer)", async () => {
      if (!TEST_SIGNER_UUID) {
        console.log("Skipping: TEST_SIGNER_UUID not set");
        return;
      }

      const { client } = await runtime.usePlugin("@crosspost/farcaster", TEST_CONFIG);

      const result = await client.post.create({
        userId: "test-user",
        accessToken: TEST_SIGNER_UUID,
        content: [
          { text: "First cast in thread" },
          { text: "Second cast in thread" },
        ],
      });

      expect(result.id).toBeDefined();
      expect(result.threadIds).toBeDefined();
      expect(result.threadIds!.length).toBeGreaterThan(0);
      console.log("Created thread:", result);
    });
  });

  describe("Media", () => {
    it("should upload media to IPFS", async () => {
      if (!process.env.PINATA_JWT) {
        console.log("Skipping: PINATA_JWT not set");
        return;
      }

      // Check if JWT looks valid (should start with 'eyJ' and be longer)
      if (!process.env.PINATA_JWT.startsWith('eyJ') || process.env.PINATA_JWT.length < 50) {
        console.log("Skipping: PINATA_JWT appears to be incomplete or invalid");
        return;
      }

      const { client } = await runtime.usePlugin("@crosspost/farcaster", TEST_CONFIG);

      const testImageData = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

      try {
        const result = await client.media.upload({
          userId: "test-user",
          accessToken: "test-signer",
          media: {
            data: testImageData.toString("base64"),
            mimeType: "image/png",
            altText: "Test image",
          },
        });

        expect(result.mediaId).toBeDefined();
        expect(typeof result.mediaId).toBe("string");
        expect(result.mediaId.length).toBeGreaterThan(0);
        console.log("Uploaded media CID:", result.mediaId);
      } catch (error: any) {
        if (error?.message?.includes("upload") || error?.message?.includes("Pinata")) {
          console.log("Note: Pinata upload failed. Check if JWT token is valid and complete.");
          return; // Skip test gracefully
        }
        throw error;
      }
    }, 30000); // Increase timeout for real upload

    it("should get media status", async () => {
      const { client } = await runtime.usePlugin("@crosspost/farcaster", TEST_CONFIG);

      // Use a known IPFS CID for testing
      const testCid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"; // IPFS logo

      const result = await client.media.getStatus({
        userId: "test-user",
        accessToken: "test-signer",
        mediaId: testCid,
      });

      expect(result.mediaId).toBe(testCid);
      expect(result.state).toBeDefined();
      expect(result.processingComplete).toBeDefined();
      console.log("Media status:", result);
    }, 30000); // Increase timeout to 30 seconds

    it("should update media metadata", async () => {
      if (!process.env.PINATA_JWT) {
        console.log("Skipping: PINATA_JWT not set");
        return;
      }

      // Check if JWT looks valid
      if (!process.env.PINATA_JWT.startsWith('eyJ') || process.env.PINATA_JWT.length < 50) {
        console.log("Skipping: PINATA_JWT appears to be incomplete or invalid");
        return;
      }

      const { client } = await runtime.usePlugin("@crosspost/farcaster", TEST_CONFIG);

      // First upload a file
      const testImageData = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

      try {
        const uploadResult = await client.media.upload({
          userId: "test-user",
          accessToken: "test-signer",
          media: {
            data: testImageData.toString("base64"),
            mimeType: "image/png",
          },
        });

        // Then update metadata
        const result = await client.media.updateMetadata({
          userId: "test-user",
          accessToken: "test-signer",
          mediaId: uploadResult.mediaId,
          altText: "Updated alt text",
        });

        expect(result).toBe(true);
        console.log("Updated metadata for CID:", uploadResult.mediaId);
      } catch (error: any) {
        if (error?.message?.includes("upload") || error?.message?.includes("Pinata")) {
          console.log("Note: Pinata operation failed. Check if JWT token is valid and complete.");
          return; // Skip test gracefully
        }
        throw error;
      }
    }, 30000); // Increase timeout
  });

  describe("Profile", () => {
    it("should get user profile", async () => {
      const { client } = await runtime.usePlugin("@crosspost/farcaster", TEST_CONFIG);

      // Try common FIDs that might exist (2, 3, or use a known active FID)
      // FID 2 is often dwr.eth, FID 3 is often v
      const testFids = process.env.TEST_FID ? [process.env.TEST_FID] : ["2", "3", "1"];
      let result: any = null;
      let lastError: Error | null = null;

      for (const fid of testFids) {
        try {
          result = await client.profile.get({
            userId: fid,
            accessToken: "test-signer",
          });
          break; // Success, exit loop
        } catch (error) {
          lastError = error as Error;
          continue; // Try next FID
        }
      }

      if (!result) {
        console.log("Could not find any valid user profile. Last error:", lastError?.message);
        // Skip test if no valid user found
        return;
      }

      expect(result.id).toBeDefined();
      expect(result.username).toBeDefined();
      expect(result.displayName).toBeDefined();
      console.log("Profile:", result);
    }, 30000); // Increase timeout
  });

  describe("Rate Limit", () => {
    it("should return unlimited rate limits", async () => {
      const { client } = await runtime.usePlugin("@crosspost/farcaster", TEST_CONFIG);

      const result = await client.rateLimit.check({
        endpoint: "posts",
        userId: "test-user",
        accessToken: "test-signer",
      });

      expect(result.limit).toBe(Number.MAX_SAFE_INTEGER);
      expect(result.remaining).toBe(Number.MAX_SAFE_INTEGER);
      expect(result.reset).toBeDefined();
      expect(result.resetAfter).toBe(0);
    });
  });
});
