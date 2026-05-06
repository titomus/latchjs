import type {
  ConfirmOptions,
  DirectiveInstaller,
  LatchApp,
  LatchConfig,
  LatchEventCallback,
  LatchPlugin,
  ModalOptions,
  RequestOptions,
  ToastOptions
} from "../types";
import { defaultConfig, mergeConfig } from "./config";
import { EventBus } from "./events";
import { runRequest } from "./request";
import { scanTree } from "./scanner";

export class LatchRuntime implements LatchApp {
  config: LatchConfig = { ...defaultConfig };
  directiveInstallers = new Map<string, DirectiveInstaller>();
  stores: Record<string, unknown> = {};

  private started = false;
  private readonly events = new EventBus();

  start(root: ParentNode = document.body): void {
    if (this.started) {
      return;
    }

    this.emit("latch:beforeStart", { root });
    this.started = true;
    this.scan(root);
    this.emit("latch:afterStart", { root });
  }

  stop(): void {
    this.started = false;
  }

  scan(root: ParentNode): void {
    scanTree(this, root);
  }

  configure(options: Partial<LatchConfig>): void {
    this.config = mergeConfig(this.config, options);
  }

  on(eventName: string, callback: LatchEventCallback): () => void {
    return this.events.on(eventName, callback);
  }

  off(eventName: string, callback: LatchEventCallback): void {
    this.events.off(eventName, callback);
  }

  emit(eventName: string, detail?: unknown): CustomEvent<unknown> {
    return this.events.emit(eventName, detail);
  }

  plugin(plugin: LatchPlugin | ((app: LatchApp) => void)): void {
    if (typeof plugin === "function") {
      plugin(this);
      return;
    }

    plugin.install(this);
  }

  store(name: string, value?: unknown): unknown {
    if (arguments.length === 2) {
      this.stores[name] = value;
      return value;
    }

    return this.stores[name];
  }

  async refresh(target: string | Element): Promise<void> {
    const elements =
      typeof target === "string"
        ? Array.from(document.querySelectorAll<HTMLElement>(target))
        : [target as HTMLElement];

    for (const el of elements) {
      el.dispatchEvent(new CustomEvent("latch:refresh"));
    }
  }

  request(options: RequestOptions): Promise<Response> {
    return runRequest(
      {
        emit: this.emit.bind(this),
        config: this.config,
        toast: this.toast.bind(this),
        refresh: this.refresh.bind(this),
        scan: this.scan.bind(this),
        closeOverlay: this.closeOverlay.bind(this)
      },
      options
    );
  }

  toast(message: string, options: ToastOptions = {}): HTMLElement {
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    const type = options.type ?? "neutral";

    toast.className = `latch-toast latch-toast-${type}`;
    toast.textContent = message;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.style.cssText = [
      "padding: 0.75rem 1rem",
      "border-radius: 0.75rem",
      "background: rgba(17,24,39,0.94)",
      "color: white",
      "box-shadow: 0 16px 40px rgba(15,23,42,0.18)",
      "font: 500 14px/1.4 system-ui, sans-serif"
    ].join(";");

    container.append(toast);

    window.setTimeout(() => {
      toast.remove();
    }, options.duration ?? this.config.toastDuration);

    return toast;
  }

  async modal(source: string, options: ModalOptions = {}): Promise<void> {
    await openOverlay(this, source, {
      kind: options.kind ?? "modal",
      side: options.side ?? "right"
    });
  }

  confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    return openConfirmOverlay(this, message, options);
  }

  async drawer(source: string, options: ModalOptions = {}): Promise<void> {
    await this.modal(source, {
      ...options,
      kind: "drawer"
    });
  }

  directive(name: string, installer: DirectiveInstaller): void {
    this.directiveInstallers.set(name, installer);
  }

  closeOverlay(kind: string): void {
    const selector = kind === "drawer" ? "[data-latch-overlay='drawer']" : "[data-latch-overlay='modal']";
    const overlay = document.querySelector(selector);

    if (overlay) {
      overlay.remove();
    }

    const previous = overlayFocus.get(kind);

    if (previous?.isConnected) {
      previous.focus();
    }

    overlayFocus.delete(kind);
  }
}

function ensureToastContainer(): HTMLElement {
  let container = document.querySelector<HTMLElement>("[lt-toast-container], [data-latch-toast-container]");

  if (!container) {
    container = document.createElement("div");
    container.dataset.latchToastContainer = "true";
    container.setAttribute("aria-live", "polite");
    container.style.cssText = [
      "position: fixed",
      "top: 1rem",
      "right: 1rem",
      "display: grid",
      "gap: 0.75rem",
      "z-index: 9999"
    ].join(";");
    document.body.append(container);
  }

  return container;
}

const overlayFocus = new Map<string, HTMLElement>();

async function openConfirmOverlay(
  app: LatchRuntime,
  message: string,
  options: ConfirmOptions
): Promise<boolean> {
  app.closeOverlay("confirm");

  const active = document.activeElement;

  if (active instanceof HTMLElement) {
    overlayFocus.set("confirm", active);
  }

  return new Promise<boolean>((resolve) => {
    const overlay = document.createElement("div");
    overlay.dataset.latchOverlay = "confirm";
    overlay.style.cssText = [
      "position: fixed",
      "inset: 0",
      "background: rgba(15,23,42,0.56)",
      "display: grid",
      "place-items: center",
      "z-index: 9998"
    ].join(";");

    const panel = document.createElement("div");
    panel.setAttribute("role", "alertdialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "latch-confirm-title");
    panel.setAttribute("aria-describedby", "latch-confirm-message");
    panel.style.cssText = [
      "width: min(30rem, calc(100vw - 2rem))",
      "background: white",
      "border-radius: 1rem",
      "padding: 1.25rem",
      "display: grid",
      "gap: 1rem",
      "box-shadow: 0 24px 60px rgba(15,23,42,0.24)"
    ].join(";");

    const title = document.createElement("h2");
    title.id = "latch-confirm-title";
    title.textContent = options.title ?? "Confirm action";
    title.style.cssText = "margin: 0; font: 600 1.125rem/1.3 system-ui, sans-serif; color: #111827";

    const body = document.createElement("p");
    body.id = "latch-confirm-message";
    body.textContent = message;
    body.style.cssText = "margin: 0; font: 400 0.95rem/1.5 system-ui, sans-serif; color: #374151";

    const actions = document.createElement("div");
    actions.style.cssText = "display: flex; justify-content: end; gap: 0.75rem; flex-wrap: wrap";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = options.cancelText ?? "Cancel";
    cancelButton.style.cssText = [
      "border: 1px solid rgba(17,24,39,0.12)",
      "background: white",
      "color: #0f766e",
      "border-radius: 999px",
      "padding: 0.7rem 1rem",
      "cursor: pointer"
    ].join(";");

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.textContent = options.confirmText ?? "Confirm";
    confirmButton.style.cssText = [
      "border: 0",
      "background: " + (options.tone === "danger" ? "linear-gradient(135deg, #d6336c, #c92a2a)" : "linear-gradient(135deg, #0f766e, #2a9d8f)"),
      "color: white",
      "border-radius: 999px",
      "padding: 0.7rem 1rem",
      "cursor: pointer"
    ].join(";");

    const cleanup = (accepted: boolean) => {
      overlay.remove();
      const previous = overlayFocus.get("confirm");

      if (previous?.isConnected) {
        previous.focus();
      }

      overlayFocus.delete("confirm");
      resolve(accepted);
    };

    cancelButton.addEventListener("click", () => cleanup(false));
    confirmButton.addEventListener("click", () => cleanup(true));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cleanup(false);
      }
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanup(false);
        return;
      }

      if (event.key === "Tab") {
        trapOverlayFocus(panel, event);
      }
    });

    actions.append(cancelButton, confirmButton);
    panel.append(title, body, actions);
    overlay.append(panel);
    document.body.append(overlay);
    confirmButton.focus();
  });
}

async function openOverlay(
  app: LatchRuntime,
  source: string,
  options: Required<Pick<ModalOptions, "kind" | "side">>
): Promise<void> {
  app.closeOverlay(options.kind);

  const active = document.activeElement;

  if (active instanceof HTMLElement) {
    overlayFocus.set(options.kind, active);
  }

  const overlay = document.createElement("div");
  overlay.dataset.latchOverlay = options.kind;
  overlay.style.cssText = [
    "position: fixed",
    "inset: 0",
    "background: rgba(15,23,42,0.56)",
    "display: grid",
    options.kind === "drawer" ? "justify-items: stretch" : "place-items: center",
    "z-index: 9998"
  ].join(";");

  const panel = document.createElement("div");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.style.cssText = buildPanelStyle(options.kind, options.side);

  overlay.append(panel);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      app.closeOverlay(options.kind);
    }
  });

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        app.closeOverlay(options.kind);
      }
    },
    { once: true }
  );

  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      trapOverlayFocus(panel, event);
    }
  });

  document.body.append(overlay);

  if (source.startsWith("#")) {
    const template = document.querySelector<HTMLTemplateElement>(source);
    panel.innerHTML = template?.innerHTML ?? "";
    app.scan(panel);
    focusOverlay(panel);
    return;
  }

  const response = await app.request({
    method: "GET",
    url: source,
    target: panel,
    swap: "innerHTML"
  });

  panel.innerHTML = await response.text();
  app.scan(panel);
  focusOverlay(panel);
}

function focusOverlay(panel: HTMLElement): void {
  const focusable = panel.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusable) {
    focusable.focus();
    return;
  }

  panel.tabIndex = -1;
  panel.focus();
}

function trapOverlayFocus(panel: HTMLElement, event: KeyboardEvent): void {
  const focusable = getFocusableElements(panel);

  if (focusable.length === 0) {
    event.preventDefault();
    panel.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && (active === first || active === panel)) {
    event.preventDefault();
    last.focus();
    return;
  }

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function getFocusableElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(
    panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hidden && element.tabIndex >= 0);
}

function buildPanelStyle(kind: string, side: string): string {
  if (kind === "drawer") {
    const position =
      side === "left"
        ? "justify-self: start; width: min(32rem, 100vw); height: 100%;"
        : side === "top"
          ? "align-self: start; width: 100%; max-height: min(24rem, 100vh);"
          : side === "bottom"
            ? "align-self: end; width: 100%; max-height: min(24rem, 100vh);"
            : "justify-self: end; width: min(32rem, 100vw); height: 100%;";

    return [
      position,
      "background: white",
      "padding: 1.5rem",
      "overflow: auto",
      "box-shadow: 0 20px 50px rgba(15,23,42,0.24)"
    ].join(";");
  }

  return [
    "width: min(42rem, calc(100vw - 2rem))",
    "max-height: calc(100vh - 2rem)",
    "overflow: auto",
    "background: white",
    "padding: 1.5rem",
    "border-radius: 1rem",
    "box-shadow: 0 24px 60px rgba(15,23,42,0.24)"
  ].join(";");
}

export function createLatch(): LatchRuntime {
  return new LatchRuntime();
}