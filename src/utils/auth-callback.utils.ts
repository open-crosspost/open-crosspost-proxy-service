import { Context } from '../../deps.ts';
import { AuthCallbackResponse, PlatformName } from '@crosspost/types';


/**
 * Generates HTML content for the auth callback page that communicates with the opener window
 * @param data The data to be sent back to the opener window
 * @returns HTML string for the callback page
 */
function createCallbackHtml(data: AuthCallbackResponse, authState: { origin: string }): string {
  const message = JSON.stringify({
    type: 'AUTH_CALLBACK',
    data: {
    success: data.success,
    platform: data.platform,
    userId: data.userId,
    error: data.error,
    status: data.status,
  },
  });

  // Pass auth state to the script
  const authStateJson = JSON.stringify({ origin: authState.origin });

  const title = data.status.message;
  const bodyText = data.status.details || 
                   (data.success 
                     ? 'Your account has been connected successfully.' 
                     : data.error || 'An error occurred during authentication.');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      text-align: center;
      background: #f5f5f5;
    }
    .message {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      max-width: 400px;
      width: 100%;
    }
    .status {
      font-size: 1.2rem;
      margin-bottom: 1rem;
      color: ${data.success ? '#2da44e' : '#cf222e'};
    }
    .details {
      color: #57606a;
      margin-bottom: 1rem;
    }
    .close-info {
      font-size: 0.9rem;
      color: #57606a;
    }
  </style>
  <script src="https://unpkg.com/post-me/dist/index.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const authState = ${authStateJson};
      const authResponseData = ${message}.data;

      function updateUI(data) {
        const statusEl = document.getElementById('status');
        const detailsEl = document.getElementById('details');
        const closeEl = document.getElementById('close-info');
        
        if (data.success) {
          statusEl.textContent = 'Authentication Successful';
          detailsEl.textContent = data.details || 'Your account has been connected successfully.';
        } else {
          statusEl.textContent = 'Authentication Failed';
          detailsEl.textContent = data.details || data.error || 'An error occurred during authentication.';
        }
        closeEl.textContent = 'This window will close automatically...';
      }
      
      function showCloseMessage(messageText = 'You can safely close this window.') {
        const closeEl = document.getElementById('close-info');
        if (closeEl) closeEl.textContent = messageText;
      }

      function attemptToCloseWindow() {
        setTimeout(() => {
          try {
            window.close();
            // If window doesn't close after a short delay, show manual close message
            setTimeout(() => {
              if (!window.closed) {
                showCloseMessage();
              }
            }, 200);
          } catch (e) {
            console.error('Failed to close window:', e);
            showCloseMessage();
          }
        }, 1000); // Delay to allow user to see message
      }

      if (window.opener && PostMe) {
        const { ChildHandshake, WindowMessenger } = PostMe;
        
        const messenger = new WindowMessenger({
          localWindow: window,
          remoteWindow: window.opener,
          remoteOrigin: authState.origin 
        });

        ChildHandshake(messenger, undefined, 5000) // 5s handshake timeout, no local methods exposed by child
          .then(connection => {
            // connection.remoteHandle() is a proxy to parent's localApiMethods
            // The parent expects onAuthCallback(data: AuthCallbackResponse)
            return connection.remoteHandle().onAuthCallback(authResponseData);
          })
          .then(() => {
            console.log('Successfully sent auth data to parent via post-me.');
            updateUI(authResponseData); 
            attemptToCloseWindow();
          })
          .catch(err => {
            console.error('PostMe ChildHandshake or parent call failed:', err);
            document.getElementById('status').textContent = 'Communication Error';
            document.getElementById('details').textContent = 'Failed to communicate with the application. Please try again.';
            showCloseMessage('Please close this window and try again.');
            // Optionally, still try to close, or leave it open for debugging.
            // attemptToCloseWindow(); 
          });
      } else {
        console.warn('window.opener or PostMe not found. Cannot use post-me.');
        document.getElementById('status').textContent = 'Setup Error';
        document.getElementById('details').textContent = 'Could not initialize communication channel.';
        showCloseMessage('Please close this window and report this issue.');
      }
    });
  </script>
</head>
<body>
  <div class="message">
    <h1 id="status" class="status">${data.status.message}</h1>
    <p id="details" class="details">${bodyText}</p>
    <p id="close-info" class="close-info">This window will close automatically...</p>
  </div>
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
    status: {
      message: 'Authentication Successful',
      code: 'AUTH_SUCCESS',
      details: 'Your account has been connected successfully',
    },
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
    error: error,
    status: {
      message: 'Authentication Failed',
      code: 'AUTH_ERROR',
      details: error_description || error || 'An error occurred during authentication',
    },
  }, authState);

  c.header('Content-Type', 'text/html');
  return c.body(html);
}
