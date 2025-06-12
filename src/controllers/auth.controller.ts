import {
  ApiErrorCode,
  AuthUrlResponse,
  ConnectedAccountsResponse,
  errorCodeToStatusCode,
  NearAuthorizationResponse,
  NearAuthorizationStatusResponse,
  PlatformName,
  ProfileRefreshResponse,
} from '@crosspost/types';
import { Context } from '../../deps.ts';
import { AuthService } from '../domain/services/auth.service.ts';
import { ApiError, createApiError } from '../errors/api-error.ts';
import { createPlatformError, PlatformError } from '../errors/platform-error.ts';
import { NearAuthService } from '../infrastructure/security/near-auth-service.ts';
import {
  createErrorDetail,
  createErrorResponse,
  createSuccessResponse,
} from '../utils/response.utils.ts';
import {
  createErrorCallbackResponse,
  createSuccessCallbackResponse,
} from '../utils/auth-callback.utils.ts';
import { BaseController } from './base.controller.ts';

export class AuthController extends BaseController {
  constructor(
    private authService: AuthService,
    private nearAuthService: NearAuthService,
  ) {
    super();
  }

  /**
   * Initialize authentication with NEAR signature
   * @param c The Hono context
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns HTTP response with auth URL and state
   */
  async initializeAuth(c: Context, platform: PlatformName): Promise<Response> {
    try {
      // Extract and validate NEAR auth data
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      // Check if the NEAR account is authorized
      const authStatus = await this.nearAuthService.getNearAuthorizationStatus(signerId);
      const isAuthorized = authStatus >= 0; // -1 means not authorized, 0 or greater means authorized
      if (!isAuthorized) {
        console.warn(`Unauthorized NEAR account attempt: ${signerId}`);
        c.status(errorCodeToStatusCode[ApiErrorCode.FORBIDDEN]);
        return c.json(createErrorResponse(c, [createErrorDetail(
          `NEAR account ${signerId} is not authorized. Please authorize via POST /auth/authorize/near first.`,
          ApiErrorCode.FORBIDDEN,
          true,
          { platform },
        )]));
      }

      // Get the base URL of the current request
      const requestUrl = new URL(c.req.url);
      const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

      // Construct the platform-specific callback URL
      const callbackUrl = `${baseUrl}/auth/${platform}/callback`;

      // Get successUrl and errorUrl from query parameters
      const successUrl = requestUrl.searchParams.get('successUrl');
      const errorUrl = requestUrl.searchParams.get('errorUrl');

      // Get the origin from request headers
      const origin = c.req.header('origin') || c.req.header('referer');
      if (!origin) {
        throw createApiError(
          ApiErrorCode.VALIDATION_ERROR,
          'Origin header is required for authentication',
        );
      }

      // Initialize auth with the platform-specific callback URL
      // Always use redirect=false for popup-based flow
      const authData = await this.authService.initializeAuth(
        platform,
        signerId,
        callbackUrl,
        [],
        successUrl || origin,
        errorUrl || successUrl || origin,
        false, // Always false for popup-based flow
        origin,
      );

      return c.json(createSuccessResponse<AuthUrlResponse>(c, { url: authData.authUrl }));
    } catch (error) {
      console.error('Error initializing auth with NEAR:', error);
      return this.handleError(error, c);
    }
  }

  /**
   * Handle the OAuth callback
   * @param c The Hono context
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns HTTP response with user ID and tokens or a redirect
   */
  async handleCallback(c: Context, platform: PlatformName): Promise<Response> {
    try {
      // Get the query parameters from the URL
      const url = new URL(c.req.url);

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const error_description = url.searchParams.get('error_description');

      // Check for errors from the OAuth provider
      if (error) {
        const errorMessage = `${platform} authorization error: ${error}${
          error_description ? ` - ${error_description}` : ''
        }`;
        console.warn(errorMessage); // Log the error

        // Try to get auth state if we have a valid state to determine redirect behavior
        if (state) {
          try {
            const platformAuth = this.authService.getPlatformAuth(platform);
            const authState = await platformAuth.getAuthState(state);

            // If redirect=false (default), return HTML to communicate error via postMessage
            if (!authState.redirect) {
              return createErrorCallbackResponse(
                c,
                platform,
                error || 'Authorization failed',
                { origin: authState.origin },
                error_description || undefined,
              );
            }

            // If redirect=true, redirect to the error URL
            const errorRedirectUrl = new URL(authState.errorUrl);
            errorRedirectUrl.searchParams.set('error', error);
            if (error_description) {
              errorRedirectUrl.searchParams.set('error_description', error_description);
            }
            errorRedirectUrl.searchParams.set('platform', platform);
            errorRedirectUrl.searchParams.set('success', 'false');
            return c.redirect(errorRedirectUrl.toString());
          } catch {
            // If we can't get the auth state, create a platform error and handle it
            throw createPlatformError(
              ApiErrorCode.UNAUTHORIZED,
              `${platform} authorization error: ${error}${
                error_description ? ` - ${error_description}` : ''
              }`,
              platform,
            );
          }
        }

        // If no state or couldn't redirect, return a 400 error response
        throw createPlatformError(
          ApiErrorCode.UNAUTHORIZED,
          `${platform} authorization error: ${error}${
            error_description ? ` - ${error_description}` : ''
          }`,
          platform,
        );
      }

      // Validate required parameters
      if (!code || !state) {
        throw createPlatformError(
          ApiErrorCode.VALIDATION_ERROR,
          'Code and state are required',
          platform,
        );
      }

      const { userId, successUrl, redirect, origin } = await this.authService.handleCallback(
        platform,
        code,
        state,
      );

      // If redirect=false (default), return HTML to communicate success via postMessage
      if (!redirect) {
        return createSuccessCallbackResponse(
          c,
          platform,
          userId,
          { origin },
        );
      }

      // If redirect=true, perform the full redirect
      const redirectUrl = new URL(successUrl);
      redirectUrl.searchParams.set('userId', userId);
      redirectUrl.searchParams.set('platform', platform);
      redirectUrl.searchParams.set('success', 'true');

      return c.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('Error handling callback:', error);
      return this.handleError(error, c);
    }
  }

  /**
   * Refresh a user's access token
   * @param c The Hono context
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns HTTP response with success true
   */
  async refreshToken(c: Context, platform: PlatformName): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      const { userId } = c.get('validatedBody') as { userId: string };

      // Check if the tokens are linked to this NEAR account
      const hasAccess = await this.nearAuthService.hasAccess(signerId, platform, userId);
      if (!hasAccess) {
        throw createApiError(
          ApiErrorCode.UNAUTHORIZED,
          'Account not linked to this NEAR wallet',
          { platform, userId },
        );
      }

      try {
        // Delete existing tokens first to ensure clean state
        await this.nearAuthService.deleteTokens(userId, platform);

        // Refresh token
        const tokens = await this.authService.refreshToken(platform, userId);

        // Save tokens and link account
        await this.nearAuthService.saveTokens(userId, platform, tokens);
        await this.nearAuthService.linkAccount(signerId, platform, userId);
      } catch (tokenError) {
        console.error(`Error during token refresh for ${platform}:${userId}:`, tokenError);
        if (tokenError instanceof ApiError || tokenError instanceof PlatformError) {
          throw tokenError;
        }
        throw createPlatformError(
          ApiErrorCode.TOKEN_REFRESH_FAILED,
          `Failed to refresh token for ${platform}:${userId}. ${
            tokenError instanceof Error ? tokenError.message : 'Unknown error'
          }`,
          platform,
          { userId },
        );
      }
      return c.json(createSuccessResponse(c, { success: true }));
    } catch (error) {
      console.error('Error refreshing token:', error);
      return this.handleError(error, c);
    }
  }

  /**
   * Revoke a user's tokens
   * @param c The Hono context
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns HTTP response with success status
   */
  async revokeToken(c: Context, platform: PlatformName): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      const { userId } = c.get('validatedBody') as { userId: string };

      // Validate userId
      if (!userId) {
        throw createApiError(ApiErrorCode.VALIDATION_ERROR, 'userId is required');
      }

      let tokenRevoked = false;
      let revokeError: string | undefined;

      // First try to revoke the token, but don't let failure stop us
      try {
        tokenRevoked = await this.authService.revokeToken(platform, userId);
      } catch (e) {
        console.error('Error revoking token:', e);
        revokeError = e instanceof Error ? e.message : 'Unknown error revoking token';
      }

      // Then unlink the account - this is critical and must succeed
      try {
        await this.authService.unlinkAccount(signerId, platform, userId);
      } catch (unlinkError) {
        console.error('Error unlinking account:', unlinkError);
        throw unlinkError;
      }

      // Return success since unlinking succeeded (if we got here)
      return c.json(createSuccessResponse(c, {
        success: true,
        tokenRevoked,
        error: revokeError,
      }));
    } catch (error) {
      console.error('Error revoking token:', error);
      return this.handleError(error, c);
    }
  }

  /**
   * Check if a user has valid tokens
   * @param c The Hono context
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns HTTP response with validity status
   */
  async hasValidTokens(c: Context, platform: PlatformName): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      const { userId } = c.get('validatedParams');

      // Check if user has valid tokens
      const hasTokens = await this.authService.hasValidTokens(platform, userId);

      // Also check if the tokens are linked to this NEAR account
      const isLinked = await this.nearAuthService.hasAccess(signerId, platform, userId);

      // Return validity status
      return c.json(createSuccessResponse(c, { hasTokens, isLinked }));
    } catch (error) {
      console.error('Error checking tokens:', error);
      return this.handleError(error, c);
    }
  }

  /**
   * List all connected accounts for a NEAR wallet
   * @param c The Hono context
   * @returns HTTP response with connected accounts
   */
  async listConnectedAccounts(c: Context): Promise<Response> {
    try {
      const signerId = c.get('signerId') as string;

      // Get all connected accounts
      const accounts = await this.nearAuthService.getLinkedAccounts(signerId);

      // Fetch user profiles for each account
      const accountsWithProfiles = await Promise.all(
        accounts.map(async (account) => {
          // Get the user profile (with automatic refresh if needed)
          const profile = await this.authService.getUserProfile(account.platform, account.userId);

          return {
            platform: account.platform,
            userId: account.userId,
            connectedAt: account.connectedAt,
            profile: profile,
          };
        }),
      );

      // Return the accounts with profiles
      return c.json(
        createSuccessResponse<ConnectedAccountsResponse>(c, { accounts: accountsWithProfiles }),
      );
    } catch (error) {
      console.error('Error listing connected accounts:', error);
      return this.handleError(error, c);
    }
  }

  /**
   * Authorize a NEAR account for interaction with the proxy.
   * @param c The Hono context
   * @returns HTTP response indicating success or failure of authorization.
   */
  async authorizeNear(c: Context): Promise<Response> {
    try {
      // Extract and validate NEAR auth data from the header
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      // Authorize the NEAR account
      const result = await this.nearAuthService.authorizeNearAccount(signerId);

      if (result.success) {
        return c.json(
          createSuccessResponse<NearAuthorizationResponse>(c, {
            signerId: signerId,
            isAuthorized: true,
          }),
        );
      } else {
        throw createApiError(
          ApiErrorCode.INTERNAL_ERROR,
          `Failed to authorize NEAR account: ${result.error}`,
        );
      }
    } catch (error) {
      console.error('Unexpected error authorizing NEAR account:', error);
      return this.handleError(error, c);
    }
  }

  /**
   * Unauthorize a NEAR account, removing its ability to interact with the proxy.
   * Also removes all linked accounts associated with the NEAR account.
   * @param c The Hono context
   * @returns HTTP response indicating success or failure of unauthorization.
   */
  async unauthorizeNear(c: Context): Promise<Response> {
    try {
      // Extract and validate NEAR auth data from the header
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      // Get all linked accounts before removing authorization
      const linkedAccounts = await this.nearAuthService.getLinkedAccounts(signerId);

      // Track any errors that occur during account unlinking
      const unlinkErrors: Array<{ platform: PlatformName; userId: string; error: string }> = [];

      // Revoke tokens and unlink all connected accounts
      for (const account of linkedAccounts) {
        try {
          // Revoke token from the platform
          await this.authService.revokeToken(account.platform, account.userId);

          // Unlink the account from the NEAR wallet
          await this.authService.unlinkAccount(
            signerId,
            account.platform,
            account.userId,
          );

          console.log(
            `Unlinked ${account.platform} account ${account.userId} from NEAR wallet ${signerId}`,
          );
        } catch (unlinkError) {
          console.error(
            `Error unlinking account ${account.platform}:${account.userId}:`,
            unlinkError,
          );
          unlinkErrors.push({
            platform: account.platform,
            userId: account.userId,
            error: unlinkError instanceof Error ? unlinkError.message : 'Unknown error',
          });
        }
      }

      // Unauthorize the NEAR account
      const result = await this.nearAuthService.unauthorizeNearAccount(signerId);

      if (result.success) {
        return c.json(createSuccessResponse(c, {
          signerId: signerId,
          accountsUnlinked: linkedAccounts.length,
          unlinkErrors: unlinkErrors.length > 0 ? unlinkErrors : undefined,
        }));
      } else {
        throw createApiError(
          ApiErrorCode.INTERNAL_ERROR,
          `Failed to unauthorize NEAR account: ${result.error}`,
        );
      }
    } catch (error) {
      console.error('Unexpected error unauthorizing NEAR account:', error);
      return this.handleError(error, c);
    }
  }

  /**
   * Check if a NEAR account is authorized to interact with the proxy.
   * @param c The Hono context
   * @returns HTTP response indicating whether the account is authorized.
   */
  async checkNearAuthorizationStatus(c: Context): Promise<Response> {
    try {
      // Extract and validate NEAR auth data from the header
      const signerId = this.nearAuthService.extractNearAccountHeader(c);

      // Check the NEAR account authorization status
      const authStatus = await this.nearAuthService.getNearAuthorizationStatus(signerId);
      const isAuthorized = authStatus >= 0; // -1 means not authorized, 0 or greater means authorized

      return c.json(createSuccessResponse<NearAuthorizationStatusResponse>(c, {
        signerId,
        isAuthorized,
      }));
    } catch (error) {
      console.error('Unexpected error checking NEAR account authorization status:', error);
      return this.handleError(error, c);
    }
  }

  /**
   * Refresh a user's profile from the platform API
   * @param c The Hono context
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns HTTP response with the refreshed profile
   */
  async refreshUserProfile(c: Context, platform: PlatformName): Promise<Response> {
    try {
      // Extract and validate NEAR auth data from the header
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);
      const { userId } = c.get('validatedBody') as { userId: string };

      // Check if the tokens are linked to this NEAR account
      const hasAccess = await this.nearAuthService.hasAccess(signerId, platform, userId);
      if (!hasAccess) {
        throw createApiError(ApiErrorCode.UNAUTHORIZED, 'Account not linked to this NEAR wallet');
      }

      // Force refresh the user profile
      const profile = await this.authService.getUserProfile(platform, userId, true);

      if (!profile) {
        throw createPlatformError(ApiErrorCode.NOT_FOUND, 'User profile not found', platform);
      }

      // Return the refreshed profile
      return c.json(createSuccessResponse<ProfileRefreshResponse>(c, { profile }));
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      return this.handleError(error, c);
    }
  }
}
