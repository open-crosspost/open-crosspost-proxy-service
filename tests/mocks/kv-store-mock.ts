/**
 * Mock implementation of the KV store for testing
 */

import { PrefixedKvStore } from '../../src/utils/kv-store.utils.ts';

// Mock implementation of the KV store that extends PrefixedKvStore
export class MockKvStore extends PrefixedKvStore {
  private store: Map<string, any> = new Map();
  private database?: Deno.Kv;

  /**
   * Create a new MockKvStore
   * @param prefix The prefix for all keys
   */
  constructor(prefix: string[] | Deno.KvKey = []) {
    super(prefix);
  }

  /**
   * Close the KV store and clean up resources
   */
  async close(): Promise<void> {
    if (this.database) {
      await this.database.close();
      this.database = undefined;
    }
  }

  /**
   * Set a value in the mock store
   * @param subKey The sub-key to set
   * @param value The value to set
   * @param options Options for the set operation
   */
  override async set(
    subKey: Deno.KvKey,
    value: any,
    options?: { expireIn?: number },
  ): Promise<void> {
    const fullKey = this.getFullKey(subKey);
    const keyString = JSON.stringify(fullKey);
    this.store.set(keyString, value);
  }

  /**
   * Get a value from the mock store
   * @param subKey The sub-key to get
   * @returns The value or null if not found
   */
  override async get<T>(subKey: Deno.KvKey): Promise<T | null> {
    const fullKey = this.getFullKey(subKey);
    const keyString = JSON.stringify(fullKey);
    const result = this.store.get(keyString);
    return result !== undefined ? result : null;
  }

  /**
   * Delete a value from the mock store
   * @param subKey The sub-key to delete
   */
  override async delete(subKey: Deno.KvKey): Promise<void> {
    const fullKey = this.getFullKey(subKey);
    const keyString = JSON.stringify(fullKey);
    this.store.delete(keyString);
  }

  /**
   * List values with a prefix
   * @param subPrefix Additional prefix to list
   * @param options Options for the list operation
   * @returns An array of entries
   */
  override async list<T>(
    subPrefix: Deno.KvKey = [],
    options?: Deno.KvListOptions,
  ): Promise<Array<{ key: Deno.KvKey; value: T }>> {
    const fullPrefix = this.getFullKey(subPrefix);
    const prefixString = JSON.stringify(fullPrefix).slice(0, -1); // Remove the closing bracket
    const entries: Array<{ key: Deno.KvKey; value: T }> = [];

    for (const [keyString, value] of this.store.entries()) {
      if (keyString.startsWith(prefixString)) {
        entries.push({
          key: JSON.parse(keyString),
          value: value as T,
        });
      }
    }

    return entries;
  }

  /**
   * Get the full key by combining the prefix and subKey
   * @param subKey The sub-key
   * @returns The full key
   */
  private getFullKey(subKey: Deno.KvKey): Deno.KvKey {
    // Access the protected prefix property using type assertion
    const prefix = (this as any).prefix as Deno.KvKey;
    return [...prefix, ...subKey];
  }

  /**
   * Atomic operations (simplified for testing)
   * @returns A mock atomic operation
   */
  atomic(): Deno.AtomicOperation {
    return {
      commit: async () => ({ ok: true, versionstamp: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) }),
      check: () => this,
      sum: () => this,
      min: () => this,
      max: () => this,
      set: () => this,
      delete: () => this,
      enqueue: () => this,
    } as unknown as Deno.AtomicOperation;
  }

  /**
   * Clear all values (for test setup/teardown)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Populate with test data
   * @param data The data to populate
   */
  populate(data: Record<string, any>): void {
    for (const [key, value] of Object.entries(data)) {
      this.store.set(key, value);
    }
  }
}

// Create a singleton instance
export const mockKvStore = new MockKvStore();

// Mock the KvStore class from the utils
export const mockKvStoreModule = {
  getInstance: () => Promise.resolve(mockKvStore as unknown as Deno.Kv),
  get: async <T>(key: Deno.KvKey): Promise<T | null> => {
    return mockKvStore.get<T>(key);
  },
  set: async (key: Deno.KvKey, value: any, options?: { expireIn?: number }): Promise<void> =>
    mockKvStore.set(key, value, options),
  delete: async (key: Deno.KvKey): Promise<void> => mockKvStore.delete(key),
  list: async <T>(
    prefix: Deno.KvKey,
    options?: Deno.KvListOptions,
  ): Promise<Array<{ key: Deno.KvKey; value: T }>> => {
    return mockKvStore.list<T>(prefix, options);
  },
  withTransaction: async (fn: (atomic: Deno.AtomicOperation) => Deno.AtomicOperation) => {
    return {
      ok: true,
      versionstamp: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
    };
  },
};
