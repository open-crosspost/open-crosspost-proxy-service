/**
 * Maps Neynar API errors to proper error types with status codes
 * Handles various error shapes (Axios, fetch, generic) and maps them to user-friendly messages
 */
export function mapNeynarError(error: unknown): Error {
  // Extract error information from various error types (Axios, fetch, etc.)
  const info = extractErrorInfo(error);
  const { status, message, data } = info;

  // Network errors
  if (info.isNetwork) {
    return new Error(`Network error contacting Neynar: ${message}`);
  }

  // Status code based mapping
  if (typeof status === 'number') {
    const detail = buildErrorMessage(message, data);
    
    switch (status) {
      case 401:
        return new Error(`Unauthorized with Neynar: ${detail}`);
      case 403:
        return new Error(`Forbidden by Neynar (signer may be pending approval): ${detail}`);
      case 404:
        return new Error(`Resource not found on Neynar: ${detail}`);
      case 429:
        const retryAfter = info.retryAfter ? `, retry after ${info.retryAfter}s` : '';
        return new Error(`Rate limited by Neynar${retryAfter}: ${detail}`);
      case 400:
        return new Error(`Invalid request to Neynar: ${detail}`);
      case 402:
        return new Error(`Payment required: ${detail}. Upgrade to a paid Neynar plan.`);
      default:
        if (status >= 500) {
          return new Error(`Neynar service unavailable (${status}): ${detail}`);
        }
        return new Error(`Neynar API error (${status}): ${detail}`);
    }
  }

  // Unknown error
  return new Error(`Unknown Neynar error: ${message || 'Unknown error'}`);
}

/**
 * Extract error information from various error shapes
 */
function extractErrorInfo(error: unknown): {
  status?: number;
  message: string;
  data?: any;
  headers?: any;
  isNetwork: boolean;
  retryAfter?: number;
} {
  // Axios errors
  const ax = (error as any)?.isAxiosError ? error : undefined;
  const resp = ax ? (error as any).response : (error as any)?.response;
  const req = ax ? (error as any).config : (error as any)?.request;

  const status = resp?.status ?? (error as any)?.status ?? (error as any)?.statusCode;
  const headers = resp?.headers ?? (error as any)?.headers;
  const data = resp?.data ?? (error as any)?.data;
  const url = req?.url ?? (error as any)?.url;
  const method = req?.method ?? (error as any)?.method;

  const retryAfterHeader = headers?.['retry-after'] ?? headers?.['Retry-After'];
  const retryAfter = typeof retryAfterHeader === 'string'
    ? parseInt(retryAfterHeader, 10)
    : undefined;

  // Network error detection
  const name = (error as any)?.name;
  const code = (error as any)?.code;
  const msg = (error as any)?.message || resp?.statusText || 'Unknown error';

  const isNetwork = (error as any)?.type === 'system' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    name === 'FetchError' ||
    msg?.toLowerCase?.().includes('network') ||
    msg?.toLowerCase?.().includes('fetch failed');

  return {
    status: typeof status === 'number' ? status : undefined,
    message: msg,
    data,
    headers,
    isNetwork,
    retryAfter,
  };
}

/**
 * Build error message from message and data
 */
function buildErrorMessage(message?: string, data?: any): string {
  const detail =
    (typeof data === 'object' && data
      ? (data.message || data.detail || data.error || data.reason || JSON.stringify(data))
      : undefined) || '';
  return [message, detail].filter(Boolean).join(' — ');
}

