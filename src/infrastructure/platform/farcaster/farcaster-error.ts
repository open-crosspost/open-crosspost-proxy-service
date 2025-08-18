// src/infrastructure/platforms/farcaster/farcaster-error.ts
import { ApiErrorCode, ErrorDetails, Platform } from '@crosspost/types';
import { PlatformError } from '../../../errors/platform-error.js';
import { sanitizeErrorDetails } from '../../../utils/error-sanitizer.utils.js';

/**
 * Farcaster/Neynar error wrapper.
 * Maps generic HTTP/network/provider errors into your standardized PlatformError shape.
 */
export class FarcasterError extends PlatformError {
  constructor(
    message: string,
    code: ApiErrorCode = ApiErrorCode.PLATFORM_ERROR,
    details?: ErrorDetails,
    recoverable = false,
  ) {
    super(message, code, Platform.FARCASTER, details, recoverable);
  }

  /**
   * Convert any Neynar/client error into FarcasterError.
   */
  static fromNeynarError(error: unknown): FarcasterError {
    // Already normalized
    if (error instanceof PlatformError) return error as FarcasterError;

    // Extract common fields from axios/fetch/custom errors
    const info = FarcasterError.extractInfo(error);
    const { status, message, data, headers, url, method, isNetwork, retryAfter } = info;

    // Network-level failures
    if (isNetwork) {
      return new FarcasterError(
        `Network error contacting Neynar: ${message}`,
        ApiErrorCode.NETWORK_ERROR,
        sanitizeErrorDetails(info),
        true,
      );
    }

    // Status-based mapping (reuse existing codes)
    if (typeof status === 'number') {
      // Specific heuristics for signer flows
      const text = FarcasterError.buildMessage(message, data);
      if (status === 401) {
        return new FarcasterError(
          `Unauthorized with Neynar: ${text}`,
          ApiErrorCode.UNAUTHORIZED,
          sanitizeErrorDetails(info),
          true,
        );
      }
      if (status === 403) {
        // Often "signer pending approval" or permission issue
        return new FarcasterError(
          `Forbidden by Neynar: ${text}`,
          ApiErrorCode.FORBIDDEN,
          sanitizeErrorDetails(info),
          true,
        );
      }
      if (status === 404) {
        return new FarcasterError(
          `Resource not found on Neynar: ${text}`,
          ApiErrorCode.NOT_FOUND,
          sanitizeErrorDetails(info),
          false,
        );
      }
      if (status === 429) {
        const extra: ErrorDetails = { ...info, retryAfter };
        return new FarcasterError(
          `Rate limited by Neynar${retryAfter ? `, retry after ${retryAfter}s` : ''}: ${message}`,
          ApiErrorCode.RATE_LIMITED,
          sanitizeErrorDetails(extra),
          true,
        );
      }
      if (status >= 500) {
        return new FarcasterError(
          `Neynar service unavailable: ${message}`,
          ApiErrorCode.PLATFORM_UNAVAILABLE,
          sanitizeErrorDetails(info),
          true,
        );
      }
      if (status === 400) {
        return new FarcasterError(
          `Invalid request to Neynar: ${FarcasterError.buildMessage(message, data)}`,
          ApiErrorCode.INVALID_REQUEST,
          sanitizeErrorDetails(info),
          false,
        );
      }

      // Fallback for other 4xx
      return new FarcasterError(
        `Neynar API error (${status}): ${FarcasterError.buildMessage(message, data)}`,
        ApiErrorCode.PLATFORM_ERROR,
        sanitizeErrorDetails(info),
        false,
      );
    }

    // No status & not network: unknown
    return new FarcasterError(
      `Unknown Neynar error: ${message}`,
      ApiErrorCode.UNKNOWN_ERROR,
      sanitizeErrorDetails({ originalError: error }),
      false,
    );
  }

  /** ------------ helpers ------------ */

  private static buildMessage(message?: string, data?: any): string {
    const detail =
      (typeof data === 'object' && data
        ? (data.message || data.detail || data.error || data.reason)
        : undefined) || '';
    return [message, detail].filter(Boolean).join(' — ');
  }

  /**
   * Normalize various error shapes (axios, fetch, generic).
   */
  private static extractInfo(e: any): {
    status?: number;
    message: string;
    data?: any;
    headers?: any;
    url?: string;
    method?: string;
    isNetwork: boolean;
    retryAfter?: number;
  } {
    // axios-like
    const ax = e?.isAxiosError ? e : undefined;
    const resp = ax ? ax.response : e?.response;
    const req = ax ? ax.config : e?.request;

    const status = resp?.status ?? e?.status ?? e?.code;
    const headers = resp?.headers ?? e?.headers;
    const data = resp?.data ?? e?.data;
    const url = req?.url ?? e?.url;
    const method = req?.method ?? e?.method;

    const retryAfterHeader = headers?.['retry-after'] ?? headers?.['Retry-After'];
    const retryAfter =
      typeof retryAfterHeader === 'string' ? parseInt(retryAfterHeader, 10) : undefined;

    // fetch/node errors
    const name = e?.name;
    const code = e?.code;
    const msg = e?.message || resp?.statusText || 'Unknown error';

    const isNetwork =
      e?.type === 'system' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN' ||
      name === 'FetchError' ||
      msg?.toLowerCase?.().includes('network') ||
      msg?.toLowerCase?.().includes('fetch failed');

    return { status: typeof status === 'number' ? status : undefined, message: msg, data, headers, url, method, isNetwork, retryAfter };
  }
}
