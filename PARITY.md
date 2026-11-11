# Latch.js functional parity with HTMX + Alpine

The goal is to cover the tasks that normally make a PHP/HTML developer install **both** libraries, with a single coherent attribute grammar and one runtime.

**Scope of the claim:** common server-rendered SaaS interfaces, not every extension or API supported by either ecosystem. A feature is called validated only when its behavior is covered by automated tests; it is never inferred from the API name alone.

| Typical task | Latch.js | Validation |
| --- | --- | --- |
| GET/POST/PUT/PATCH/DELETE requests and HTML swaps | `lt-get`, `lt-post`, etc., `lt-target`, `lt-swap` | Unit + browser |
| Server validation errors and browser form validation | `lt-form`, `lt-error-target` | Unit + browser |
| Filtered, searchable, sortable, paginated data tables | `lt-table` and its controls | Unit + browser |
| Local state and event-driven updates | `lt-state`, `lt-click`, `lt-on:*` | Unit + browser |
| Local state initialization | `lt-init` | Unit |
| Reactive values, attributes, visibility and classes | `lt-text`, `lt-bind:*`, `lt-show`, `lt-class` | Unit |
| Two-way inputs and derived parent totals | `lt-model` | Unit + browser |
| Keyed dynamic lists with row-local controls | `lt-for`, `lt-key` | Unit + browser |
| Remote HTML followed by reactive local controls | Request + swap + automatic rescan | Combined browser benchmark |
| Server-triggered refresh and custom events | `lt-refresh-on`, response headers | Unit + browser |
| Tabs, accordions, dropdown, overlays and notifications | Native primitives | Unit + browser |
| Custom directives and stores | Plugin API | Unit + e2e |
| Native conditional DOM mounting (`x-if` style) | `lt-if` currently toggles visibility, **not** mount/unmount | Gap |
| Transition/animation directives | No direct `x-transition` equivalent | Gap |
| Strict CSP without `unsafe-eval` | Current expression evaluator uses `new Function` | Gap |
| Advanced Alpine features (teleport, morph, interceptors, persist plugins) | No feature-for-feature guarantee | Gap |
| Advanced HTMX features (SSE/WebSockets, extensions, complex out-of-band swaps) | Not all built into core | Gap |

## What “replaces the pair” can mean today

For CRUD dashboards, forms, filtered tables, local view state, repeated lists, toasts and overlays, **Latch can replace the combined HTMX + Alpine dependencies**. This is supported by real walkthroughs of the public demo and a combined benchmark using both competitor runtimes.

That does **not** imply that Latch is faster in every workload, CSP-compatible, or API-compatible with existing HTMX/Alpine markup. Migrating requires rewriting the declarative attributes and testing the final application.

## Proof and reproduction

- Interactive demo: https://titomus.github.io/latchjs/
- Browser comparison: https://titomus.github.io/latchjs/benchmark.html
- Benchmark methodology: [BENCHMARK.md](BENCHMARK.md)
- Unit tests: `tests/latch.test.ts`
- Real browser scenarios: `tests/pages/showcase.spec.ts` and `tests/pages/benchmark.spec.ts`
- CI raw samples: 30-day GitHub Actions artifacts.

## Next acceptance gates

1. Strengthen CSP and HTML trust boundaries.
2. Add native conditional mounting and basic transitions.
3. Run integrated PHP CRUD workloads on several browser/device profiles.
4. Measure retained memory and cleanup over hundreds of DOM swaps.
5. Pin explicit release versions and document safe migration from HTMX/Alpine.

Do not ship a universal “100% replacement” claim until those requirements are met.
