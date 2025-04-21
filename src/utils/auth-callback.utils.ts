import { Context } from '../../deps.ts';
import { PlatformName } from '@crosspost/types';

/**
 * Interface for the data to be sent back to the frontend via postMessage
 */
export interface AuthCallbackData {
  success: boolean;
  platform: PlatformName;
  userId?: string;
  error?: string;
  error_description?: string;
}

/**
 * Generates HTML content for the auth callback page that communicates with the opener window
 * @param data The data to be sent back to the opener window
 * @returns HTML string for the callback page
 */
function createCallbackHtml(data: AuthCallbackData): string {
  const message = JSON.stringify({
    type: 'AUTH_CALLBACK',
    data: data,
  });

  const title = data.success ? 'Authentication Success' : 'Authentication Failed';
  const bodyText = data.success
    ? 'Authentication successful. Closing window...'
    : `Authentication failed: ${data.error || 'Unknown error'}. Closing window...`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <script>
    try {
      const message = ${message};
      if (window.opener) {
        // IMPORTANT: In a real application, specify the exact target origin
        // instead of '*' for security.
        window.opener.postMessage(message, '*');
      } else {
        console.warn('window.opener not found. Cannot post message.');
      }
    } catch (e) {
      console.error('Error posting message to opener:', e);
    } finally {
      // Attempt to close the window after a short delay
      setTimeout(() => window.close(), 500);
    }
  </script>
</head>
<body>
  <p>${bodyText}</p>
  <p>You can close this window manually if it doesn't close automatically.</p>
</body>
</html>
  `.trim();
}

/**
 * Creates a success response for the auth callback
 * @param c The Hono context
 * @param platform The platform name
 * @param userId The user ID
 * @returns Response with HTML content
 */
export function createSuccessCallbackResponse(
  c: Context,
  platform: PlatformName,
  userId: string,
): Response {
  const html = createCallbackHtml({
    success: true,
    platform,
    userId,
  });

  c.header('Content-Type', 'text/html');
  return c.body(html);
}

/**
 * Creates an error response for the auth callback
 * @param c The Hono context
 * @param platform The platform name
 * @param error The error message
 * @param error_description Optional detailed error description
 * @returns Response with HTML content
 */
export function createErrorCallbackResponse(
  c: Context,
  platform: PlatformName,
  error: string,
  error_description?: string,
): Response {
  const html = createCallbackHtml({
    success: false,
    platform,
    error,
    error_description,
  });

  c.header('Content-Type', 'text/html');
  return c.body(html);
}
