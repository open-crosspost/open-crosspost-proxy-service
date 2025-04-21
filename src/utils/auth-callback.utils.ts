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
  status: {
    message: string;
    code: string;
    details?: string;
  };
}

/**
 * Generates HTML content for the auth callback page that communicates with the opener window
 * @param data The data to be sent back to the opener window
 * @returns HTML string for the callback page
 */
function createCallbackHtml(data: AuthCallbackData, authState: { origin: string }): string {
  // Create status object
  const status = {
    message: data.success ? 'Authentication Successful' : 'Authentication Failed',
    code: data.success ? 'AUTH_SUCCESS' : 'AUTH_ERROR',
    details: data.success
      ? 'Your account has been connected successfully'
      : data.error_description || data.error || 'An error occurred during authentication',
  };

  // Add status to the message data
  const message = JSON.stringify({
    type: 'AUTH_CALLBACK',
    data: {
      ...data,
      status,
    },
  });

  // Pass auth state to the script
  const authStateJson = JSON.stringify({ origin: authState.origin });

  const title = status.message;
  const bodyText = status.details;

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
  <script>
    (function() {
      // Initialize auth state from server
      const authState = ${authStateJson};
      let messageSent = false;
      
      function updateUI(data) {
        const statusEl = document.getElementById('status');
        const detailsEl = document.getElementById('details');
        const closeEl = document.getElementById('close-info');
        
        if (data.success) {
          statusEl.textContent = 'Authentication Successful';
          detailsEl.textContent = 'Your account has been connected successfully.';
        } else {
          statusEl.textContent = 'Authentication Failed';
          detailsEl.textContent = data.error || 'An error occurred during authentication.';
        }
        closeEl.textContent = 'This window will close automatically...';
      }
      
      function showCloseMessage() {
        document.getElementById('close-info').textContent = 'You can safely close this window.';
      }
      
      function sendMessageAndClose() {
        if (messageSent) return;
        
        try {
          const message = ${message};
          if (window.opener) {
            // Send message to opener first
            window.opener.postMessage(message, authState.origin);
            messageSent = true;

            // Update UI
            updateUI(message.data);
            
            // Close after a short delay
            setTimeout(() => {
              try {
                window.close();
                // If window doesn't close after 100ms, show manual close message
                setTimeout(() => {
                  if (!window.closed) {
                    showCloseMessage();
                  }
                }, 100);
              } catch (e) {
                console.error('Failed to close window:', e);
                showCloseMessage();
              }
            }, 1000); // Give time for the user to see the success message
          } else {
            console.warn('window.opener not found. Cannot post message.');
            document.getElementById('status').textContent = 'Authentication Complete';
            document.getElementById('details').textContent = 'The authentication process has completed, but we could not communicate with the main window.';
            showCloseMessage();
          }
        } catch (e) {
          console.error('Error posting message to opener:', e);
          document.getElementById('status').textContent = 'Authentication Error';
          document.getElementById('details').textContent = 'An error occurred while completing the authentication process.';
          showCloseMessage();
        }
      }

      // Send message immediately when the script runs
      sendMessageAndClose();
    })();
  </script>
</head>
<body>
  <div class="message">
    <h1 id="status" class="status">${status.message}</h1>
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
    error,
    error_description,
    status: {
      message: 'Authentication Failed',
      code: 'AUTH_ERROR',
      details: error_description || error || 'An error occurred during authentication',
    },
  }, authState);

  c.header('Content-Type', 'text/html');
  return c.body(html);
}
