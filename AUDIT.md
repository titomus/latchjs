# Latch.js technical audit — 2026-11-11

Scope: source inspection of runtime, scanner, state, evaluator, swap, request, build configuration and existing tests. No local npm installation or browser benchmark was possible through the GitHub connector. This is a static audit, **not** a certified security assessment.

## P0: correctness and performance

1. **Quadratic scanning** — `scanTree` recursively traversed the root, then called the same recursive walker on every descendant. Fixed in this PR. Verify on 100, 1,000 and 10,000 nodes.
2. **Duplicate HTML parsing and oversized rescan** — `applySwap` parsed a fragment then reparsed `innerHTML`; append/prepend returned all children instead of only inserted children. Fixed in this PR.
3. **Event/timer cleanup** — request triggers register global listeners, intervals and intersection observers. `stop()` toggles a flag but does not dispose them. Design per-element disposers and a lifecycle API, especially for swapped DOM.
4. **Request races** — search/filter submissions can finish out of order. Add take-latest/abort semantics for a given element/target and tests for slow responses.
5. **Form input storms** — `lt-submit-on-change` binds input and change with no default debounce. Add configurable debounce and avoid duplicate submits.

## P0: security boundaries

1. **Arbitrary JavaScript expressions** — `new Function` + `with` is not a sandbox and conflicts with strict CSP. Support a documented trusted-template mode; consider a restricted interpreter for CSP mode. Never execute untrusted expressions.
2. **HTML insertion** — `lt-html`, server errors, overlays and swaps use `innerHTML`. Treat server responses as trusted HTML, sanitize user-provided HTML server-side, and test malicious attributes/URLs. Consider Trusted Types support.
3. **URL and headers** — validate redirect/navigation headers and document same-origin policy. Verify CSRF coverage for unsafe methods and safe defaults for credentials.
4. **Server response error mapping** — escape all server-provided error messages before inserting into HTML; avoid string concatenation of untrusted errors.

## P1: lifecycle and accessibility

- Dispose global listeners, timers and observers when nodes leave the document; `WeakSet` alone does not release attached global callbacks.
- Test focus restoration for modal/drawer, keyboard navigation, nested overlays and Escape handling.
- Add timeout/abort/network error UX and reliable loading-state restoration.
- Ensure fragment replacement does not unexpectedly reset user focus, selection and input values.

## P1: benchmarking, before any 'faster than HTMX + Alpine' claim

Use identical production-like apps with 100/1,000/10,000 rows and 50/500/5,000 reactive bindings. Measure:
- minified + gzip/brotli transferred bytes;
- cold parse/execute, initialization and scan duration;
- p50/p95 input-to-paint latency for state updates;
- fetch-to-DOM-paint for fragment swaps;
- retained heap after 100 swaps and 100 modal cycles;
- number of network requests and duplicate handlers.

Run on Chromium desktop and throttled mobile, repeat ≥20 times and publish raw results. Compare same functionality and equivalent caching.

## P2: API and documentation

- Stabilize directive names, triggers and response-header contracts.
- Add FlightPHP and WordPress server integration examples.
- Document content trust boundaries and CSP limitations.
- Keep styling separate: the intended comparison is HTMX + Alpine, **not Tailwind**.

## GitHub Pages

The static playground is in `docs/index.html`. Workflow `.github/workflows/pages.yml` builds the library, runs typecheck and unit tests, then deploys the built assets. In GitHub repository settings select Pages → Source → GitHub Actions. Actions must be enabled and billing unblocked. The playground mocks an HTTP fragment endpoint; it is not a live backend.

## Release gate

Do not publish a v1 stable claim until all P0 security/correctness items are tested, the full suite passes, and benchmark methodology/results are reproducible.

## Follow-up engineering pass (2026-11-11, PR #2)

Implemented and covered by automated tests (subject to CI validation):
- Expression compilation caching with a bounded 512-entry cache; the evaluator remains a developer-trusted JavaScript evaluator.
- Single synchronous render for several state mutations within one declarative action.
- Parent proxy reuse and stable state scopes across repeated scans or DOM moves.
- Latest-wins GET requests and native data-table loads using AbortSignal plus response version checks.
- Polling/global listeners/IntersectionObserver cleanup on detachment, with restoration on reattachment and explicit rescan.
- Debounced auto-submit typing (250 ms default, overridable with `lt-debounce`), immediate select/change handling.
- GitHub Pages microbenchmark for 100–2500 bindings and 20 state updates; **not** a comparative performance claim.
- GitHub Actions PR quality gate with browser smoke test of the actual deployable artifact.

### Unresolved release blockers

- Strict CSP: `new Function` still requires `unsafe-eval`. A restricted CSP-compatible interpreter or static precompilation mode remains necessary.
- HTML trust: `lt-html`, overlays, and server-rendered fragments require trusted sources and server-side sanitization. Add a Trusted Types-compatible insertion strategy and exploit-focused tests.
- Fair external comparison: benchmark identical HTMX + Alpine workflows with the same DOM, network conditions, event patterns and bundle transfer settings.
- Review overall accessibility, multi-overlay focus interactions and production memory profiles before calling this stable 1.0.
