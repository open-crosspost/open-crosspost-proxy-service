import { ApiError, ApiErrorCode, Platform, PlatformError } from '@crosspost/types';
import { assertEquals } from 'jsr:@std/assert';
import { describe, it } from 'jsr:@std/testing/bdd';

// Import the utilities we'll be implementing
import {
  apiWrapper,
  enrichErrorWithContext,
  ERROR_CATEGORIES,
  getErrorDetails,
  getErrorMessage,
  isAuthError,
  isContentError,
  isErrorOfCategory,
  isNetworkError,
  isPlatformError,
  isRateLimitError,
  isRecoverableError,
  isValidationError,
} from '../../src/utils/error-utils.ts';

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
      const authError = new ApiError('Unauthorized', ApiErrorCode.UNAUTHORIZED, 401);
      const validationError = new ApiError('Invalid input', ApiErrorCode.VALIDATION_ERROR, 400);

      assertEquals(isErrorOfCategory(authError, ERROR_CATEGORIES.AUTH), true);
      assertEquals(isErrorOfCategory(authError, ERROR_CATEGORIES.VALIDATION), false);

      assertEquals(isErrorOfCategory(validationError, ERROR_CATEGORIES.VALIDATION), true);
      assertEquals(isErrorOfCategory(validationError, ERROR_CATEGORIES.AUTH), false);
    });

    it('should correctly identify PlatformError by category', () => {
      const platformError = new PlatformError(
        'Platform error',
        Platform.TWITTER,
        ApiErrorCode.PLATFORM_ERROR,
        false,
      );

      assertEquals(isErrorOfCategory(platformError, ERROR_CATEGORIES.PLATFORM), true);
      assertEquals(isErrorOfCategory(platformError, ERROR_CATEGORIES.AUTH), false);
    });

    it('should handle error-like objects with code property', () => {
      const errorLike = { code: ApiErrorCode.RATE_LIMITED, message: 'Rate limited' };

      assertEquals(isErrorOfCategory(errorLike, ERROR_CATEGORIES.RATE_LIMIT), true);
      assertEquals(isErrorOfCategory(errorLike, ERROR_CATEGORIES.AUTH), false);
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
      const unauthorizedError = new ApiError('Unauthorized', ApiErrorCode.UNAUTHORIZED, 401);
      const forbiddenError = new ApiError('Forbidden', ApiErrorCode.FORBIDDEN, 403);
      const otherError = new ApiError('Other error', ApiErrorCode.INTERNAL_ERROR, 500);

      assertEquals(isAuthError(unauthorizedError), true);
      assertEquals(isAuthError(forbiddenError), true);
      assertEquals(isAuthError(otherError), false);
      assertEquals(isAuthError(new Error('Generic error')), false);
    });
  });

  describe('isValidationError', () => {
    it('should identify validation errors correctly', () => {
      const validationError = new ApiError('Invalid input', ApiErrorCode.VALIDATION_ERROR, 400);
      const invalidRequestError = new ApiError(
        'Invalid request',
        ApiErrorCode.INVALID_REQUEST,
        400,
      );
      const otherError = new ApiError('Other error', ApiErrorCode.INTERNAL_ERROR, 500);

      assertEquals(isValidationError(validationError), true);
      assertEquals(isValidationError(invalidRequestError), true);
      assertEquals(isValidationError(otherError), false);
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors correctly', () => {
      const networkError = new ApiError('Network error', ApiErrorCode.NETWORK_ERROR, 503);
      const otherError = new ApiError('Other error', ApiErrorCode.INTERNAL_ERROR, 500);

      assertEquals(isNetworkError(networkError), true);
      assertEquals(isNetworkError(otherError), false);
    });
  });

  describe('isPlatformError', () => {
    it('should identify platform errors correctly', () => {
      const platformApiError = new ApiError('Platform API error', ApiErrorCode.PLATFORM_ERROR, 500);
      const platformUnavailableError = new ApiError(
        'Platform unavailable',
        ApiErrorCode.PLATFORM_UNAVAILABLE,
        503,
      );
      const platformError = new PlatformError(
        'Twitter error',
        Platform.TWITTER,
        ApiErrorCode.PLATFORM_ERROR,
        false,
      );
      const otherError = new ApiError('Other error', ApiErrorCode.INTERNAL_ERROR, 500);

      assertEquals(isPlatformError(platformApiError), true);
      assertEquals(isPlatformError(platformUnavailableError), true);
      assertEquals(isPlatformError(platformError), true);
      assertEquals(isPlatformError(otherError), false);
    });
  });

  describe('isContentError', () => {
    it('should identify content errors correctly', () => {
      const policyViolationError = new ApiError(
        'Policy violation',
        ApiErrorCode.CONTENT_POLICY_VIOLATION,
        400,
      );
      const duplicateContentError = new ApiError(
        'Duplicate content',
        ApiErrorCode.DUPLICATE_CONTENT,
        400,
      );
      const otherError = new ApiError('Other error', ApiErrorCode.INTERNAL_ERROR, 500);

      assertEquals(isContentError(policyViolationError), true);
      assertEquals(isContentError(duplicateContentError), true);
      assertEquals(isContentError(otherError), false);
    });
  });

  describe('isRateLimitError', () => {
    it('should identify rate limit errors correctly', () => {
      const rateLimitError = new ApiError('Rate limited', ApiErrorCode.RATE_LIMITED, 429);
      const otherError = new ApiError('Other error', ApiErrorCode.INTERNAL_ERROR, 500);

      assertEquals(isRateLimitError(rateLimitError), true);
      assertEquals(isRateLimitError(otherError), false);
    });
  });

  describe('isRecoverableError', () => {
    it('should identify recoverable errors correctly', () => {
      const recoverableApiError = new ApiError(
        'Recoverable',
        ApiErrorCode.RATE_LIMITED,
        429,
        {},
        true,
      );
      const nonRecoverableApiError = new ApiError(
        'Non-recoverable',
        ApiErrorCode.INTERNAL_ERROR,
        500,
        {},
        false,
      );
      const recoverablePlatformError = new PlatformError(
        'Recoverable',
        Platform.TWITTER,
        ApiErrorCode.PLATFORM_ERROR,
        true,
      );
      const nonRecoverablePlatformError = new PlatformError(
        'Non-recoverable',
        Platform.TWITTER,
        ApiErrorCode.PLATFORM_ERROR,
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
      const apiError = new ApiError('API error', ApiErrorCode.INTERNAL_ERROR, 500);

      assertEquals(getErrorMessage(error), 'Generic error');
      assertEquals(getErrorMessage(apiError), 'API error');
    });

    it('should handle string errors', () => {
      assertEquals(getErrorMessage('String error'), 'String error');
    });

    it('should extract message from error-like objects', () => {
      const errorLike = { message: 'Error-like object' };

      assertEquals(getErrorMessage(errorLike), 'Error-like object');
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
      const apiError = new ApiError('API error', ApiErrorCode.VALIDATION_ERROR, 400, details);

      assertEquals(getErrorDetails(apiError), details);
    });

    it('should extract details from PlatformError', () => {
      const details = { tweetId: '12345', reason: 'duplicate' };
      const platformError = new PlatformError(
        'Platform error',
        Platform.TWITTER,
        ApiErrorCode.PLATFORM_ERROR,
        false,
        undefined,
        500,
        undefined,
        details,
      );

      assertEquals(getErrorDetails(platformError), details);
    });

    it('should extract details from error-like objects', () => {
      const details = { code: 'ERR_NETWORK', info: 'connection refused' };
      const errorLike = { message: 'Error-like object', details };

      assertEquals(getErrorDetails(errorLike), details);
    });

    it('should return undefined for other types', () => {
      assertEquals(getErrorDetails(null), undefined);
      assertEquals(getErrorDetails(undefined), undefined);
      assertEquals(getErrorDetails({}), undefined);
      assertEquals(getErrorDetails(new Error('Generic error')), undefined);
    });
  });

  describe('enrichErrorWithContext', () => {
    it('should add context to ApiError details', () => {
      const apiError = new ApiError('API error', ApiErrorCode.INTERNAL_ERROR, 500, {
        original: 'detail',
      });
      const context = { operation: 'createPost', timestamp: Date.now() };

      const enriched = enrichErrorWithContext(apiError, context);

      assertEquals(enriched instanceof ApiError, true);
      const enrichedApiError = enriched as ApiError;
      assertEquals(enrichedApiError.details?.original, 'detail'); // Original details preserved
      assertEquals(enrichedApiError.details?.operation, 'createPost'); // Context added
      assertEquals(enrichedApiError.details?.timestamp, context.timestamp); // Context added
    });

    it('should add context to PlatformError details', () => {
      const platformError = new PlatformError(
        'Platform error',
        Platform.TWITTER,
        ApiErrorCode.PLATFORM_ERROR,
        false,
        undefined,
        500,
        undefined,
        { original: 'detail' },
      );
      const context = { operation: 'createPost', timestamp: Date.now() };

      const enriched = enrichErrorWithContext(platformError, context);

      assertEquals(enriched instanceof PlatformError, true);
      const enrichedPlatformError = enriched as PlatformError;
      assertEquals(enrichedPlatformError.details?.original, 'detail'); // Original details preserved
      assertEquals(enrichedPlatformError.details?.operation, 'createPost'); // Context added
      assertEquals(enrichedPlatformError.details?.timestamp, context.timestamp); // Context added
    });

    it('should create ApiError for regular Error', () => {
      const error = new Error('Generic error');
      const context = { operation: 'createPost', timestamp: Date.now() };

      const enriched = enrichErrorWithContext(error, context);

      assertEquals(enriched instanceof ApiError, true);
      assertEquals(enriched instanceof ApiError, true);
      const enrichedApiError = enriched as ApiError;
      assertEquals(enrichedApiError.message, 'Generic error');
      assertEquals(enrichedApiError.code, ApiErrorCode.INTERNAL_ERROR);
      assertEquals(enrichedApiError.details?.operation, 'createPost');
      assertEquals(enrichedApiError.details?.timestamp, context.timestamp);
      assertEquals('originalError' in enrichedApiError.details!, true);
    });
  });

  describe('apiWrapper', () => {
    it('should return successful API call result', async () => {
      const result = { success: true, data: { id: '123' } };
      const apiCall = async () => result;

      const response = await apiWrapper(apiCall);

      assertEquals(response, result);
    });

    it('should handle Response errors', async () => {
      const errorData = {
        error: { code: ApiErrorCode.VALIDATION_ERROR, message: 'Invalid input' },
      };
      const response = new Response(JSON.stringify(errorData), { status: 400 });
      const apiCall = async () => {
        throw response;
      };
      const context = { operation: 'createPost' };

      try {
        await apiWrapper(apiCall, context);
        assertEquals(true, false, 'Should have thrown an error');
      } catch (error) {
        assertEquals(error instanceof ApiError, true);
        assertEquals((error as ApiError).code, ApiErrorCode.VALIDATION_ERROR);
        assertEquals((error as ApiError).message, 'Invalid input');
        assertEquals((error as ApiError).details?.operation, 'createPost');
      }
    });

    it('should handle ApiError', async () => {
      const apiError = new ApiError('API error', ApiErrorCode.INTERNAL_ERROR, 500);
      const apiCall = async () => {
        throw apiError;
      };
      const context = { operation: 'createPost' };

      try {
        await apiWrapper(apiCall, context);
        assertEquals(true, false, 'Should have thrown an error');
      } catch (error) {
        assertEquals(error instanceof ApiError, true);
        const enrichedError = error as ApiError;
        assertEquals(enrichedError.message, apiError.message);
        assertEquals(enrichedError.code, apiError.code);
        assertEquals(enrichedError.status, apiError.status);
        assertEquals(enrichedError.details?.operation, 'createPost');
      }
    });

    it('should handle PlatformError', async () => {
      const platformError = new PlatformError(
        'Platform error',
        Platform.TWITTER,
        ApiErrorCode.PLATFORM_ERROR,
        false,
      );
      const apiCall = async () => {
        throw platformError;
      };
      const context = { operation: 'createPost' };

      try {
        await apiWrapper(apiCall, context);
        assertEquals(true, false, 'Should have thrown an error');
      } catch (error) {
        assertEquals(error instanceof PlatformError, true);
        const enrichedError = error as PlatformError;
        assertEquals(enrichedError.message, platformError.message);
        assertEquals(enrichedError.code, platformError.code);
        assertEquals(enrichedError.platform, platformError.platform);
        assertEquals(enrichedError.details?.operation, 'createPost');
      }
    });

    it('should wrap unknown errors', async () => {
      const unknownError = new Error('Unknown error');
      const apiCall = async () => {
        throw unknownError;
      };
      const context = { operation: 'createPost' };

      try {
        await apiWrapper(apiCall, context);
        assertEquals(true, false, 'Should have thrown an error');
      } catch (error) {
        assertEquals(error instanceof ApiError, true);
        assertEquals((error as ApiError).message, 'Unknown error');
        assertEquals((error as ApiError).code, ApiErrorCode.INTERNAL_ERROR);
        assertEquals((error as ApiError).details?.operation, 'createPost');
        assertEquals((error as ApiError).details?.originalError !== undefined, true);
      }
    });
  });
});
