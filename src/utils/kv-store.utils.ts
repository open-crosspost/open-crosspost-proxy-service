/**
 * KV Store Utility
 * Provides a unified interface for interacting with Deno KV
 */

/**
 * Error types for KV operations
 */
export enum KvErrorType {
  NOT_FOUND = 'not_found',
  ALREADY_EXISTS = 'already_exists',
  PERMISSION_DENIED = 'permission_denied',
  INVALID_ARGUMENT = 'invalid_argument',
  INTERNAL_ERROR = 'internal_error',
  UNKNOWN = 'unknown',
}

/**
 * Custom error class for KV operations
 */
export class KvError extends Error {
  constructor(
    public type: KvErrorType,
    message: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'KvError';
  }
}

/**
 * KV Store utility class
 * Provides static methods for common KV operations with standardized error handling
 */
export class KvStore {
  private static instance: Deno.Kv | null = null;

  /**
   * Get the KV instance
   * @returns The KV instance
   */
  static async getInstance(): Promise<Deno.Kv> {
    if (!this.instance) {
      try {
        this.instance = await Deno.openKv();
      } catch (error) {
        console.error('Error opening KV store:', error);
        throw new KvError(
          KvErrorType.INTERNAL_ERROR,
          'Failed to open KV store',
          error,
        );
      }
    }
    return this.instance;
  }

  /**
   * Get a value from KV
   * @param key The key to get
   * @returns The value or null if not found
   */
  static async get<T>(key: Deno.KvKey): Promise<T | null> {
    try {
      const kv = await this.getInstance();
      const result = await kv.get<T>(key);
      return result.value;
    } catch (error) {
      console.error(`Error getting KV value for key ${JSON.stringify(key)}:`, error);
      throw new KvError(
        KvErrorType.INTERNAL_ERROR,
        `Failed to get value for key ${JSON.stringify(key)}`,
        error,
      );
    }
  }

  /**
   * Set a value in KV
   * @param key The key to set
   * @param value The value to set
   * @param options Options for the set operation
   */
  static async set(
    key: Deno.KvKey,
    value: unknown,
    options?: { expireIn?: number },
  ): Promise<void> {
    try {
      const kv = await this.getInstance();
      const result = await kv.set(key, value, options);

      if (!result.ok) {
        throw new KvError(
          KvErrorType.INTERNAL_ERROR,
          `Failed to set value for key ${JSON.stringify(key)}`,
        );
      }
    } catch (error) {
      if (error instanceof KvError) {
        throw error;
      }

      console.error(`Error setting KV value for key ${JSON.stringify(key)}:`, error);
      throw new KvError(
        KvErrorType.INTERNAL_ERROR,
        `Failed to set value for key ${JSON.stringify(key)}`,
        error,
      );
    }
  }

  /**
   * Delete a value from KV
   * @param key The key to delete
   */
  static async delete(key: Deno.KvKey): Promise<void> {
    try {
      const kv = await this.getInstance();
      await kv.delete(key);
    } catch (error) {
      console.error(`Error deleting KV value for key ${JSON.stringify(key)}:`, error);
      throw new KvError(
        KvErrorType.INTERNAL_ERROR,
        `Failed to delete value for key ${JSON.stringify(key)}`,
        error,
      );
    }
  }

  /**
   * List values from KV with a prefix
   * @param prefix The prefix to list
   * @param options Options for the list operation
   * @returns An array of entries
   */
  static async list<T>(
    prefix: Deno.KvKey,
    options?: Deno.KvListOptions,
  ): Promise<Array<{ key: Deno.KvKey; value: T }>> {
    try {
      const kv = await this.getInstance();
      const entries: Array<{ key: Deno.KvKey; value: T }> = [];

      const iter = kv.list<T>({ prefix }, options);
      for await (const entry of iter) {
        entries.push({ key: entry.key, value: entry.value });
      }

      return entries;
    } catch (error) {
      console.error(`Error listing KV values with prefix ${JSON.stringify(prefix)}:`, error);
      throw new KvError(
        KvErrorType.INTERNAL_ERROR,
        `Failed to list values with prefix ${JSON.stringify(prefix)}`,
        error,
      );
    }
  }

  /**
   * Execute a function within a transaction
   * @param fn The function to execute
   * @returns The result of the function
   */
  static async withTransaction(
    fn: (atomic: Deno.AtomicOperation) => Deno.AtomicOperation,
  ): Promise<Deno.KvCommitResult> {
    try {
      const kv = await this.getInstance();
      const result = await fn(kv.atomic()).commit();

      if (!result.ok) {
        throw new KvError(
          KvErrorType.INTERNAL_ERROR,
          'Transaction failed to commit',
        );
      }

      return result;
    } catch (error) {
      console.error('Error executing transaction:', error);
      throw new KvError(
        KvErrorType.INTERNAL_ERROR,
        'Failed to execute transaction',
        error,
      );
    }
  }
}

/**
 * Prefixed KV Store
 * Provides an instance-based approach for working with prefixed keys
 */
export class PrefixedKvStore {
  /**
   * Create a new prefixed KV store
   * @param prefix The prefix for all keys
   */
  constructor(private prefix: Deno.KvKey) {}

  /**
   * Get a value from KV with the prefix
   * @param subKey The sub-key to get
   * @returns The value or null if not found
   */
  async get<T>(subKey: Deno.KvKey): Promise<T | null> {
    const fullKey = [...this.prefix, ...subKey];
    return KvStore.get<T>(fullKey);
  }

  /**
   * Set a value in KV with the prefix
   * @param subKey The sub-key to set
   * @param value The value to set
   * @param options Options for the set operation
   */
  async set(subKey: Deno.KvKey, value: unknown, options?: { expireIn?: number }): Promise<void> {
    const fullKey = [...this.prefix, ...subKey];
    return KvStore.set(fullKey, value, options);
  }

  /**
   * Delete a value from KV with the prefix
   * @param subKey The sub-key to delete
   */
  async delete(subKey: Deno.KvKey): Promise<void> {
    const fullKey = [...this.prefix, ...subKey];
    return KvStore.delete(fullKey);
  }

  /**
   * List values from KV with the prefix
   * @param subPrefix Additional prefix to list
   * @param options Options for the list operation
   * @returns An array of entries
   */
  async list<T>(
    subPrefix: Deno.KvKey = [],
    options?: Deno.KvListOptions,
  ): Promise<Array<{ key: Deno.KvKey; value: T }>> {
    const fullPrefix = [...this.prefix, ...subPrefix];
    return KvStore.list<T>(fullPrefix, options);
  }
}
