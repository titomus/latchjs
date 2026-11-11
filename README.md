# Latch.js

Attach behavior to HTML.

Latch.js is a lightweight HTML-first JavaScript library for building dynamic server-rendered apps with declarative attributes, local state, DOM swaps, forms, events, and reusable UI primitives.

It is designed for teams that want modern interactions without turning every project into a SPA.

## Why Latch.js

Latch.js sits in the space between classic server-rendered HTML and full frontend frameworks.

It combines three ideas:

- server-first interactions driven by HTML attributes
- small local state close to the markup that needs it
- common UI patterns that should not require custom JavaScript every time

The goal is not to compete with React, Vue, or Svelte on their terrain.
The goal is to remove unnecessary frontend complexity for CRUD apps, internal tools, dashboards, and content-heavy products.

## Product principles

- HTML-first: behavior stays readable in the markup
- Server-first: the backend remains the source of truth
- Progressive enhancement: links and forms can stay meaningful without client-side routing
- Small local state: enough for toggles, tabs, dropdowns, counters, and transient UI state
- No heavy runtime model: no virtual DOM, no compiler required, no SPA shell required

## Current scope

The project now covers the original foundation plus the first orchestration, accessibility, and table slices needed for a broader v1.

### Request and swap core

- `lt-get`, `lt-post`, `lt-put`, `lt-patch`, `lt-delete`
- `lt-target`, `lt-swap`, `lt-trigger`, `lt-confirm`
- `lt-loading`, `lt-disabled-while`, `lt-indicator`
- automatic rescan after HTML swaps
- lifecycle events such as `latch:beforeRequest`, `latch:afterSwap`, `latch:requestError`
- support for `X-Latch-*` response headers

### Forms

- `lt-form`
- browser validation before request dispatch
- `FormData` support
- GET query serialization from form fields
- `lt-error-target`
- JSON server error mapping to fields and summary blocks
- `lt-error-class`
- `lt-reset-on-success`
- `lt-close-on-success`
- `lt-submit-on-change`
- `lt-dirty-check`

### Local state

- `lt-for` and `lt-key` for keyed reactive collections
- `lt-when` for mount/unmount conditional templates; unlike `lt-if`, this creates/removes real nodes
- `lt-init` for initial state setup
- `lt-on:click.prevent`, `lt-on:input.debounce.250ms` and related event modifiers
- `lt-state`
- `lt-click`
- `lt-show`
- `lt-if`
- `lt-class`
- `lt-bind:*`
- `lt-model`
- `lt-text`
- `lt-html`
- nested local scopes
- `$store` access from expressions

### Events and API

- `Latch.start()`, `Latch.stop()`, `Latch.configure()`
- `Latch.on()`, `Latch.off()`, `Latch.emit()`
- `lt-on`, `lt-emit`
- `Latch.request()`
- `Latch.refresh()`
- `Latch.confirm()`
- `lt-refresh-on`
- `Latch.store()`
- `Latch.plugin()`

### Native UI primitives

- `Latch.toast()` and declarative `lt-toast`
- `lt-toast-container`
- `Latch.modal()` and `lt-modal`
- `Latch.drawer()` and `lt-drawer`
- `lt-close`
- `lt-dropdown`
- `lt-tabs`
- `lt-accordion`
- focus restore and focus trap on modal or drawer close
- keyboard navigation and ARIA wiring for dropdowns, tabs and accordion

### Data tables

- `lt-table`
- `lt-source`
- `lt-table-search`
- `lt-table-filter`
- `lt-table-sort`
- `lt-table-page`
- `lt-sync-url`
- event-driven refresh through `lt-refresh-on`

## Installation

```bash
npm install
npm run build
```

## Output

Latch.js is authored in TypeScript for maintainability, but the shipped artifacts are JavaScript bundles.

Current outputs:

- `dist/latch.js`
- `dist/latch.min.js`
- `dist/latch.esm.js`

## Quick start

### Global script

```html
<script src="/dist/latch.js" defer></script>
<script>
  window.addEventListener("DOMContentLoaded", () => {
    Latch.start();
  });
</script>
```

### ESM

```js
import { Latch } from "latchjs";

Latch.start();
```

## Examples

### Request from plain HTML

```html
<button
  lt-post="/items/123/archive"
  lt-target="#item-123"
  lt-swap="outerHTML"
  lt-confirm="Archive this item?"
  lt-toast-success="Item archived"
  lt-emit="item:archived"
>
  Archive
</button>
```

### Native confirm dialog

```html
<button
  lt-delete="/items/123"
  lt-target="#item-123"
  lt-swap="remove"
  lt-confirm="Delete this item?"
  lt-confirm-title="Delete item"
  lt-confirm-confirm-text="Delete"
  lt-confirm-cancel-text="Keep it"
  lt-confirm-tone="danger"
>
  Delete
</button>
```

### Enhanced form with server errors

```html
<form
  lt-form
  lt-post="/users"
  lt-target="#users-list"
  lt-swap="beforeend"
  lt-error-target="#user-errors"
  lt-error-class="field-error"
  lt-reset-on-success
  lt-toast-success="User created"
>
  <div id="user-errors"></div>

  <input name="name" required>
  <p data-latch-error-for="name"></p>

  <input name="email" type="email" required>
  <p data-latch-error-for="email"></p>

  <button type="submit">Create</button>
</form>
```

### Local state close to markup

```html
<div lt-state="{ open: false, count: 0 }">
  <button lt-click="open = !open">Toggle</button>
  <button lt-click="count += 1">+</button>

  <div lt-show="open">
    <strong lt-text="count"></strong>
  </div>
</div>
```

### Dropdown

```html
<div lt-dropdown>
  <button lt-dropdown-trigger>Actions</button>

  <div lt-dropdown-menu>
    <button>Edit</button>
    <button>Delete</button>
  </div>
</div>
```

### Tabs

```html
<div lt-tabs="profile">
  <button lt-tab="profile">Profile</button>
  <button lt-tab="settings">Settings</button>

  <section lt-panel="profile">...</section>
  <section lt-panel="settings">...</section>
</div>
```

### Server-driven table

```html
<section
  lt-table
  lt-source="/admin/releases"
  lt-target="#release-results"
  lt-sync-url
  lt-refresh-on="release:created release:updated"
>
  <input lt-table-search placeholder="Search release or owner">
  <select lt-table-filter="stage">
    <option value="">All stages</option>
    <option value="draft">Draft</option>
    <option value="review">Review</option>
    <option value="ready">Ready</option>
  </select>

  <div id="release-results"></div>
</section>
```

### Custom directive plugin

```js
import { Latch } from "latchjs";

Latch.plugin((app) => {
  app.directive("focus", ({ el, value }) => {
    if (value === "immediate") {
      queueMicrotask(() => el.focus());
    }
  });
});

Latch.start();
```

## Interactive demos and reproducible benchmarks

- **[Full product showcase](https://titomus.github.io/latchjs/)**: a realistic SaaS-like dashboard with reactive pricing, searchable/paginated contacts, form validation, simulated server mutations, modal, drawer, toasts, tabs, accordion and event log.
- **[HTMX + Alpine comparison lab](https://titomus.github.io/latchjs/benchmark.html)**: isolated, real runtime comparisons with raw measurements and download.
- **[Minimal playground](https://titomus.github.io/latchjs/lab.html)**: the original quick demos and Latch-only microbenchmark.
- [Technical audit and release blockers](AUDIT.md).
- **[HTMX + Alpine functional parity matrix](PARITY.md)**: supported workflows, verified tests and remaining gaps.
- Local examples are in `examples/`, including a plugin lab.

GitHub Pages is static. The showcase uses a clearly marked **in-memory mock server**, but all Latch behavior, directives and DOM swaps are real. Data resets when the page reloads.

The benchmark uses pinned **htmx 2.0.11** and **Alpine 3.17.5** with the current Latch build. It compares Latch against Alpine for local state and against HTMX for HTML swaps. It does **not** claim that Latch is universally faster. See [benchmark methodology](BENCHMARK.md).

To build the Pages site locally after `npm ci`:

```sh
npm run build
npm install --no-save --no-package-lock --ignore-scripts alpinejs@3.17.5 htmx.org@2.0.11
npm run build:pages
python3 -m http.server 4180 --bind 127.0.0.1 --directory _site
```

## Public roadmap

### v0.1 Core request and swap

- stable attribute scanner
- request engine
- DOM swaps
- lifecycle hooks
- bundle outputs

Status: done

### v0.2 Forms and server errors

- enhanced forms
- browser validation
- error target rendering
- success toasts and reset flows
- JSON error mapping
- submit on change and dirty-check

Status: done in current foundation

### v0.3 Local state and simple UI patterns

- local component state
- reactive text, class, show, bind, model
- conditional and HTML rendering
- dropdowns, tabs, accordion

Status: done in current foundation

### v0.4 Server headers and orchestration

- richer `X-Latch-*` header flows
- multi-zone refresh strategy
- more robust event-driven refresh behavior

Status: foundation implemented

### v0.5 Native components

- stronger modal accessibility
- confirm dialog primitive
- better drawer transitions
- polished toast themes and stacking behavior

Status: accessibility substantially improved, polish still pending

### v0.6 Data tables

- search, filters, sorting, pagination
- URL sync
- refresh-on-event patterns

Status: first built-in table shipped

### v0.7 Plugin system

- directive extension API examples
- plugin authoring guide

Status: foundation ready, runnable example shipped

### v1.0 Stabilization

- complete docs
- browser tests
- backend examples
- accessibility guide
- security guide
- production demos

Status: browser tests started

## Development

```bash
npm install
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Notes

- Expressions are currently evaluated with `new Function`. This is acceptable for developer-authored markup, but it is not a sandbox.
- `lt-html` should only be used with trusted content.
- The project is still early and the API can move while the core settles.
