import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const destination = path.join(root, "_site");
fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(path.join(root, "docs"), destination, { recursive: true });
fs.mkdirSync(path.join(destination, "dist"), { recursive: true });
fs.mkdirSync(path.join(destination, "vendor"), { recursive: true });

for (const file of ["latch.js", "latch.min.js", "latch.esm.js"]) {
  fs.copyFileSync(path.join(root, "dist", file), path.join(destination, "dist", file));
}

const packages = {
  latch: { file: "dist/latch.min.js", version: JSON.parse(fs.readFileSync("package.json", "utf8")).version },
  alpine: {
    source: "node_modules/alpinejs/dist/cdn.min.js",
    file: "vendor/alpine.min.js",
    version: JSON.parse(fs.readFileSync("node_modules/alpinejs/package.json", "utf8")).version
  },
  htmx: {
    source: "node_modules/htmx.org/dist/htmx.min.js",
    file: "vendor/htmx.min.js",
    version: JSON.parse(fs.readFileSync("node_modules/htmx.org/package.json", "utf8")).version
  }
};
const versions = {}, bytes = {};
for (const [name, entry] of Object.entries(packages)) {
  if (entry.source) fs.copyFileSync(path.join(root, entry.source), path.join(destination, entry.file));
  const contents = fs.readFileSync(path.join(destination, entry.file));
  versions[name] = entry.version;
  bytes[name] = {
    minified: contents.length,
    gzip: zlib.gzipSync(contents, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(contents).length
  };
}
fs.writeFileSync(path.join(destination, "benchmark-metadata.json"), JSON.stringify({
  versions, bytes,
  generatedAt: new Date().toISOString(),
  explanation: "Compiled Latch and pinned Alpine/htmx distribution files; compressed in Node.js with gzip level 9."
}, null, 2));
fs.writeFileSync(path.join(destination, ".nojekyll"), "");
fs.writeFileSync(path.join(destination, "vendor", "NOTICE.txt"), [
  "Benchmark-only third-party binaries, pinned for reproducible experiments.",
  "htmx.org " + versions.htmx + " — 0BSD — https://github.com/bigskysoftware/htmx",
  "alpinejs " + versions.alpine + " — MIT — https://github.com/alpinejs/alpine",
  "Each library belongs to its respective authors and maintains its own license."
].join("\n") + "\n");
console.log("Built GitHub Pages artifact, versions:", versions, "compressed bytes:", bytes);
