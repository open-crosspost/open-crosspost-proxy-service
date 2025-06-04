import type { AuthCallbackResponse } from '@crosspost/types';
import { ParentHandshake, WindowMessenger, type Connection, type MethodsType } from 'post-me';

interface PopupOptions {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

interface AuthPopupLocalApi extends MethodsType {
  onAuthCallback: (data: AuthCallbackResponse) => void;
}

/**
 * Opens a popup window and returns a promise that resolves when the authentication is complete.
 * @param url The URL to open in the popup.
 * @param options Optional popup window dimensions and position.
 * @returns Promise that resolves with the authentication result.
 * @throws Error if popups are blocked or if running in a non-browser environment.
 */
export function openAuthPopup(url: string, options: PopupOptions = {}): Promise<AuthCallbackResponse> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('openAuthPopup can only be used in a browser environment'));
  }

  return new Promise((resolve, reject) => {
    const {
      width = 600,
      height = 700,
      // @ts-expect-error deno doesn't like window
      left = Math.max(0, (window.innerWidth - width) / 2),
      // @ts-expect-error deno doesn't like window
      top = Math.max(0, (window.innerHeight - height) / 2),
    } = options;

    // @ts-expect-error deno doesn't like window
    const popup = window.open(
      url,
      'authPopup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`,
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    let authDataReceived = false;
    let connectionStateHandled = false; // Tracks if connection closure or data reception has been handled
    let checkClosedIntervalId: number | undefined = undefined;
    let postMeConnection: Connection<AuthPopupLocalApi> | null = null;

    const cleanupAndResolveOrReject = (
      action: 'resolve' | 'reject',
      data: AuthCallbackResponse | Error,
    ) => {
      if (connectionStateHandled) return;
      connectionStateHandled = true;

      if (checkClosedIntervalId) clearInterval(checkClosedIntervalId);
      checkClosedIntervalId = undefined;

      postMeConnection?.close();
      postMeConnection = null;

      if (popup && !popup.closed) {
        popup.close();
      }

      if (action === 'resolve') {
        console.log("data", data);
        resolve(data as AuthCallbackResponse);
      } else {
        reject(data);
      }
    };

    const localApiMethods: AuthPopupLocalApi = {
      onAuthCallback: (data: AuthCallbackResponse) => {
        console.log('[Parent Popup] onAuthCallback invoked. Data:', data);
        if (authDataReceived || connectionStateHandled) {
          console.log('[Parent Popup] onAuthCallback: Already handled or authDataReceived. Ignoring.');
          return;
        }
        authDataReceived = true;


        if (data.success) {
          console.log('[Parent Popup] onAuthCallback: Data indicates success. Resolving promise.');
          cleanupAndResolveOrReject('resolve', data);
        } else {
          console.log('[Parent Popup] onAuthCallback: Data indicates failure. Rejecting promise.');
          cleanupAndResolveOrReject('reject', data);
        }
      },
    };

    // TODO: We need to open up an initial window first.

//     I see this:

// [Parent Popup] Initializing PostMe WindowMessenger. Remote origin for popup: https://x.com
// index.js:451 [Parent Popup] Attempting PostMe ParentHandshake...

// And so it seems that's it's probably because the initial url is The X url ... 

// And so we should instead send the url to the window, have it handshake, then handle redirect to url, then url redirects back, and then 

    console.log('[Parent Popup] Initializing PostMe WindowMessenger. Remote origin for popup:', new URL(url).origin);
    const messenger = new WindowMessenger({
      localWindow: window,
      remoteWindow: popup,
      remoteOrigin: new URL(url).origin,
    });

    console.log('[Parent Popup] Attempting PostMe ParentHandshake...');
    ParentHandshake<AuthPopupLocalApi>(messenger, localApiMethods, 5000) // 5s handshake timeout
      .then((connection: Connection<AuthPopupLocalApi>) => {
        console.log('[Parent Popup] PostMe ParentHandshake successful. Connection established.');
        postMeConnection = connection;

        // Start interval to check if user manually closed the popup
        checkClosedIntervalId = setInterval(() => {
          try {
            if (!popup || popup.closed) {
              if (!authDataReceived && !connectionStateHandled) {
                cleanupAndResolveOrReject('reject', {
                  success: false,
                  error: 'Authentication cancelled by user.',
                  status: {
                    message: 'Authentication Cancelled',
                    code: 'AUTH_CANCELLED',
                    details: 'The authentication window was closed before completion.',
                  },
                });
              } else {
                // Already handled or resolved, just clear interval
                if (checkClosedIntervalId) clearInterval(checkClosedIntervalId);
                checkClosedIntervalId = undefined;
              }
            }
          } catch (e) {
            console.warn('Error checking popup state:', e);
            if (!authDataReceived && !connectionStateHandled) {
              cleanupAndResolveOrReject('reject', {
                success: false,
                error: 'Error while checking popup state.',
                status: {
                  message: 'Popup State Error',
                  code: 'POPUP_STATE_ERROR',
                  details: e instanceof Error ? e.message : String(e),
                },
              });
            } else {
              if (checkClosedIntervalId) clearInterval(checkClosedIntervalId);
              checkClosedIntervalId = undefined;
            }
          }
        }, 500) as unknown as number;
      })
      .catch((handshakeError) => {
        console.error('[Parent Popup] PostMe ParentHandshake failed:', handshakeError);
        // Handshake failed to establish connection
        if (popup && !popup.closed) popup.close();
        cleanupAndResolveOrReject(
          'reject',
          new Error(
            `Failed to establish communication with popup: ${handshakeError instanceof Error ? handshakeError.message : String(handshakeError)
            }`,
          ),
        );
      });
  });
}
