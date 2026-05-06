import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      latch: "src/latch.ts"
    },
    format: ["iife"],
    globalName: "Latch",
    clean: true,
    dts: true,
    sourcemap: true,
    outDir: "dist",
    outExtension() {
      return {
        js: ".js"
      };
    },
    footer: {
      js: "if (typeof window !== 'undefined') { window.latch = window.Latch; }"
    }
  },
  {
    entry: {
      latch: "src/latch.ts"
    },
    format: ["iife"],
    globalName: "Latch",
    clean: false,
    dts: false,
    sourcemap: true,
    minify: true,
    outDir: "dist",
    outExtension() {
      return {
        js: ".min.js"
      };
    },
    footer: {
      js: "if (typeof window !== 'undefined') { window.latch = window.Latch; }"
    }
  },
  {
    entry: {
      latch: "src/latch.ts"
    },
    format: ["esm"],
    clean: false,
    dts: false,
    sourcemap: true,
    outDir: "dist",
    outExtension() {
      return {
        js: ".esm.js"
      };
    }
  }
]);