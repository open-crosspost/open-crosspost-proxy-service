#!/usr/bin/env deno run --allow-read --allow-write --allow-env --unstable-kv

/**
 * Deno KV Management Script
 *
 * This script provides utilities for managing your Deno KV database during development:
 * - List all keys in the database
 * - Delete all keys or keys with specific prefixes
 * - View database statistics
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-env --unstable-kv clear-kv.ts [options]
 *
 * Options:
 *   --list-only     Only list keys without deleting them
 *   --prefix=PREFIX Only operate on keys with the specified prefix (e.g. --prefix=tokens)
 *                   Common prefixes in this project:
 *                   - tokens: OAuth tokens
 *                   - profile: User profiles
 *                   - near_auth: NEAR authorization status
 *                   - token: NEAR account tokens
 *                   - index: Connected accounts index
 *   --yes           Skip confirmation prompt
 *   --help          Show this help message
 */

// Parse command line arguments
const args = parseArgs(Deno.args);

if (args.help) {
  showHelp();
  Deno.exit(0);
}

// Check if we're only listing keys
const listOnly = args['list-only'] === true;

// Check if we're operating on a specific prefix
const prefix = args.prefix ? String(args.prefix) : null;

// Check if we should skip confirmation
const skipConfirmation = args.yes === true;

// Run the main function
await manageKV(listOnly, prefix, skipConfirmation);

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const arg of args) {
    if (arg === '--help') {
      result.help = true;
    } else if (arg === '--list-only') {
      result['list-only'] = true;
    } else if (arg === '--yes') {
      result.yes = true;
    } else if (arg.startsWith('--prefix=')) {
      result.prefix = arg.substring('--prefix='.length);
    }
  }

  return result;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Deno KV Management Script

This script provides utilities for managing your Deno KV database during development:
- List all keys in the database
- Delete all keys or keys with specific prefixes
- View database statistics

Usage:
  deno run --allow-read --allow-write --allow-env --unstable-kv clear-kv.ts [options]

Options:
  --list-only     Only list keys without deleting them
  --prefix=PREFIX Only operate on keys with the specified prefix (e.g. --prefix=tokens)
                  Common prefixes in this project:
                  - tokens: OAuth tokens
                  - profile: User profiles
                  - near_auth: NEAR authorization status
                  - token: NEAR account tokens
                  - index: Connected accounts index
  --yes           Skip confirmation prompt
  --help          Show this help message
  `);
}

/**
 * Main function to manage Deno KV
 */
async function manageKV(
  listOnly: boolean,
  prefix: string | null,
  skipConfirmation: boolean,
): Promise<void> {
  const action = listOnly ? 'list' : 'clear';
  const targetDesc = prefix ? `keys with prefix '${prefix}'` : 'all keys';

  console.log(`🔧 Deno KV Management Tool`);
  console.log(`📋 Action: ${action} ${targetDesc}`);

  // Confirm before proceeding with deletion
  if (!listOnly && !skipConfirmation) {
    const confirmed = await confirmAction(prefix);
    if (!confirmed) {
      console.log('❌ Operation cancelled.');
      Deno.exit(0);
    }
  }

  // Open the KV store
  console.log('📂 Opening Deno KV database...');
  const kv = await Deno.openKv();

  // Track statistics
  let totalKeysFound = 0;
  let totalKeysDeleted = 0;
  let totalKeysFailed = 0;

  try {
    console.log(
      `🔍 Listing ${prefix ? `keys with prefix '${prefix}'` : 'all keys'} in the database...`,
    );

    // Create the prefix array for the query
    const prefixArray = prefix ? [prefix] : [];

    // List all entries matching the prefix
    const iter = kv.list({ prefix: prefixArray });
    const deletePromises: Promise<void>[] = [];

    for await (const entry of iter) {
      const key = entry.key;
      totalKeysFound++;
      console.log(`  🗝️  Found key: ${JSON.stringify(key)}`);

      // Delete the key if not in list-only mode
      if (!listOnly) {
        deletePromises.push((async () => {
          try {
            await kv.delete(key);
            console.log(`  ✅ Deleted key: ${JSON.stringify(key)}`);
            totalKeysDeleted++;
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`  ❌ Failed to delete key ${JSON.stringify(key)}: ${errorMessage}`);
            totalKeysFailed++;
          }
        })());
      }
    }

    // Wait for all delete operations to complete
    await Promise.all(deletePromises);

    console.log('\n📊 Summary:');
    console.log(`  Total keys found: ${totalKeysFound}`);

    if (!listOnly) {
      console.log(`  Total keys deleted: ${totalKeysDeleted}`);

      if (totalKeysFailed > 0) {
        console.log(`  Failed to delete ${totalKeysFailed} keys`);
      }
    }

    if (totalKeysFound === 0) {
      console.log(`  No keys ${prefix ? `with prefix '${prefix}'` : ''} found in the database.`);
    }

    console.log(`\n✨ Deno KV ${listOnly ? 'listing' : 'clear'} process completed!`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error managing Deno KV: ${errorMessage}`);
    Deno.exit(1);
  } finally {
    // Close the KV store
    kv.close();
  }
}

/**
 * Confirm action with the user
 */
async function confirmAction(prefix: string | null): Promise<boolean> {
  const targetDesc = prefix ? `keys with prefix '${prefix}'` : 'ALL KEYS';

  console.log(`⚠️  WARNING: You are about to DELETE ${targetDesc} from your Deno KV database.`);
  console.log(`⚠️  This action cannot be undone.`);

  // Ask for confirmation
  const confirmation = prompt(`Are you sure you want to proceed? (y/N): `);

  return confirmation?.toLowerCase() === 'y';
}
