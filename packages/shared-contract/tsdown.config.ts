import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['index.ts'],
  format: ['esm'],
  dts: true,           // Generate .d.ts files
  clean: true,         // Clean dist before build
  sourcemap: true,     // Generate sourcemaps
});
