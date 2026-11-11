import { beforeEach, describe, expect, it, vi } from "vitest";
import { Latch } from "../src/latch";

describe("Latch", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    Latch.stop();
  });

  it("updates local state bindings", () => {
    document.body.innerHTML = `
      <div lt-state="{ open: false, count: 1, markup: '<em>Ready</em>' }">
        <button id="toggle" lt-click="open = !open"></button>
        <button id="inc" lt-click="count += 1"></button>
        <p id="value" lt-text="count"></p>
        <div id="html" lt-html="markup"></div>
        <div id="box" lt-show="open">Visible</div>
        <div id="if-box" lt-if="count > 1">Conditional</div>
      </div>
    `;

    Latch.start();

    const value = document.querySelector("#value") as HTMLElement;
    const box = document.querySelector("#box") as HTMLElement;
    const ifBox = document.querySelector("#if-box") as HTMLElement;

    expect(value.textContent).toBe("1");
    expect(box.hidden).toBe(true);
    expect(ifBox.hidden).toBe(true);
    expect(document.querySelector("#html em")?.textContent).toBe("Ready");

    (document.querySelector("#toggle") as HTMLButtonElement).click();
    (document.querySelector("#inc") as HTMLButtonElement).click();

    expect(box.hidden).toBe(false);
    expect(value.textContent).toBe("2");
    expect(ifBox.hidden).toBe(false);
  });

  it("runs a request and swaps returned html", async () => {
    document.body.innerHTML = `
      <button id="load" lt-get="/fragment" lt-target="#result">Load</button>
      <div id="result"></div>
    `;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("<p id='done'>Done</p>", {
          status: 200,
          headers: {
            "content-type": "text/html"
          }
        })
      )
    );

    Latch.start();
    (document.querySelector("#load") as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(document.querySelector("#done")?.textContent).toBe("Done");
    });
  });

  it("renders json form errors cleanly", async () => {
    document.body.innerHTML = `
      <form id="login" lt-form lt-post="/login" lt-error-target="#errors" lt-error-class="field-error">
        <input id="email" name="email" value="bad@example">
        <p data-latch-error-for="email"></p>
        <button type="submit">Login</button>
      </form>
      <div id="errors"></div>
    `;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ errors: { email: "Email invalide" } }), {
          status: 422,
          headers: {
            "content-type": "application/json"
          }
        })
      )
    );

    Latch.start();
    (document.querySelector("#login") as HTMLFormElement).requestSubmit();

    await vi.waitFor(() => {
      expect(document.querySelector("#errors")?.textContent).toContain("Email invalide");
    });

    expect(document.querySelector("#email")?.getAttribute("aria-invalid")).toBe("true");
    expect(document.querySelector("#email")?.classList.contains("field-error")).toBe(true);
    expect(document.querySelector("[data-latch-error-for='email']")?.textContent).toBe("Email invalide");
  });

  it("submits on change and serializes get query params", async () => {
    document.body.innerHTML = `
      <form id="search" lt-form lt-get="/search" lt-submit-on-change lt-target="#results">
        <input id="query" name="q" value="latch">
        <select id="status" name="status">
          <option value="draft">draft</option>
          <option value="active">active</option>
        </select>
      </form>
      <div id="results"></div>
    `;

    const fetchMock = vi.fn(async () =>
      new Response("<p id='search-result'>OK</p>", {
        status: 200,
        headers: {
          "content-type": "text/html"
        }
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    Latch.start();
    const select = document.querySelector("#status") as HTMLSelectElement;
    select.value = "active";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(document.querySelector("#search-result")?.textContent).toBe("OK");
    });

    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("q=latch");
    expect(url).toContain("status=active");
  });

  it("initializes dropdown and tabs components with keyboard accessibility", () => {
    document.body.innerHTML = `
      <div lt-dropdown>
        <button id="trigger" lt-dropdown-trigger>Actions</button>
        <div id="menu" lt-dropdown-menu>
          <button id="item-edit">Edit</button>
          <button id="item-delete">Delete</button>
        </div>
      </div>

      <div lt-tabs="profile">
        <button id="tab-profile" lt-tab="profile">Profil</button>
        <button id="tab-settings" lt-tab="settings">Settings</button>
        <section id="panel-profile" lt-panel="profile">P1</section>
        <section id="panel-settings" lt-panel="settings">P2</section>
      </div>

      <div lt-accordion>
        <button id="acc-one" lt-accordion-trigger="one">One</button>
        <div id="acc-panel-one" lt-accordion-panel="one">A1</div>
        <button id="acc-two" lt-accordion-trigger="two">Two</button>
        <div id="acc-panel-two" lt-accordion-panel="two">A2</div>
      </div>
    `;

    Latch.start();

    const menu = document.querySelector("#menu") as HTMLElement;
    expect(menu.hidden).toBe(true);
    expect((document.querySelector("#trigger") as HTMLButtonElement).getAttribute("aria-controls")).toBe("menu");
    expect(menu.getAttribute("role")).toBe("menu");

    const trigger = document.querySelector("#trigger") as HTMLButtonElement;
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(menu.hidden).toBe(false);
    expect(document.activeElement).toBe(document.querySelector("#item-edit"));

    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement).toBe(document.querySelector("#item-delete"));

    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);

    expect((document.querySelector("#panel-profile") as HTMLElement).hidden).toBe(false);
    expect((document.querySelector("#panel-settings") as HTMLElement).hidden).toBe(true);
    expect((document.querySelector("#tab-profile") as HTMLButtonElement).getAttribute("role")).toBe("tab");
    expect((document.querySelector("#panel-profile") as HTMLElement).getAttribute("aria-labelledby")).toBe("tab-profile");

    const tabProfile = document.querySelector("#tab-profile") as HTMLButtonElement;
    tabProfile.focus();
    tabProfile.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect((document.querySelector("#panel-profile") as HTMLElement).hidden).toBe(true);
    expect((document.querySelector("#panel-settings") as HTMLElement).hidden).toBe(false);
    expect(document.activeElement).toBe(document.querySelector("#tab-settings"));

    const accOne = document.querySelector("#acc-one") as HTMLButtonElement;
    const accTwo = document.querySelector("#acc-two") as HTMLButtonElement;
    expect(accOne.getAttribute("aria-controls")).toBe("acc-panel-one");
    accOne.focus();
    accOne.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement).toBe(accTwo);
  });

  it("refreshes request elements through the runtime api", async () => {
    document.body.innerHTML = `
      <div id="feed" lt-get="/feed" lt-trigger="load" lt-target="#feed"></div>
    `;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("<p id='feed-state'>First</p>", {
          status: 200,
          headers: {
            "content-type": "text/html"
          }
        })
      )
      .mockResolvedValueOnce(
        new Response("<p id='feed-state'>Second</p>", {
          status: 200,
          headers: {
            "content-type": "text/html"
          }
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    Latch.start();

    await vi.waitFor(() => {
      expect(document.querySelector("#feed-state")?.textContent).toBe("First");
    });

    await Latch.refresh("#feed");

    await vi.waitFor(() => {
      expect(document.querySelector("#feed-state")?.textContent).toBe("Second");
    });
  });

  it("loads and filters a native table component", async () => {
    document.body.innerHTML = `
      <section lt-table lt-source="/api/table" lt-target="#table-results" lt-sync-url>
        <input id="table-search" lt-table-search placeholder="Search">
        <select id="table-status" lt-table-filter="status">
          <option value="">all</option>
          <option value="open">open</option>
        </select>
        <button id="table-sort" lt-table-sort="name">Sort</button>
        <div id="table-results"></div>
      </section>
    `;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(rawUrl, "http://localhost/");
      const q = url.searchParams.get("q") ?? "";
      const status = url.searchParams.get("status") ?? "";
      const sort = url.searchParams.get("sort") ?? "";
      return new Response(
        `<div id="table-payload">${q || "all"}|${status || "all"}|${sort || "none"}</div>`,
        {
          status: 200,
          headers: {
            "content-type": "text/html"
          }
        }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    Latch.start();

    await vi.waitFor(() => {
      expect(document.querySelector("#table-payload")?.textContent).toBe("all|all|none");
    });

    const search = document.querySelector("#table-search") as HTMLInputElement;
    search.value = "alpha";
    search.dispatchEvent(new Event("input", { bubbles: true }));

    await vi.waitFor(() => {
      expect(document.querySelector("#table-payload")?.textContent).toContain("alpha");
    });

    const status = document.querySelector("#table-status") as HTMLSelectElement;
    status.value = "open";
    status.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() => {
      expect(document.querySelector("#table-payload")?.textContent).toContain("open");
    });

    (document.querySelector("#table-sort") as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(document.querySelector("#table-payload")?.textContent).toContain("name");
    });

    expect(window.location.search).toContain("q=alpha");
    expect(window.location.search).toContain("status=open");
  });

  it("blocks or continues requests through the native confirm dialog", async () => {
    document.body.innerHTML = `
      <button
        id="destroy"
        lt-delete="/items/1"
        lt-target="#result"
        lt-confirm="Delete this item?"
        lt-confirm-title="Danger zone"
        lt-confirm-confirm-text="Delete"
      >
        Delete
      </button>
      <div id="result"></div>
    `;

    const fetchMock = vi.fn(async () =>
      new Response("<p id='confirm-result'>Deleted</p>", {
        status: 200,
        headers: {
          "content-type": "text/html"
        }
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    Latch.start();
    (document.querySelector("#destroy") as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(document.querySelector("[data-latch-overlay='confirm']")).not.toBeNull();
      expect(document.querySelector("#latch-confirm-title")?.textContent).toBe("Danger zone");
    });

    (Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Cancel") as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(document.querySelector("[data-latch-overlay='confirm']")).toBeNull();
    });

    expect(fetchMock).not.toHaveBeenCalled();

    (document.querySelector("#destroy") as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(document.querySelector("[data-latch-overlay='confirm']")).not.toBeNull();
    });

    (Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Delete") as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(document.querySelector("#confirm-result")?.textContent).toBe("Deleted");
    });
  });

  it("runs custom directives registered through the plugin api", async () => {
    document.body.innerHTML = `
      <section lt-state="{ lastAction: 'none' }">
        <button id="plugin-action" lt-test-command="archive sprint">Archive sprint</button>
        <p id="plugin-state" lt-on="plugin:command -> lastAction = $event.detail.value">
          <span id="plugin-value" lt-text="lastAction"></span>
        </p>
      </section>
    `;

    Latch.directive("test-command", ({ el, value, app }) => {
      if (el.dataset.testCommandBound === "true") {
        return;
      }

      el.dataset.testCommandBound = "true";
      el.addEventListener("click", () => {
        app.store("plugin:lastAction", value);
        app.emit("plugin:command", { value });
      });
    });

    Latch.start();
    (document.querySelector("#plugin-action") as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(document.querySelector("#plugin-value")?.textContent).toBe("archive sprint");
      expect(Latch.store("plugin:lastAction")).toBe("archive sprint");
    });
  });
  it("scans nested state scopes once and keeps parent state available", () => {
    document.body.innerHTML = `
      <div lt-state="{parentCount: 2}">
        <div lt-state="{childCount: 3}">
          <span id="nested-value" lt-text="parentCount + childCount"></span>
          <button id="nested-inc" lt-click="childCount += 1">Increment</button>
        </div>
      </div>
    `;
    Latch.start();
    expect(document.querySelector("#nested-value")?.textContent).toBe("5");
    (document.querySelector("#nested-inc") as HTMLButtonElement).click();
    expect(document.querySelector("#nested-value")?.textContent).toBe("6");
  });

  it("scans a detached fragment after insertion without duplicate initialization", () => {
    document.body.innerHTML = '<div id="host"></div>';
    Latch.start();
    const host = document.querySelector("#host") as HTMLElement;
    host.innerHTML = '<div lt-state="{count:0}"><button id="once" lt-click="count += 1">+</button><span id="once-value" lt-text="count"></span></div>';
    Latch.scan(host);
    Latch.scan(host);
    (document.querySelector("#once") as HTMLButtonElement).click();
    expect(document.querySelector("#once-value")?.textContent).toBe("1");
  });

  it("preserves local state when rescanning the same subtree", () => {
    document.body.innerHTML = `
      <div lt-state="{count:0}">
        <button id="rescan-inc" lt-click="count += 1">+</button>
        <span id="rescan-value" lt-text="count"></span>
      </div>
    `;
    Latch.start();
    (document.querySelector("#rescan-inc") as HTMLButtonElement).click();
    expect(document.querySelector("#rescan-value")?.textContent).toBe("1");
    Latch.scan(document.body);
    (document.querySelector("#rescan-inc") as HTMLButtonElement).click();
    expect(document.querySelector("#rescan-value")?.textContent).toBe("2");
  });

  it("keeps the latest GET response when earlier fetches resolve later", async () => {
    document.body.innerHTML = `
      <button id="race-load" lt-get="/race" lt-target="#race-target">Load</button>
      <div id="race-target"></div>
    `;
    const complete: Array<(response: Response) => void> = [];
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => {
      complete.push(resolve);
    })));
    Latch.start();
    const button = document.querySelector("#race-load") as HTMLButtonElement;
    button.click();
    button.click();
    expect(complete.length).toBe(2);
    const html = (content: string) => new Response(content, {
      status: 200, headers: { "content-type": "text/html" }
    });
    complete[1](html("<strong>NEW</strong>"));
    await vi.waitFor(() => expect(document.querySelector("#race-target")?.textContent).toBe("NEW"));
    complete[0](html("<strong>OLD</strong>"));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector("#race-target")?.textContent).toBe("NEW");
  });

  it("ignores stale native table results after a filter change", async () => {
    document.body.innerHTML = `
      <section lt-table lt-source="/api/list" lt-target="#race-table">
        <select id="race-stage" lt-table-filter="stage">
          <option value="">All</option>
          <option value="ready">Ready</option>
        </select>
        <div id="race-table"></div>
      </section>
    `;
    const complete: Array<(response: Response) => void> = [];
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => {
      complete.push(resolve);
    })));
    Latch.start();
    const field = document.querySelector("#race-stage") as HTMLSelectElement;
    field.value = "ready";
    field.dispatchEvent(new Event("change", { bubbles: true }));
    expect(complete.length).toBe(2);
    const html = (content: string) => new Response(content, {
      status: 200, headers: { "content-type": "text/html" }
    });
    complete[1](html("<p>READY</p>"));
    await vi.waitFor(() => expect(document.querySelector("#race-table")?.textContent).toBe("READY"));
    complete[0](html("<p>ALL</p>"));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector("#race-table")?.textContent).toBe("READY");
  });

  it("batches multiple mutations and updates text synchronously", () => {
    document.body.innerHTML = `
      <div lt-state="{a:0, b:0, items:[]}">
        <button id="batch" lt-click="a += 1; b += 1; items.push('x')">Update</button>
        <span id="batch-result" lt-text="a + b + items.length"></span>
      </div>
    `;
    Latch.start();
    (document.querySelector("#batch") as HTMLButtonElement).click();
    expect(document.querySelector("#batch-result")?.textContent).toBe("3");
  });

  it("disposes detached global listeners and restores them on rescan", async () => {
    document.body.innerHTML = '<button id="external" lt-get="/ping" lt-refresh-on="test:ping" lt-swap="none">Ping</button>';
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    Latch.start();
    const button = document.querySelector("#external") as HTMLButtonElement;
    window.dispatchEvent(new Event("test:ping"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    button.remove();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    window.dispatchEvent(new Event("test:ping"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    document.body.append(button);
    Latch.scan(button);
    window.dispatchEvent(new Event("test:ping"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("debounces repeated auto-submit input events", async () => {
    document.body.innerHTML = `
      <form lt-form lt-get="/lookup" lt-target="#lookup-result" lt-submit-on-change lt-debounce="20">
        <input id="lookup" name="q">
      </form>
      <div id="lookup-result"></div>
    `;
    const fetchMock = vi.fn(async () => new Response("<p>OK</p>", {
      status: 200, headers: { "content-type": "text/html" }
    }));
    vi.stubGlobal("fetch", fetchMock);
    Latch.start();
    const input = document.querySelector("#lookup") as HTMLInputElement;
    input.value = "one";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.value = "one two";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("updates inherited state when a reactive subtree moves to a new parent", () => {
    document.body.innerHTML = `
      <div id="parent-a" lt-state="{outer:1}">
        <div id="moved" lt-state="{count:2}">
          <span id="moved-result" lt-text="outer + count"></span>
        </div>
      </div>
      <div id="parent-b" lt-state="{outer:10}"></div>
    `;
    Latch.start();
    expect(document.querySelector("#moved-result")?.textContent).toBe("3");
    const moved = document.querySelector("#moved") as HTMLElement;
    (document.querySelector("#parent-b") as HTMLElement).append(moved);
    Latch.scan(moved);
    expect(document.querySelector("#moved-result")?.textContent).toBe("12");
  });

  it("activates directives added later to previously plain HTML nodes", () => {
    document.body.innerHTML = `
      <div id="dynamic-scope">
        <button id="dynamic-button">Increment</button>
        <span id="dynamic-value">pending</span>
      </div>
    `;
    Latch.start();
    const host = document.querySelector("#dynamic-scope") as HTMLElement;
    const button = document.querySelector("#dynamic-button") as HTMLElement;
    const label = document.querySelector("#dynamic-value") as HTMLElement;
    host.setAttribute("lt-state", "{ count: 0 }");
    button.setAttribute("lt-click", "count += 1");
    label.setAttribute("lt-text", "count");
    Latch.scan(host);
    expect(label.textContent).toBe("0");
    button.click();
    expect(label.textContent).toBe("1");
  });

  it("renders keyed lt-for rows and retains DOM identity across reorders", () => {
    document.body.innerHTML = `
      <ul lt-state="{items:[{id:1,name:'First'},{id:2,name:'Second'}]}">
        <button id="reorder" lt-click="items = [items[1],items[0]]">Reorder</button>
        <button id="add-row" lt-click="items = [...items, {id:3,name:'Third'}]">Add</button>
        <button id="delete-row" lt-click="items = items.filter(item => item.id !== 2)">Delete</button>
        <template lt-for="item in items" lt-key="item.id">
          <li lt-bind:data-key="item.id"><span lt-text="item.name"></span></li>
        </template>
      </ul>
    `;
    Latch.start();
    const rows = () => Array.from(document.querySelectorAll<HTMLLIElement>("li"));
    expect(rows().map((el) => el.textContent)).toEqual(["First", "Second"]);
    const first = rows()[0];
    (document.querySelector("#reorder") as HTMLButtonElement).click();
    expect(rows().map((el) => el.textContent)).toEqual(["Second", "First"]);
    expect(rows()[1]).toBe(first);

    (document.querySelector("#add-row") as HTMLButtonElement).click();
    expect(rows().map((el) => el.textContent)).toEqual(["Second", "First", "Third"]);
    (document.querySelector("#delete-row") as HTMLButtonElement).click();
    expect(rows().map((el) => el.textContent)).toEqual(["First", "Third"]);
  });

  it("supports index aliases and interactive controls inside repeated rows", () => {
    document.body.innerHTML = `
      <div lt-state="{todos:[{id:1,done:false},{id:2,done:false}]}">
        <template lt-for="(todo, index) in todos" lt-key="todo.id">
          <div class="task"><button lt-click="todo.done = !todo.done">Toggle</button>
            <span lt-text="index"></span><span lt-text="todo.done ? 'Yes' : 'No'"></span>
          </div>
        </template>
      </div>
    `;
    Latch.start();
    const row = document.querySelector(".task") as HTMLElement;
    expect(row.textContent).toContain("0No");
    (row.querySelector("button") as HTMLButtonElement).click();
    expect(row.textContent).toContain("0Yes");
    expect(document.querySelectorAll(".task")).toHaveLength(2);
  });

  it("preserves a model input cursor when an unrelated state binding refreshes", () => {
    document.body.innerHTML = `
      <div lt-state="{name:'ABCD', count:0}">
        <input id="model-focus" lt-model="name">
        <button id="model-other" lt-click="count++">Click</button>
        <span lt-text="count"></span>
      </div>
    `;
    Latch.start();
    const input = document.querySelector("#model-focus") as HTMLInputElement;
    input.focus();
    input.setSelectionRange(2,2);
    (document.querySelector("#model-other") as HTMLButtonElement).click();
    expect(input.value).toBe("ABCD");
    expect(input.selectionStart).toBe(2);
  });

  it("syncs a repeated checkbox model and parent derived totals", () => {
    document.body.innerHTML = `
      <div lt-state="{tasks:[{id:1,done:false},{id:2,done:false}]}">
        <strong id="unfinished" lt-text="tasks.filter(t=>!t.done).length"></strong>
        <template lt-for="task in tasks" lt-key="task.id">
          <label class="repeated-model"><input type="checkbox" lt-model="task.done"><span lt-text="task.done ? 'Done' : 'Open'"></span></label>
        </template>
      </div>
    `;
    Latch.start();
    expect(document.querySelector("#unfinished")?.textContent).toBe("2");
    const first = document.querySelector(".repeated-model input") as HTMLInputElement;
    first.checked = true;
    first.dispatchEvent(new Event("change", { bubbles: true }));
    expect(first.checked).toBe(true);
    expect(document.querySelector(".repeated-model span")?.textContent).toBe("Done");
    expect(document.querySelector("#unfinished")?.textContent).toBe("1");
  });

  it("initializes a local scope once and does not rerun on rescan", async () => {
    document.body.innerHTML = `
      <div lt-state="{count:0}" lt-init="count += 5">
        <strong id="init-value" lt-text="count"></strong>
      </div>
    `;
    Latch.start();
    await vi.waitFor(() => expect(document.querySelector("#init-value")?.textContent).toBe("5"));
    Latch.scan(document.body);
    expect(document.querySelector("#init-value")?.textContent).toBe("5");
  });

  it("supports event modifiers, local state and once-only semantics", () => {
    document.body.innerHTML = `
      <div lt-state="{count:0}">
        <button id="event-once" lt-on:click.prevent.once="count += 1">Update</button>
        <strong id="event-count" lt-text="count"></strong>
      </div>
    `;
    Latch.start();
    const button = document.querySelector("#event-once") as HTMLButtonElement;
    const event = new Event("click", { bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    button.click();
    expect(document.querySelector("#event-count")?.textContent).toBe("1");
  });

  it("debounces repeated lt-on:input events and updates local bindings", async () => {
    document.body.innerHTML = `
      <div lt-state="{query:''}">
        <input id="debounced" lt-on:input.debounce.15ms="query = $el.value">
        <span id="debounced-result" lt-text="query"></span>
      </div>
    `;
    Latch.start();
    const el = document.querySelector("#debounced") as HTMLInputElement;
    el.value = "a";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.value = "hello";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.waitFor(() => expect(document.querySelector("#debounced-result")?.textContent).toBe("hello"));
  });

});