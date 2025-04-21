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
function createCallbackHtml(data: AuthCallbackData, authState: { origin: string }): string {
  const message = JSON.stringify({
    type: 'AUTH_CALLBACK',
    data: data,
  });

  // Pass auth state to the script
  const authStateJson = JSON.stringify({ origin: authState.origin });

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
    (function() {
      // Initialize auth state from server
      const authState = ${authStateJson};
      let messageSent = false;
      
      function sendMessageAndClose() {
        if (messageSent) return;
        
        try {
          const message = ${message};
          if (window.opener) {
            // Use the stored origin from auth state for secure messaging
            window.opener.postMessage(message, authState.origin);
            messageSent = true;
            
            // Close window after ensuring message was sent
            setTimeout(() => {
              window.close();
              // If window.close() fails (some browsers), redirect to blank
              setTimeout(() => {
                if (!window.closed) {
                  document.body.innerHTML = '<p>Authentication complete. You can close this window.</p>';
                }
              }, 100);
            }, 100);
          } else {
            console.warn('window.opener not found. Cannot post message.');
            document.body.innerHTML = '<p>Authentication complete. You can close this window.</p>';
          }
        } catch (e) {
          console.error('Error posting message to opener:', e);
          document.body.innerHTML = '<p>Error completing authentication. Please close this window and try again.</p>';
        }
      }

      // Try to send message immediately
      sendMessageAndClose();

      // Backup: Also try on load in case script runs too early
      window.addEventListener('load', sendMessageAndClose);
    })();
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
  authState: { origin: string },
): Response {
  const html = createCallbackHtml({
    success: true,
    platform,
    userId,
  }, authState);

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
  authState: { origin: string },
  error_description?: string,
): Response {
  const html = createCallbackHtml({
    success: false,
    platform,
    error,
    error_description,
  }, authState);

  c.header('Content-Type', 'text/html');
  return c.body(html);
}
