/**
 * NearSigner class for generating NEAR wallet signatures
 */

import * as nacl from 'tweetnacl';
import * as bs58 from 'bs58';
import {
  NearAuthData,
  NearAuthPayload,
  NearSignerOptions,
  SignatureResult,
  ValidationResult,
} from '../types.js';
import {
  base64ToUint8Array,
  createAuthHeader,
  generateNonce,
  stringToUint8Array,
  uint8ArrayToBase64,
  validateNonce,
} from '../utils/index.js';

/**
 * NearSigner class for generating NEAR wallet signatures
 */
export class NearSigner {
  private readonly options: NearSignerOptions;
  private account: { accountId: string; publicKey: string } | null = null;
  private readonly ED25519_PREFIX = 'ed25519:';
  private readonly TAG = 2147484061;
  private readonly DEFAULT_RECIPIENT = 'crosspost.near';

  /**
   * Constructor
   * @param options NearSigner options
   */
  constructor(options: NearSignerOptions) {
    this.options = {
      ...options,
      defaultRecipient: options.defaultRecipient || this.DEFAULT_RECIPIENT,
    };

    // If accountId and keyPair are provided, set the account
    if (options.accountId && options.keyPair) {
      this.account = {
        accountId: options.accountId,
        publicKey: options.keyPair.getPublicKey().toString(),
      };
    }
  }

  /**
   * Connect to NEAR wallet (browser only)
   * @returns Connected account
   */
  async connect(): Promise<{ accountId: string; publicKey: string }> {
    if (typeof window === 'undefined') {
      throw new Error('connect() is only available in browser environment');
    }

    // This is a placeholder for actual wallet connection logic
    // In a real implementation, this would use near-api-js or wallet-selector
    console.warn('NearSigner.connect() is a placeholder. Implement actual wallet connection logic.');

    // Simulate a successful connection
    this.account = {
      accountId: 'example.testnet',
      publicKey: 'ed25519:8hSHprDq2StXwMtNd43wDTXQYsjXcD4MJxUTvwtnmM4T',
    };

    return this.account;
  }

  /**
   * Get the connected account
   * @returns Connected account or null if not connected
   */
  getAccount(): { accountId: string; publicKey: string } | null {
    return this.account;
  }

  /**
   * Sign a message
   * @param message Message to sign
   * @param recipient Recipient of the message (default: options.defaultRecipient)
   * @param callbackUrl Callback URL (optional)
   * @returns Signature result
   */
  async sign(
    message: string,
    recipient?: string,
    callbackUrl?: string,
  ): Promise<SignatureResult> {
    if (!this.account) {
      throw new Error('Not connected to NEAR wallet');
    }

    const nonce = generateNonce();
    const nonceBytes = this.padNonce(nonce);
    const actualRecipient = recipient || this.options.defaultRecipient || this.DEFAULT_RECIPIENT;

    // Create payload
    const payload: NearAuthPayload = {
      tag: this.TAG,
      message,
      nonce: nonceBytes,
      receiver: actualRecipient,
      callback_url: callbackUrl,
    };

    // Serialize payload
    const serializedPayload = this.serializePayload(payload);

    // Hash the payload
    const payloadHash = await this.hashPayload(serializedPayload);

    // Sign the hash
    const signature = await this.signHash(payloadHash);

    return {
      accountId: this.account.accountId,
      publicKey: this.account.publicKey,
      signature,
      message,
      nonce,
      recipient: actualRecipient,
      callbackUrl,
    };
  }

  /**
   * Create an authentication header for the Crosspost API
   * @param message Message to sign
   * @param recipient Recipient of the message (default: options.defaultRecipient)
   * @param callbackUrl Callback URL (optional)
   * @returns Auth header string
   */
  async createAuthHeader(
    message: string,
    recipient?: string,
    callbackUrl?: string,
  ): Promise<string> {
    const signatureResult = await this.sign(message, recipient, callbackUrl);

    const authData: NearAuthData = {
      account_id: signatureResult.accountId,
      public_key: signatureResult.publicKey,
      signature: signatureResult.signature,
      message: signatureResult.message,
      nonce: signatureResult.nonce,
      recipient: signatureResult.recipient,
      callback_url: signatureResult.callbackUrl,
    };

    return createAuthHeader(authData);
  }

  /**
   * Validate a signature
   * @param signature Signature to validate
   * @param message Message that was signed
   * @param publicKey Public key to validate against
   * @param nonce Nonce used for signing
   * @param recipient Recipient of the message
   * @returns Validation result
   */
  async validateSignature(
    signature: string,
    message: string,
    publicKey: string,
    nonce: string,
    recipient: string = this.DEFAULT_RECIPIENT,
  ): Promise<ValidationResult> {
    try {
      // Validate nonce
      const nonceValidation = validateNonce(nonce);
      if (!nonceValidation.valid) {
        return nonceValidation;
      }

      const nonceBytes = this.padNonce(nonce);

      // Create payload
      const payload: NearAuthPayload = {
        tag: this.TAG,
        message,
        nonce: nonceBytes,
        receiver: recipient,
      };

      // Serialize payload
      const serializedPayload = this.serializePayload(payload);

      // Hash the payload
      const payloadHash = await this.hashPayload(serializedPayload);

      // Decode the signature
      const signatureBytes = base64ToUint8Array(signature);

      // Decode the public key (remove ed25519: prefix if present)
      const publicKeyString = publicKey.startsWith(this.ED25519_PREFIX)
        ? publicKey.substring(this.ED25519_PREFIX.length)
        : publicKey;

      // Use bs58 to decode the public key
      const publicKeyBytes = bs58.decode(publicKeyString);

      // Verify the signature
      const isValid = nacl.sign.detached.verify(payloadHash, signatureBytes, publicKeyBytes);

      return {
        valid: isValid,
        error: isValid ? undefined : 'Invalid signature',
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error validating signature',
      };
    }
  }

  /**
   * Pad a nonce to 32 bytes
   * @param nonce Nonce string
   * @returns Padded nonce as Uint8Array
   */
  private padNonce(nonce: string): Uint8Array {
    // Convert nonce to a proper format (padded to 32 bytes)
    const paddedNonce = nonce.padStart(32, '0');
    return stringToUint8Array(paddedNonce);
  }

  /**
   * Serialize a payload
   * @param payload Payload to serialize
   * @returns Serialized payload as Uint8Array
   */
  private serializePayload(payload: NearAuthPayload): Uint8Array {
    // This is a placeholder for actual Borsh serialization
    // In a real implementation, this would use borsh or a similar library
    console.warn('serializePayload() is a placeholder. Implement actual Borsh serialization.');

    // Simulate serialization by concatenating values
    const tagBytes = new Uint8Array(4);
    new DataView(tagBytes.buffer).setUint32(0, payload.tag, true);

    const messageBytes = stringToUint8Array(payload.message);
    const receiverBytes = stringToUint8Array(payload.receiver);
    const callbackUrlBytes = payload.callback_url
      ? stringToUint8Array(payload.callback_url)
      : new Uint8Array(0);

    // Create a buffer to hold all the data
    const buffer = new Uint8Array(
      tagBytes.length +
        messageBytes.length +
        4 + // message length prefix
        payload.nonce.length +
        receiverBytes.length +
        4 + // receiver length prefix
        (payload.callback_url ? callbackUrlBytes.length + 4 : 1), // callback_url length prefix or 0 for none
    );

    let offset = 0;

    // Write tag
    buffer.set(tagBytes, offset);
    offset += tagBytes.length;

    // Write message length and message
    new DataView(buffer.buffer).setUint32(offset, messageBytes.length, true);
    offset += 4;
    buffer.set(messageBytes, offset);
    offset += messageBytes.length;

    // Write nonce
    buffer.set(payload.nonce, offset);
    offset += payload.nonce.length;

    // Write receiver length and receiver
    new DataView(buffer.buffer).setUint32(offset, receiverBytes.length, true);
    offset += 4;
    buffer.set(receiverBytes, offset);
    offset += receiverBytes.length;

    // Write callback_url (if present)
    if (payload.callback_url) {
      new DataView(buffer.buffer).setUint32(offset, callbackUrlBytes.length, true);
      offset += 4;
      buffer.set(callbackUrlBytes, offset);
    } else {
      buffer[offset] = 0; // No callback_url
    }

    return buffer;
  }

  /**
   * Hash a payload
   * @param payload Payload to hash
   * @returns Hashed payload as Uint8Array
   */
  private async hashPayload(payload: Uint8Array): Promise<Uint8Array> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', payload);
    return new Uint8Array(hashBuffer);
  }

  /**
   * Sign a hash
   * @param hash Hash to sign
   * @returns Signature as base64 string
   */
  private async signHash(hash: Uint8Array): Promise<string> {
    // This is a placeholder for actual signing logic
    // In a real implementation, this would use the wallet's signing capability
    console.warn('signHash() is a placeholder. Implement actual signing logic.');

    // Simulate signing with a random signature
    const randomSignature = nacl.randomBytes(64);
    return uint8ArrayToBase64(randomSignature);
  }
}
