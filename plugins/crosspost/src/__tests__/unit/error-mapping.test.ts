import { describe, expect, it } from 'vitest';
import { getStatusErrorMessage, mapToCrosspostError } from '../../errors/error-mapping';

describe('Error Mapping', () => {
  describe('mapToCrosspostError', () => {
    it('should map API errors correctly', () => {
      const responseData = {
        errors: [
          {
            message: 'Authentication failed',
            code: 'AUTH_ERROR',
            details: { platform: 'twitter' },
            recoverable: false,
          },
        ],
      };

      const error = mapToCrosspostError(responseData, 401);

      expect(error.message).toBe('Authentication failed');
      expect((error as any).code).toBe('AUTH_ERROR');
      expect((error as any).statusCode).toBe(401);
      expect((error as any).details).toEqual({ platform: 'twitter' });
      expect((error as any).recoverable).toBe(false);
    });

    it('should handle empty errors array', () => {
      const responseData = { errors: [] };

      const error = mapToCrosspostError(responseData, 500);

      expect(error.message).toBe('Request failed with status 500');
      expect((error as any).code).toBe('UNKNOWN_ERROR');
      expect((error as any).statusCode).toBe(500);
    });

    it('should handle missing errors field', () => {
      const responseData = {};

      const error = mapToCrosspostError(responseData, 404);

      expect(error.message).toBe('Request failed with status 404');
      expect((error as any).code).toBe('UNKNOWN_ERROR');
      expect((error as any).statusCode).toBe(404);
    });

    it('should handle partial error data', () => {
      const responseData = {
        errors: [
          {
            message: 'Rate limit exceeded',
            // Missing code, details, recoverable
          },
        ],
      };

      const error = mapToCrosspostError(responseData, 429);

      expect(error.message).toBe('Rate limit exceeded');
      expect((error as any).code).toBe('UNKNOWN_ERROR');
      expect((error as any).statusCode).toBe(429);
      expect((error as any).details).toBeUndefined();
      expect((error as any).recoverable).toBeUndefined();
    });
  });

  describe('getStatusErrorMessage', () => {
    it('should return appropriate messages for common status codes', () => {
      expect(getStatusErrorMessage(400)).toBe('Bad request - please check your input parameters');
      expect(getStatusErrorMessage(401)).toBe(
        'Authentication failed - please check your credentials',
      );
      expect(getStatusErrorMessage(403)).toBe('Access forbidden - insufficient permissions');
      expect(getStatusErrorMessage(404)).toBe('Resource not found');
      expect(getStatusErrorMessage(429)).toBe('Rate limit exceeded - please try again later');
      expect(getStatusErrorMessage(500)).toBe('Internal server error - please try again later');
      expect(getStatusErrorMessage(502)).toBe('Bad gateway - service temporarily unavailable');
      expect(getStatusErrorMessage(503)).toBe('Service unavailable - please try again later');
    });

    it('should return generic message for unknown status codes', () => {
      expect(getStatusErrorMessage(418)).toBe('Request failed with status 418');
      expect(getStatusErrorMessage(999)).toBe('Request failed with status 999');
    });
  });
});
