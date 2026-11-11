# Latch.js benchmark methodology

## Scope

**This is a browser microbenchmark, not proof of overall superiority.** It compares the two parts of the original product goal to tools that actually implement those responsibilities:

- **Reactivity:** Latch versus Alpine.js, with the same number of static bound DOM nodes and one increment event.
- **Server-style fragments:** Latch versus HTMX, requesting the same static 80-row HTML fragment from the same-origin server.
- **Combined flow:** Latch alone versus HTMX + Alpine together, fetching a comparable interactive HTML fragment and applying three local state updates before measurement ends.

HTMX has no built-in general-purpose Alpine-like local state, and Alpine is not a server-fragment transport library. The combined flow tests one typical server-to-client interaction, but a complete business-app benchmark remains future work.

## Versions and source

- Latch.js: exact commit built from `main` during the Pages deployment.
- HTMX: **2.0.11**, installed from `htmx.org` npm.
- Alpine.js: **3.17.5**, installed from `alpinejs` npm.
- The Pages build calculates minified, gzip (level 9), and Brotli byte lengths from the actual deployed files. See `benchmark-metadata.json`.

## Isolation

Each runtime lives in its own iframe; its DOM and global listeners cannot influence the other runtime's DOM. Each frame receives an explicit benchmark command using a same-origin message handshake. The same browser/device/network are used.

## Measurements

1. **Initialization time:** starting just before the generated fixture is processed by the already loaded runtime and stopping when bindings are ready.
2. **Reactivity update:** time from a programmatic button click to the last bound text node showing the expected value. For Alpine, the timer waits for asynchronous reactive microtasks. It does **not** include a guaranteed paint.
3. **HTML swap:** time from click to the respective `afterSwap` event, after confirming the same 80-row fixture is present. This includes browser network/cache effects and asynchronous work, which can introduce significant noise.
4. **Summary:** 3 warm-ups for reactivity, 2 for swaps, then the user-selected repetitions. Median and P95 are shown; raw samples are included in the JSON export.

## Interpretation and limitations

- *Faster in this test* means the median was smaller for this specific workload **on the current device**, not that it is the faster general-purpose framework.
- An iframe is an isolation boundary, not a perfect CPU isolator. Other tabs, browser scheduling, caching, garbage collection and extensions can influence results.
- Request latency is affected by network quality and GitHub Pages caching. No backend processing is measured.
- DOM-ready and `afterSwap` differ from end-to-end perceptual input-to-paint latency.
- The combined workload uses two markup fixtures with identical structural elements but different `lt-*` versus `hx-*`/`x-*` directives. It measures time to a usable reactive interface, not application-wide feature parity.
- Bundled script sizes do not capture the full application's styling, added plugins, page markup or server-side costs.
- Load/parsing of the runtime itself is not part of the initialization measurement.
- For high confidence, run at least 20 repetitions at several node counts, in different browsers, after hard refresh, and repeat the complete experiment several times.
- The GitHub Actions smoke test verifies that the benchmark actually runs, not that one library wins.

## Reproduction

```sh
npm ci
npm run build
npm install --no-save --no-package-lock --ignore-scripts alpinejs@3.17.5 htmx.org@2.0.11
npm run build:pages
python3 -m http.server 4180 --bind 127.0.0.1 --directory _site
```

Open `http://127.0.0.1:4180/benchmark.html`. Download the JSON with samples and version metadata.

## Automated baseline recording

The GitHub pull-request CI runs a standard 250-binding, 20-update state benchmark, a 10-swap HTML benchmark, and an 8-run combined HTTP + reactive state benchmark in Chromium. Once both finish, it saves:

- `test-results/**/attachments/comparison-samples*`: Playwright attachment with raw samples, medians, P95 and pinned versions.
- `_site/benchmark-metadata.json`: measured minified, gzip and Brotli distribution sizes.

Both are uploaded as a **30-day GitHub Actions artifact**, and a compact sample summary is printed in the job logs. GitHub-hosted runner variability means these figures should not become pass/fail performance thresholds until repeated baselines are established.

## Next benchmarks worth building

A balanced CRUD application in FlightPHP with actual form submission, network mutations and table refresh, plus mobile throttling, retained heap after many swaps, and accessibility/functional completeness. Report performance together with feature parity and regression rate rather than only a single latency number.
