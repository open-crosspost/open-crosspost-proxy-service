import { describe, expect, it, beforeEach } from "vitest";
import { FarcasterService } from "@/service";

describe("FarcasterService", () => {
  const mockConfig = {
    neynarApiKey: process.env.NEYNAR_API_KEY || "test-api-key",
    farcasterDeveloperMnemonic: process.env.FARCASTER_DEVELOPER_MNEMONIC || "test test test test test test test test test test test test",
    pinataJwt: process.env.PINATA_JWT || "test-jwt",
    ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs",
    timeout: 10000,
  };

  let service: FarcasterService;

  beforeEach(() => {
    service = new FarcasterService(
      mockConfig.neynarApiKey,
      mockConfig.farcasterDeveloperMnemonic,
      mockConfig.pinataJwt,
      mockConfig.ipfsGatewayUrl,
      mockConfig.timeout
    );
  });

  describe("constructor", () => {
    it("should initialize all adapters", () => {
      expect(service).toBeDefined();
      // Service should be initialized with all adapters
      expect((service as any).clientFactory).toBeDefined();
      expect((service as any).authAdapter).toBeDefined();
      expect((service as any).postAdapter).toBeDefined();
      expect((service as any).mediaAdapter).toBeDefined();
      expect((service as any).profileAdapter).toBeDefined();
      expect((service as any).rateLimitAdapter).toBeDefined();
    });
  });

  describe("service methods", () => {
    it("should have all required methods", () => {
      expect(typeof service.getAuthUrl).toBe("function");
      expect(typeof service.exchangeCodeForToken).toBe("function");
      expect(typeof service.refreshToken).toBe("function");
      expect(typeof service.revokeToken).toBe("function");
      expect(typeof service.createPost).toBe("function");
      expect(typeof service.deletePost).toBe("function");
      expect(typeof service.repost).toBe("function");
      expect(typeof service.quotePost).toBe("function");
      expect(typeof service.replyToPost).toBe("function");
      expect(typeof service.likePost).toBe("function");
      expect(typeof service.unlikePost).toBe("function");
      expect(typeof service.uploadMedia).toBe("function");
      expect(typeof service.getMediaStatus).toBe("function");
      expect(typeof service.updateMediaMetadata).toBe("function");
      expect(typeof service.getProfile).toBe("function");
      expect(typeof service.checkRateLimit).toBe("function");
    });
  });
});
