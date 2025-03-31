#!/usr/bin/env deno run --allow-read --allow-write

import { walk } from "https://deno.land/std@0.220.1/fs/walk.ts";
import { resolve, dirname } from "https://deno.land/std@0.220.1/path/mod.ts";

const GENERATED_DIR = resolve("./src/types/generated");

async function fixImports() {
  console.log("Fixing imports in generated files...");
  
  // Walk through all TypeScript files in the generated directory
  for await (const entry of walk(GENERATED_DIR, { 
    exts: [".ts"],
    skip: [/node_modules/, /\.git/]
  })) {
    if (!entry.isFile) continue;
    
    const filePath = entry.path;
    let content = await Deno.readTextFile(filePath);
    
    // Fix imports without .ts extension
    content = content.replace(
      /from ['"]([^'"]*?)['"];/g, 
      (match, importPath) => {
        // Skip external imports
        if (importPath.startsWith("http") || 
            importPath.startsWith("npm:") || 
            importPath.startsWith("jsr:") ||
            importPath.startsWith("./") === false && 
            importPath.startsWith("../") === false) {
          return match;
        }
        
        // Add .ts extension if not already present
        if (!importPath.endsWith(".ts")) {
          return `from '${importPath}.ts';`;
        }
        
        return match;
      }
    );
    
    // Write the fixed content back to the file
    await Deno.writeTextFile(filePath, content);
    console.log(`Fixed imports in ${filePath}`);
  }
  
  console.log("All imports fixed successfully!");
}

await fixImports();
