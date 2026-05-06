import type {
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
      const clickEvent = new Event("click", { bubbles: true });
      el.dispatchEvent(clickEvent);
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
      overlay.remove();
    }
  });

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        overlay.remove();
      }
    },
    { once: true }
  );

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