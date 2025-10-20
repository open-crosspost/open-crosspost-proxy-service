import { describe, expect, it } from 'vitest';
import {
  createAuthHeaders,
  generateAuthToken,
  isValidNearAuthData,
} from '../../utils/auth-helpers';
import type { NearAuthData } from '../../types/auth';

describe('Auth Helpers', () => {
  const mockNearAuthData: NearAuthData = {
    account_id: 'test.near',
    public_key: 'ed25519:test',
    signature: 'test-signature',
    message: 'test-message',
    nonce: new Array(32).fill(0).map((_, i) => i),
    recipient: 'crosspost.near',
  };

  describe('generateAuthToken', () => {
    it('should generate a valid auth token', () => {
      const token = generateAuthToken(mockNearAuthData);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('createAuthHeaders', () => {
    it('should create headers for GET requests with X-Near-Account', () => {
      const headers = createAuthHeaders('GET', mockNearAuthData);

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Near-Account': 'test.near',
      });
    });

    it('should create headers for POST requests with Authorization', () => {
      const headers = createAuthHeaders('POST', mockNearAuthData);

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': expect.stringContaining('Bearer'),
      });
    });

    it('should create headers for PUT requests with Authorization', () => {
      const headers = createAuthHeaders('PUT', mockNearAuthData);

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': expect.stringContaining('Bearer'),
      });
    });

    it('should create headers for DELETE requests with Authorization', () => {
      const headers = createAuthHeaders('DELETE', mockNearAuthData);

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': expect.stringContaining('Bearer'),
      });
    });
  });

  describe('isValidNearAuthData', () => {
    it('should validate correct NEAR auth data', () => {
      expect(isValidNearAuthData(mockNearAuthData)).toBe(true);
    });

    it('should reject invalid auth data with missing account_id', () => {
      const invalidData = { ...mockNearAuthData, account_id: '' };
      expect(isValidNearAuthData(invalidData)).toBe(false);
    });

    it('should reject invalid auth data with missing public_key', () => {
      const invalidData = { ...mockNearAuthData, public_key: '' };
      expect(isValidNearAuthData(invalidData)).toBe(false);
    });

    it('should reject invalid auth data with missing signature', () => {
      const invalidData = { ...mockNearAuthData, signature: '' };
      expect(isValidNearAuthData(invalidData)).toBe(false);
    });

    it('should reject invalid auth data with missing message', () => {
      const invalidData = { ...mockNearAuthData, message: '' };
      expect(isValidNearAuthData(invalidData)).toBe(false);
    });

    it('should reject invalid auth data with invalid nonce', () => {
      const invalidData = { ...mockNearAuthData, nonce: 'invalid' as any };
      expect(isValidNearAuthData(invalidData)).toBe(false);
    });

    it('should reject invalid auth data with missing recipient', () => {
      const invalidData = { ...mockNearAuthData, recipient: '' };
      expect(isValidNearAuthData(invalidData)).toBe(false);
    });

    it('should accept auth data with optional callback_url', () => {
      const dataWithCallback = {
        ...mockNearAuthData,
        callback_url: 'https://example.com/callback',
      };
      expect(isValidNearAuthData(dataWithCallback)).toBe(true);
    });
  });
});
