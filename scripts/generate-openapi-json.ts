#!/usr/bin/env deno run --allow-write

import { generateOpenApiJson } from '../src/openapi/index.ts';
import { resolve } from 'https://deno.land/std@0.220.1/path/mod.ts';

// Generate the OpenAPI JSON
const openApiSpec = generateOpenApiJson();

// Write it to a file
const outputFile = resolve('./openapi.json');
await Deno.writeTextFile(outputFile, openApiSpec);

console.log(`OpenAPI JSON generated at ${outputFile}`);
