import { ApiErrorCode, Platform } from '@crosspost/types';
import { CrosspostError } from '../../../packages/sdk/src/utils/error.ts';
import { assertEquals } from 'jsr:@std/assert';
import { describe, it } from 'jsr:@std/testing/bdd';

import {
  enrichErrorWithContext,
  getErrorDetails,
  getErrorMessage,
  isAuthError,
  isContentError,
  isNetworkError,
  isPlatformError,
  isRateLimitError,
  isRecoverableError,
  isValidationError,
} from '../../../packages/sdk/src/utils/error.ts';

// Define error categories for testing
const ERROR_CATEGORIES = {
  AUTH: [ApiErrorCode.UNAUTHORIZED, ApiErrorCode.FORBIDDEN],
  VALIDATION: [ApiErrorCode.VALIDATION_ERROR, ApiErrorCode.INVALID_REQUEST],
  NETWORK: [ApiErrorCode.NETWORK_ERROR],
  PLATFORM: [ApiErrorCode.PLATFORM_ERROR, ApiErrorCode.PLATFORM_UNAVAILABLE],
  CONTENT: [ApiErrorCode.CONTENT_POLICY_VIOLATION, ApiErrorCode.DUPLICATE_CONTENT],
  RATE_LIMIT: [ApiErrorCode.RATE_LIMITED],
};

// Helper function to check error categories
function isErrorOfCategory(error: unknown, codes: ApiErrorCode[]): boolean {
  return error instanceof CrosspostError && codes.includes(error.code);
}

describe('Error Utilities', () => {
  describe('ERROR_CATEGORIES', () => {
    it('should define all error categories', () => {
      // Verify AUTH category
      assertEquals(ERROR_CATEGORIES.AUTH.includes(ApiErrorCode.UNAUTHORIZED), true);
      assertEquals(ERROR_CATEGORIES.AUTH.includes(ApiErrorCode.FORBIDDEN), true);

      // Verify VALIDATION category
      assertEquals(ERROR_CATEGORIES.VALIDATION.includes(ApiErrorCode.VALIDATION_ERROR), true);
      assertEquals(ERROR_CATEGORIES.VALIDATION.includes(ApiErrorCode.INVALID_REQUEST), true);

      // Verify NETWORK category
      assertEquals(ERROR_CATEGORIES.NETWORK.includes(ApiErrorCode.NETWORK_ERROR), true);

      // Verify PLATFORM category
      assertEquals(ERROR_CATEGORIES.PLATFORM.includes(ApiErrorCode.PLATFORM_ERROR), true);
      assertEquals(ERROR_CATEGORIES.PLATFORM.includes(ApiErrorCode.PLATFORM_UNAVAILABLE), true);

      // Verify CONTENT category
      assertEquals(ERROR_CATEGORIES.CONTENT.includes(ApiErrorCode.CONTENT_POLICY_VIOLATION), true);
      assertEquals(ERROR_CATEGORIES.CONTENT.includes(ApiErrorCode.DUPLICATE_CONTENT), true);

      // Verify RATE_LIMIT category
      assertEquals(ERROR_CATEGORIES.RATE_LIMIT.includes(ApiErrorCode.RATE_LIMITED), true);
    });
  });

  describe('isErrorOfCategory', () => {
    it('should correctly identify ApiError by category', () => {
      const authError = new CrosspostError('Unauthorized', ApiErrorCode.UNAUTHORIZED, 401);
      const validationError = new CrosspostError(
        'Invalid input',
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );

      assertEquals(isErrorOfCategory(authError, ERROR_CATEGORIES.AUTH), true);
      assertEquals(isErrorOfCategory(authError, ERROR_CATEGORIES.VALIDATION), false);

      assertEquals(isErrorOfCategory(validationError, ERROR_CATEGORIES.VALIDATION), true);
      assertEquals(isErrorOfCategory(validationError, ERROR_CATEGORIES.AUTH), false);
    });

    it('should correctly identify PlatformError by category', () => {
      const platformError = new CrosspostError(
        'Platform error',
        ApiErrorCode.PLATFORM_ERROR,
        500,
        { platform: Platform.TWITTER },
        false,
      );

      assertEquals(isErrorOfCategory(platformError, ERROR_CATEGORIES.PLATFORM), true);
      assertEquals(isErrorOfCategory(platformError, ERROR_CATEGORIES.AUTH), false);
    });

    it('should return false for non-error objects', () => {
      assertEquals(isErrorOfCategory(null, ERROR_CATEGORIES.AUTH), false);
      assertEquals(isErrorOfCategory(undefined, ERROR_CATEGORIES.AUTH), false);
      assertEquals(isErrorOfCategory('error string', ERROR_CATEGORIES.AUTH), false);
      assertEquals(isErrorOfCategory({}, ERROR_CATEGORIES.AUTH), false);
      assertEquals(isErrorOfCategory(new Error('Generic error'), ERROR_CATEGORIES.AUTH), false);
    });
  });

  describe('isAuthError', () => {
    it('should identify authentication errors correctly', () => {
      const unauthorizedError = new CrosspostError('Unauthorized', ApiErrorCode.UNAUTHORIZED, 401);
      const forbiddenError = new CrosspostError('Forbidden', ApiErrorCode.FORBIDDEN, 403);
      const otherError = new CrosspostError('Other error', ApiErrorCode.INTERNAL_ERROR, 500);

      assertEquals(isAuthError(unauthorizedError), true);
      assertEquals(isAuthError(forbiddenError), true);
      assertEquals(isAuthError(otherError), false);
      assertEquals(isAuthError(new Error('Generic error')), false);
    });
  });

  describe('isValidationError', () => {
    it('should identify validation errors correctly', () => {
      const validationError = new CrosspostError(
        'Invalid input',
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
      const invalidRequestError = new CrosspostError(
        'Invalid request',
        ApiErrorCode.INVALID_REQUEST,
        400,
      );
      const otherError = new CrosspostError('Other error', ApiErrorCode.INTERNAL_ERROR, 500);

      assertEquals(isValidationError(validationError), true);
      assertEquals(isValidationError(invalidRequestError), true);
      assertEquals(isValidationError(otherError), false);
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors correctly', () => {
      const networkError = new CrosspostError('Network error', ApiErrorCode.NETWORK_ERROR, 503);
      const otherError = new CrosspostError('Other error', ApiErrorCode.INTERNAL_ERROR, 500);

      assertEquals(isNetworkError(networkError), true);
      assertEquals(isNetworkError(otherError), false);
    });
  });

  describe('isPlatformError', () => {
    it('should identify errors with platform details correctly', () => {
      const platformErrorWithDetails = new CrosspostError(
        'Twitter specific error',
        ApiErrorCode.DUPLICATE_CONTENT,
        400,
        { platform: Platform.TWITTER },
      );
      const platformErrorGeneric = new CrosspostError(
        'Generic platform error',
        ApiErrorCode.PLATFORM_ERROR,
        500,
        { platform: Platform.TWITTER },
      );
      const errorWithoutDetails = new CrosspostError(
        'Internal error',
        ApiErrorCode.INTERNAL_ERROR,
        500,
        // No platform detail
      );
      const errorWithDifferentCodeNoDetails = new CrosspostError(
        'Validation error',
        ApiErrorCode.VALIDATION_ERROR,
        400,
        // No platform detail
      );

      // Should be true because it has platform details
      assertEquals(isPlatformError(platformErrorWithDetails), true);
      // Should be true because it has platform details (and the code)
      assertEquals(isPlatformError(platformErrorGeneric), true);
      // Should be false because it lacks platform details
      assertEquals(isPlatformError(errorWithoutDetails), false);
      // Should be false because it lacks platform details
      assertEquals(isPlatformError(errorWithDifferentCodeNoDetails), false);
      // Should be false for non-CrosspostError
      assertEquals(isPlatformError(new Error('Generic error')), false);
    });
  });

  describe('isContentError', () => {
    it('should identify content errors correctly', () => {
      const policyViolationError = new CrosspostError(
        'Policy violation',
        ApiErrorCode.CONTENT_POLICY_VIOLATION,
        400,
      );
      const duplicateContentError = new CrosspostError(
        'Duplicate content',
        ApiErrorCode.DUPLICATE_CONTENT,
        400,
      );
      const otherError = new CrosspostError('Other error', ApiErrorCode.INTERNAL_ERROR, 500);

      assertEquals(isContentError(policyViolationError), true);
      assertEquals(isContentError(duplicateContentError), true);
      assertEquals(isContentError(otherError), false);
    });
  });

  describe('isRateLimitError', () => {
    it('should identify rate limit errors correctly', () => {
      const rateLimitError = new CrosspostError('Rate limited', ApiErrorCode.RATE_LIMITED, 429);
      const otherError = new CrosspostError('Other error', ApiErrorCode.INTERNAL_ERROR, 500);

      assertEquals(isRateLimitError(rateLimitError), true);
      assertEquals(isRateLimitError(otherError), false);
    });
  });

  describe('isRecoverableError', () => {
    it('should identify recoverable errors correctly', () => {
      const recoverableApiError = new CrosspostError(
        'Recoverable',
        ApiErrorCode.RATE_LIMITED,
        429,
        {},
        true,
      );
      const nonRecoverableApiError = new CrosspostError(
        'Non-recoverable',
        ApiErrorCode.INTERNAL_ERROR,
        500,
        {},
        false,
      );
      const recoverablePlatformError = new CrosspostError(
        'Recoverable',
        ApiErrorCode.PLATFORM_ERROR,
        500,
        { platform: Platform.TWITTER },
        true,
      );
      const nonRecoverablePlatformError = new CrosspostError(
        'Non-recoverable',
        ApiErrorCode.PLATFORM_ERROR,
        500,
        { platform: Platform.TWITTER },
        false,
      );

      assertEquals(isRecoverableError(recoverableApiError), true);
      assertEquals(isRecoverableError(nonRecoverableApiError), false);
      assertEquals(isRecoverableError(recoverablePlatformError), true);
      assertEquals(isRecoverableError(nonRecoverablePlatformError), false);
      assertEquals(isRecoverableError(new Error('Generic error')), false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error objects', () => {
      const error = new Error('Generic error');
      const apiError = new CrosspostError('API error', ApiErrorCode.INTERNAL_ERROR, 500);

      assertEquals(getErrorMessage(error), 'Generic error');
      assertEquals(getErrorMessage(apiError), 'API error');
    });

    it('should return default message for other types', () => {
      assertEquals(getErrorMessage(null), 'An error occurred');
      assertEquals(getErrorMessage(undefined), 'An error occurred');
      assertEquals(getErrorMessage({}), 'An error occurred');
      assertEquals(getErrorMessage(null, 'Custom default'), 'Custom default');
    });
  });

  describe('getErrorDetails', () => {
    it('should extract details from ApiError', () => {
      const details = { field: 'username', reason: 'too short' };
      const apiError = new CrosspostError('API error', ApiErrorCode.VALIDATION_ERROR, 400, details);

      assertEquals(getErrorDetails(apiError), details);
    });

    it('should extract details from platform error', () => {
      const details = { tweetId: '12345', reason: 'duplicate', platform: Platform.TWITTER };
      const platformError = new CrosspostError(
        'Platform error',
        ApiErrorCode.PLATFORM_ERROR,
        500,
        details,
        false,
      );

      assertEquals(getErrorDetails(platformError), details);
    });

    it('should return undefined for other types', () => {
      assertEquals(getErrorDetails(null), undefined);
      assertEquals(getErrorDetails(undefined), undefined);
      assertEquals(getErrorDetails({}), undefined);
      assertEquals(getErrorDetails(new Error('Generic error')), undefined);
    });
  });

  describe('enrichErrorWithContext', () => {
    it('should add context to error details', () => {
      const apiError = new CrosspostError('API error', ApiErrorCode.INTERNAL_ERROR, 500, {
        original: 'detail',
      });
      const context = { operation: 'createPost', timestamp: Date.now() };

      const enriched = enrichErrorWithContext(apiError, context);

      assertEquals(enriched instanceof CrosspostError, true);
      const enrichedApiError = enriched as CrosspostError;
      assertEquals(enrichedApiError.details?.original, 'detail'); // Original details preserved
      assertEquals(enrichedApiError.details?.operation, 'createPost'); // Context added
      assertEquals(enrichedApiError.details?.timestamp, context.timestamp); // Context added
    });

    it('should add context to platform error details', () => {
      const platformError = new CrosspostError(
        'Platform error',
        ApiErrorCode.PLATFORM_ERROR,
        500,
        { original: 'detail', platform: Platform.TWITTER },
        false,
      );
      const context = { operation: 'createPost', timestamp: Date.now() };

      const enriched = enrichErrorWithContext(platformError, context);

      assertEquals(enriched instanceof CrosspostError, true);
      const enrichedPlatformError = enriched as CrosspostError;
      assertEquals(enrichedPlatformError.details?.original, 'detail'); // Original details preserved
      assertEquals(enrichedPlatformError.details?.operation, 'createPost'); // Context added
      assertEquals(enrichedPlatformError.details?.timestamp, context.timestamp); // Context added
    });

    it('should create CrosspostError for regular Error', () => {
      const error = new Error('Generic error');
      const context = { operation: 'createPost', timestamp: Date.now() };

      const enriched = enrichErrorWithContext(error, context);

      assertEquals(enriched instanceof CrosspostError, true);
      assertEquals(enriched instanceof CrosspostError, true);
      const enrichedApiError = enriched as CrosspostError;
      assertEquals(enrichedApiError.message, 'Generic error');
      assertEquals(enrichedApiError.code, ApiErrorCode.INTERNAL_ERROR);
      assertEquals(enrichedApiError.details?.operation, 'createPost');
      assertEquals(enrichedApiError.details?.timestamp, context.timestamp);
      assertEquals('originalError' in enrichedApiError.details!, true);
    });
  });
});
