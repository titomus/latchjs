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

  it("initializes dropdown and tabs components", () => {
    document.body.innerHTML = `
      <div lt-dropdown>
        <button id="trigger" lt-dropdown-trigger>Actions</button>
        <div id="menu" lt-dropdown-menu>Menu</div>
      </div>

      <div lt-tabs="profile">
        <button id="tab-profile" lt-tab="profile">Profil</button>
        <button id="tab-settings" lt-tab="settings">Settings</button>
        <section id="panel-profile" lt-panel="profile">P1</section>
        <section id="panel-settings" lt-panel="settings">P2</section>
      </div>
    `;

    Latch.start();

    const menu = document.querySelector("#menu") as HTMLElement;
    expect(menu.hidden).toBe(true);

    (document.querySelector("#trigger") as HTMLButtonElement).click();
    expect(menu.hidden).toBe(false);

    expect((document.querySelector("#panel-profile") as HTMLElement).hidden).toBe(false);
    expect((document.querySelector("#panel-settings") as HTMLElement).hidden).toBe(true);

    (document.querySelector("#tab-settings") as HTMLButtonElement).click();
    expect((document.querySelector("#panel-profile") as HTMLElement).hidden).toBe(true);
    expect((document.querySelector("#panel-settings") as HTMLElement).hidden).toBe(false);
  });
});