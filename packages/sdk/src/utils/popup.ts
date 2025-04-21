import type { PlatformName } from '@crosspost/types';

declare global {
  interface Window {
    innerWidth: number;
    innerHeight: number;
    open(url: string, target: string, features: string): Window | null;
  }

  interface WindowEventMap {
    message: MessageEvent<AuthCallbackMessage>;
  }
}

interface PopupOptions {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

interface AuthCallbackData {
  success: boolean;
  platform: PlatformName;
  userId?: string;
  error?: string;
  error_description?: string;
}

interface AuthCallbackMessage {
  type: 'AUTH_CALLBACK';
  data: AuthCallbackData;
}

/**
 * Opens a popup window and returns a promise that resolves when the authentication is complete
 * @param url The URL to open in the popup
 * @param options Optional popup window dimensions and position
 * @returns Promise that resolves with the authentication result
 * @throws Error if popups are blocked or if running in a non-browser environment
 */
export function openAuthPopup(url: string, options: PopupOptions = {}): Promise<AuthCallbackData> {
  // Check for browser environment
  if (typeof window === 'undefined') {
    throw new Error('openAuthPopup can only be used in a browser environment');
  }

  return new Promise((resolve, reject) => {
    // Calculate popup dimensions and position
    const {
      width = 600,
      height = 700,
      left = Math.max(0, (window.innerWidth - 600) / 2),
      top = Math.max(0, (window.innerHeight - 700) / 2),
    } = options;

    // Open the popup
    const popup = window.open(
      url,
      'authPopup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`,
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    let messageReceived = false;

    // Function to handle messages from the popup
    function handleMessage(this: Window, event: MessageEvent<AuthCallbackMessage>) {
      // Verify the message is from our popup and popup exists
      if (!popup || event.source !== popup) {
        return;
      }

      const message = event.data;
      if (message?.type === 'AUTH_CALLBACK') {
        messageReceived = true;
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosedInterval);

        if (message.data.success) {
          resolve(message.data);
        } else {
          reject(message.data);
        }

        // Give a moment for any final operations before closing
        setTimeout(() => {
          try {
            if (popup && !popup.closed) {
              popup.close();
            }
          } catch (e) {
            console.warn('Failed to close popup window:', e);
          }
        }, 100);
      }
    }

    // Listen for messages from the popup
    window.addEventListener('message', handleMessage);

    // Check if popup was closed manually
    const checkClosedInterval = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          cleanup();
        }
      } catch (e) {
        console.warn('Error checking popup state:', e);
        cleanup();
      }
    }, 500);

    // Cleanup function to handle popup closure
    function cleanup() {
      clearInterval(checkClosedInterval);
      window.removeEventListener('message', handleMessage);

      if (!messageReceived) {
        reject(new Error('Authentication cancelled by user.'));
      }
    }
  });
}
