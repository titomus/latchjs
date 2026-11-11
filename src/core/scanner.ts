import type { DirectiveInstaller, LatchConfig, RequestOptions } from "../types";
import { attributeName } from "./config";
import { bindScope, createScope, getScope, runInScope, setModelValue } from "./state";
import { handleResponse } from "./request";

interface ScannerApp {
  config: LatchConfig;
  emit(eventName: string, detail?: unknown): CustomEvent<unknown>;
  toast(message: string, options?: { type?: string }): HTMLElement;
  confirm(message: string, options?: { title?: string; confirmText?: string; cancelText?: string; tone?: "neutral" | "danger" }): Promise<boolean>;
  refresh(target: string | Element): Promise<void>;
  request(options: RequestOptions): Promise<Response>;
  scan(root: ParentNode): void;
  closeOverlay(kind: string): void;
  directiveInstallers: Map<string, DirectiveInstaller>;
  stores: Record<string, unknown>;
  modal(source: string, options?: { kind?: "modal" | "drawer"; side?: "left" | "right" | "top" | "bottom" }): Promise<void>;
}

type ParsedTrigger =
  | { type: "dom"; value: string; delayMs?: number }
  | { type: "load"; value: "load" }
  | { type: "every"; value: "every"; delayMs?: number }
  | { type: "event"; value: string }
  | { type: "intersect"; value: "intersect" };

const initializedElements = new WeakSet<HTMLElement>();
const dirtySnapshotByForm = new WeakMap<HTMLFormElement, string>();
const requestAttributes = ["get", "post", "put", "patch", "delete"] as const;
let beforeUnloadBound = false;
const tableStateByRoot = new WeakMap<HTMLElement, TableState>();

interface TableState {
  root: HTMLElement;
  source: string;
  targetSelector: string;
  searchTerm: string;
  filters: Record<string, string>;
  sort?: string;
  order: "asc" | "desc";
  page: number;
  syncUrl: boolean;
  refreshOn: string[];
  requestVersion: number;
  activeRequest?: AbortController;
}

export function scanTree(app: ScannerApp, root: ParentNode): void {
  app.emit("latch:beforeScan", { root });

  // walk() already visits descendants and propagates the nearest reactive scope.
  // Walking every descendant again made a full scan quadratic and could
  // initialize nested scopes against the wrong parent.
  if (root instanceof HTMLElement) {
    walk(app, root, getScope(root));
  } else {
    for (const child of Array.from(root.children)) {
      if (child instanceof HTMLElement) walk(app, child, getScope(child));
    }
  }

  app.emit("latch:afterScan", { root });
}

function walk(app: ScannerApp, el: HTMLElement, currentScope = getScope(el)): void {
  const initialized = initializedElements.has(el);
  const stateExpression = el.getAttribute(attributeName(app.config.prefix, "state"));
  // A swapped parent's rescan must reuse its scope: recreating it resets
  // local state and can even make the scope its own parent.
  const scope = initialized
    ? getScope(el) ?? currentScope
    : stateExpression
      ? createScope(el, stateExpression, currentScope, {
          $el: el,
          $store: app.stores
        })
      : currentScope;

  if (!initialized) {
    initializeElement(app, el, scope);
    initializedElements.add(el);
  }

  for (const child of Array.from(el.children)) {
    walk(app, child as HTMLElement, scope);
  }
}

function initializeElement(app: ScannerApp, el: HTMLElement, scope?: ReturnType<typeof getScope>): void {
  initializeFormEnhancements(app, el);
  initializeRequestElement(app, el);
  initializeStateDirectives(app, el, scope);
  initializeOverlayDirectives(app, el);
  initializeEventDirectives(app, el, scope);
  initializeNativeComponents(app, el);
  initializeCustomDirectives(app, el);
}

function initializeFormEnhancements(app: ScannerApp, el: HTMLElement): void {
  if (el instanceof HTMLFormElement && el.hasAttribute(attributeName(app.config.prefix, "dirty-check"))) {
    initializeDirtyCheck(el);
  }

  if (el instanceof HTMLFormElement && el.hasAttribute(attributeName(app.config.prefix, "submit-on-change"))) {
    const submit = (event: Event) => {
      const target = event.target;

      if (target instanceof HTMLElement && !isSubmitControl(target)) {
        el.requestSubmit();
      }
    };

    el.addEventListener("change", submit);
    el.addEventListener("input", submit);
  }

  if (isValueElement(el) && el.hasAttribute(attributeName(app.config.prefix, "submit-on-change"))) {
    const form = resolveAssociatedForm(el);

    if (form) {
      const submit = () => form.requestSubmit();
      el.addEventListener("change", submit);
      el.addEventListener("input", submit);
    }
  }
}

function initializeRequestElement(app: ScannerApp, el: HTMLElement): void {
  const methodName = requestAttributes.find((name) => el.hasAttribute(attributeName(app.config.prefix, name)));
  const isForm = el instanceof HTMLFormElement && el.hasAttribute(attributeName(app.config.prefix, "form"));
  const isRefresh = el.hasAttribute(attributeName(app.config.prefix, "refresh"));

  if (!methodName && !isForm && !isRefresh) {
    return;
  }

  const triggerValue =
    el.getAttribute(attributeName(app.config.prefix, "trigger")) ?? defaultTriggerForElement(el, methodName);
  const triggers = parseTriggers(triggerValue);
  const runner = createRequestRunner(app, el, methodName);

  el.addEventListener("latch:refresh", () => {
    void runner();
  });

  const refreshOn = el.getAttribute(attributeName(app.config.prefix, "refresh-on"));

  if (refreshOn) {
    for (const eventName of refreshOn.split(/\s+/).filter(Boolean)) {
      window.addEventListener(eventName, () => {
        void runner();
      });
    }
  }

  for (const trigger of triggers) {
    if (trigger.type === "load") {
      queueMicrotask(() => {
        void runner();
      });
      continue;
    }

    if (trigger.type === "every") {
      window.setInterval(() => {
        void runner();
      }, trigger.delayMs ?? 1000);
      continue;
    }

    if (trigger.type === "event") {
      window.addEventListener(trigger.value, (event) => {
        void runner(event);
      });
      continue;
    }

    if (trigger.type === "intersect") {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void runner();
          observer.disconnect();
        }
      });

      observer.observe(el);
      continue;
    }

    const listener = trigger.delayMs
      ? debounce(() => {
          void runner();
        }, trigger.delayMs)
      : () => {
          void runner();
        };

    el.addEventListener(trigger.value, (event) => {
      if (trigger.value === "submit" || (trigger.value === "click" && el instanceof HTMLAnchorElement)) {
        event.preventDefault();
      }

      listener();
    });
  }
}

function initializeStateDirectives(
  app: ScannerApp,
  el: HTMLElement,
  scope?: ReturnType<typeof getScope>
): void {
  if (!scope) {
    return;
  }

  const clickExpression = el.getAttribute(attributeName(app.config.prefix, "click"));

  if (clickExpression) {
    el.addEventListener("click", (event) => {
      runInScope(scope, clickExpression, {
        $event: event,
        $el: el,
        $store: app.stores
      });
      scope.notify();
    });
  }

  bindStateDirective(app, el, scope, "show", "show");
  bindStateDirective(app, el, scope, "if", "if");
  bindStateDirective(app, el, scope, "text", "text");
  bindStateDirective(app, el, scope, "html", "html");

  const classExpression = el.getAttribute(attributeName(app.config.prefix, "class"));

  if (classExpression) {
    bindScope(scope, {
      el,
      kind: "class",
      expression: classExpression,
      appliedClasses: []
    });
  }

  for (const attribute of el.getAttributeNames()) {
    const bindPrefix = `${attributeName(app.config.prefix, "bind")}:`;

    if (attribute.startsWith(bindPrefix)) {
      bindScope(scope, {
        el,
        kind: "bind",
        expression: el.getAttribute(attribute) ?? "",
        arg: attribute.slice(bindPrefix.length)
      });
    }
  }

  const modelExpression = el.getAttribute(attributeName(app.config.prefix, "model"));

  if (modelExpression) {
    bindScope(scope, {
      el,
      kind: "model",
      expression: modelExpression
    });

    const update = () => {
      const value = extractElementValue(el);
      setModelValue(scope, modelExpression, value, {
        $el: el,
        $store: app.stores
      });
    };

    el.addEventListener("input", update);
    el.addEventListener("change", update);
  }
}

function bindStateDirective(
  app: ScannerApp,
  el: HTMLElement,
  scope: NonNullable<ReturnType<typeof getScope>>,
  name: "show" | "if" | "text" | "html",
  kind: "show" | "if" | "text" | "html"
): void {
  const expression = el.getAttribute(attributeName(app.config.prefix, name));

  if (!expression) {
    return;
  }

  bindScope(scope, {
    el,
    kind,
    expression
  });
}

function initializeOverlayDirectives(app: ScannerApp, el: HTMLElement): void {
  const modalSource = el.getAttribute(attributeName(app.config.prefix, "modal"));
  const drawerSource = el.getAttribute(attributeName(app.config.prefix, "drawer"));

  if (modalSource) {
    el.addEventListener("click", () => {
      void app.modal(modalSource, { kind: "modal" });
    });
  }

  if (drawerSource) {
    const side =
      (el.getAttribute(attributeName(app.config.prefix, "drawer-side")) as
        | "left"
        | "right"
        | "top"
        | "bottom"
        | null) ?? "right";

    el.addEventListener("click", () => {
      void app.modal(drawerSource, { kind: "drawer", side });
    });
  }
}

function initializeEventDirectives(
  app: ScannerApp,
  el: HTMLElement,
  scope?: ReturnType<typeof getScope>
): void {
  const onExpression = el.getAttribute(attributeName(app.config.prefix, "on"));

  if (onExpression) {
    const [eventName, action] = onExpression.split("->").map((value) => value.trim());

    if (eventName && action) {
      window.addEventListener(eventName, (event) => {
        if (action === "refresh") {
          void createRequestRunner(app, el)();
          return;
        }

        if (scope) {
          runInScope(scope, action, {
            $event: event,
            $el: el,
            $store: app.stores
          });
          scope.notify();
        }
      });
    }
  }

  const toastMessage = el.getAttribute(attributeName(app.config.prefix, "toast"));

  if (toastMessage) {
    el.addEventListener("click", () => {
      app.toast(toastMessage);
    });
  }

  const closeKind = el.getAttribute(attributeName(app.config.prefix, "close"));

  if (closeKind) {
    el.addEventListener("click", () => {
      app.closeOverlay(closeKind);
    });
  }
}

function initializeNativeComponents(app: ScannerApp, el: HTMLElement): void {
  if (el.hasAttribute(attributeName(app.config.prefix, "table"))) {
    initializeTable(app, el);
  }

  if (el.hasAttribute(attributeName(app.config.prefix, "dropdown"))) {
    initializeDropdown(app, el);
  }

  if (el.hasAttribute(attributeName(app.config.prefix, "tabs"))) {
    initializeTabs(app, el);
  }

  if (el.hasAttribute(attributeName(app.config.prefix, "accordion"))) {
    initializeAccordion(app, el);
  }
}

function initializeCustomDirectives(app: ScannerApp, el: HTMLElement): void {
  for (const [name, installer] of app.directiveInstallers.entries()) {
    const attribute = attributeName(app.config.prefix, name);
    const value = el.getAttribute(attribute);

    if (value != null) {
      installer({ el, value, app: app as never });
    }
  }
}

function createRequestRunner(
  app: ScannerApp,
  el: HTMLElement,
  explicitMethod?: typeof requestAttributes[number]
): (event?: Event) => Promise<void> {
  let version = 0;
  let activeGet: { controller: AbortController; version: number; restore: () => void } | undefined;
  return async () => {
    const confirmMessage = el.getAttribute(attributeName(app.config.prefix, "confirm"));
    const form = resolveAssociatedForm(el);

    if (confirmMessage) {
      const accepted = await app.confirm(confirmMessage, {
        title: el.getAttribute(attributeName(app.config.prefix, "confirm-title")) ?? undefined,
        confirmText: el.getAttribute(attributeName(app.config.prefix, "confirm-confirm-text")) ?? undefined,
        cancelText: el.getAttribute(attributeName(app.config.prefix, "confirm-cancel-text")) ?? undefined,
        tone: el.getAttribute(attributeName(app.config.prefix, "confirm-tone")) === "danger" ? "danger" : "neutral"
      });

      if (!accepted) {
        return;
      }
    }

    if (form && !validateForm(form)) {
      return;
    }

    const requestOptions = resolveRequestOptions(app, el, explicitMethod);
    if (!requestOptions.url) return;
    const useLatest = requestOptions.method === "GET";
    let currentVersion = 0;
    let controller: AbortController | undefined;
    let restore: () => void;

    if (useLatest) {
      const existingRestore = activeGet?.restore;
      activeGet?.controller.abort();
      controller = new AbortController();
      currentVersion = ++version;
      restore = existingRestore ?? setLoadingState(el, true, app.config.prefix);
      activeGet = { controller, version: currentVersion, restore };
    } else {
      restore = setLoadingState(el, true, app.config.prefix);
    }

    const stale = () => useLatest && currentVersion !== version;
    const errorTarget = resolveErrorTarget(app, el);
    clearServerErrors(app, el, form, errorTarget);

    try {
      const response = await app.request({
        ...requestOptions,
        element: el,
        signal: controller?.signal
      });
      if (stale()) return;

      if (!response.ok) {
        await handleServerError(app, el, form, errorTarget, response);
        if (stale()) return;

        const errorToast = el.getAttribute(attributeName(app.config.prefix, "toast-error"));

        if (errorToast) {
          app.toast(errorToast, { type: "error" });
        }

        app.emit("latch:requestError", {
          element: el,
          response
        });
        return;
      }

      await handleResponse(
        {
          emit: app.emit.bind(app),
          config: app.config,
          toast: app.toast.bind(app),
          refresh: app.refresh.bind(app),
          scan: (root) => app.scan(root),
          closeOverlay: (kind) => app.closeOverlay(kind)
        },
        el,
        response,
        requestOptions.target ?? el,
        requestOptions.swap ?? app.config.defaultSwap
      );

      if (stale()) return;

      const successToast = el.getAttribute(attributeName(app.config.prefix, "toast-success"));

      if (successToast) {
        app.toast(successToast, { type: "success" });
      }

      const emitName = el.getAttribute(attributeName(app.config.prefix, "emit"));

      if (emitName) {
        app.emit(emitName, { element: el, response });
      }

      if (el instanceof HTMLFormElement && el.hasAttribute(attributeName(app.config.prefix, "reset-on-success"))) {
        el.reset();
      }

      if (form) {
        resetDirtyCheck(form);
      }

      const closeOnSuccess = el.getAttribute(attributeName(app.config.prefix, "close-on-success"));

      if (closeOnSuccess) {
        app.closeOverlay(closeOnSuccess);
      }
    } catch (error) {
      if (stale() || (error instanceof Error && error.name === "AbortError")) return;
      const errorToast = el.getAttribute(attributeName(app.config.prefix, "toast-error"));

      if (errorToast) {
        app.toast(errorToast, { type: "error" });
      }

      app.emit("latch:requestError", {
        element: el,
        error
      });
    } finally {
      if (useLatest) {
        if (activeGet?.version === currentVersion) {
          activeGet.restore();
          activeGet = undefined;
        }
      } else {
        restore();
      }
    }
  };
}

function resolveRequestOptions(
  app: ScannerApp,
  el: HTMLElement,
  explicitMethod?: typeof requestAttributes[number]
): RequestOptions {
  const attrMethod = explicitMethod ?? requestAttributes.find((name) => el.hasAttribute(attributeName(app.config.prefix, name)));
  const method = (attrMethod?.toUpperCase() ?? resolveFormMethod(el)) as RequestOptions["method"];
  const payload = buildRequestPayload(app, el, method, resolveUrl(app, el, attrMethod));
  const swap =
    (el.getAttribute(attributeName(app.config.prefix, "swap")) as RequestOptions["swap"]) ?? app.config.defaultSwap;
  const target = resolveTarget(app, el);
  const headers = parseStringRecord(el.getAttribute(attributeName(app.config.prefix, "headers")));
  const timeout = Number(el.getAttribute(attributeName(app.config.prefix, "timeout")) ?? 0) || undefined;

  if (typeof payload.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return {
    method,
    url: payload.url,
    target,
    swap,
    headers,
    body: payload.body,
    timeout
  };
}

function resolveFormMethod(el: HTMLElement): string {
  if (el instanceof HTMLFormElement) {
    return (el.method || "POST").toUpperCase();
  }

  return "GET";
}

function resolveUrl(app: ScannerApp, el: HTMLElement, explicitMethod?: string): string {
  if (explicitMethod) {
    return el.getAttribute(attributeName(app.config.prefix, explicitMethod)) ?? "";
  }

  for (const name of requestAttributes) {
    const value = el.getAttribute(attributeName(app.config.prefix, name));

    if (value) {
      return value;
    }
  }

  if (el.hasAttribute(attributeName(app.config.prefix, "refresh"))) {
    return el.getAttribute(attributeName(app.config.prefix, "refresh")) ?? "";
  }

  if (el instanceof HTMLFormElement) {
    return el.action;
  }

  if (el instanceof HTMLAnchorElement) {
    return el.href;
  }

  return "";
}

function buildRequestPayload(
  app: ScannerApp,
  el: HTMLElement,
  method: string,
  baseUrl: string
): { url: string; body: BodyInit | null | undefined } {
  const params = parseJsonRecord(el.getAttribute(attributeName(app.config.prefix, "params")));
  const form = resolveAssociatedForm(el);
  const data = collectRequestData(el, form, params);

  if (method === "GET") {
    const url = new URL(baseUrl || window.location.href, window.location.href);
    data.forEach((value, key) => {
      url.searchParams.set(key, value instanceof File ? value.name : String(value));
    });
    return {
      url: url.toString(),
      body: undefined
    };
  }

  if (data instanceof FormData) {
    return {
      url: baseUrl,
      body: data
    };
  }

  return {
    url: baseUrl,
    body: hasEntries(data) ? JSON.stringify(searchParamsToRecord(data)) : null
  };
}

function resolveTarget(app: ScannerApp, el: HTMLElement): Element | null {
  const selector = el.getAttribute(attributeName(app.config.prefix, "target"));

  if (selector) {
    return document.querySelector(selector);
  }

  return el;
}

function resolveErrorTarget(app: ScannerApp, el: HTMLElement): HTMLElement | null {
  const selector = el.getAttribute(attributeName(app.config.prefix, "error-target"));
  return selector ? (document.querySelector(selector) as HTMLElement | null) : null;
}

function resolveAssociatedForm(el: HTMLElement): HTMLFormElement | null {
  if (el instanceof HTMLFormElement) {
    return el;
  }

  return el.closest("form");
}

function collectRequestData(
  el: HTMLElement,
  form: HTMLFormElement | null,
  params: Record<string, unknown>
): FormData | URLSearchParams {
  const hasFileInput = form ? Boolean(form.querySelector('input[type="file"]')) : false;

  if (form && hasFileInput) {
    const formData = new FormData(form);

    for (const [key, value] of Object.entries(params)) {
      formData.set(key, String(value));
    }

    return formData;
  }

  const searchParams = new URLSearchParams();

  if (form) {
    new FormData(form).forEach((value, key) => {
      searchParams.append(key, String(value));
    });
  } else if (isValueElement(el) && el.name) {
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      searchParams.append(el.name, String(el.checked));
    } else {
      searchParams.append(el.name, String(extractElementValue(el)));
    }
  }

  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }

  return searchParams;
}

function validateForm(form: HTMLFormElement): boolean {
  if (!form.hasAttribute("novalidate") && !form.checkValidity()) {
    form.reportValidity();
    return false;
  }

  return true;
}

async function handleServerError(
  app: ScannerApp,
  el: HTMLElement,
  form: HTMLFormElement | null,
  errorTarget: HTMLElement | null,
  response: Response
): Promise<void> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as {
      message?: string;
      errors?: Record<string, string | string[]>;
    };
    applyJsonErrors(app, el, form, errorTarget, payload);
    return;
  }

  if (!errorTarget) {
    return;
  }

  const body = await response.text();

  if (contentType.includes("text/html")) {
    errorTarget.innerHTML = body;
    app.scan(errorTarget);
    return;
  }

  errorTarget.textContent = body;
}

function applyJsonErrors(
  app: ScannerApp,
  el: HTMLElement,
  form: HTMLFormElement | null,
  errorTarget: HTMLElement | null,
  payload: {
    message?: string;
    errors?: Record<string, string | string[]>;
  }
): void {
  const errorClassValue = el.getAttribute(attributeName(app.config.prefix, "error-class")) ?? "lt-error";
  const errorClasses = errorClassValue.split(/\s+/).filter(Boolean);
  const errors = payload.errors ?? {};
  let firstField: HTMLElement | null = null;

  if (form) {
    for (const [fieldName, rawMessage] of Object.entries(errors)) {
      const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;
      const field = form.querySelector<HTMLElement>(`[name="${cssEscape(fieldName)}"]`);

      if (!field) {
        continue;
      }

      field.classList.add(...errorClasses);
      field.setAttribute("aria-invalid", "true");

      const inlineTarget = form.querySelector<HTMLElement>(`[data-latch-error-for="${fieldName}"]`);

      if (inlineTarget) {
        inlineTarget.textContent = message;
      }

      if (!firstField) {
        firstField = field;
      }
    }
  }

  if (errorTarget) {
    const items = Object.entries(errors).map(([fieldName, rawMessage]) => {
      const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;
      return `<li><strong>${escapeHtml(fieldName)}</strong>: ${escapeHtml(message)}</li>`;
    });

    errorTarget.innerHTML = items.length > 0
      ? `<ul>${items.join("")}</ul>`
      : `<p>${escapeHtml(payload.message ?? "Une erreur serveur est survenue.")}</p>`;
  }

  firstField?.focus();
}

function clearServerErrors(
  app: ScannerApp,
  el: HTMLElement,
  form: HTMLFormElement | null,
  errorTarget: HTMLElement | null
): void {
  if (errorTarget) {
    errorTarget.innerHTML = "";
  }

  if (!form) {
    return;
  }

  const errorClassValue = el.getAttribute(attributeName(app.config.prefix, "error-class")) ?? "lt-error";
  const errorClasses = errorClassValue.split(/\s+/).filter(Boolean);

  form.querySelectorAll<HTMLElement>("[data-latch-error-for]").forEach((node) => {
    node.textContent = "";
  });

  form.querySelectorAll<HTMLElement>("[aria-invalid='true']").forEach((field) => {
    field.removeAttribute("aria-invalid");
    field.classList.remove(...errorClasses);
  });
}

function initializeDirtyCheck(form: HTMLFormElement): void {
  dirtySnapshotByForm.set(form, serializeForm(form));
  form.dataset.latchDirty = "false";

  const refresh = () => {
    const previous = dirtySnapshotByForm.get(form) ?? "";
    form.dataset.latchDirty = String(serializeForm(form) !== previous);
  };

  form.addEventListener("input", refresh);
  form.addEventListener("change", refresh);

  if (!beforeUnloadBound) {
    window.addEventListener("beforeunload", (event) => {
      if (!document.querySelector("form[data-latch-dirty='true']")) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    });
    beforeUnloadBound = true;
  }
}

function resetDirtyCheck(form: HTMLFormElement): void {
  dirtySnapshotByForm.set(form, serializeForm(form));
  form.dataset.latchDirty = "false";
}

function serializeForm(form: HTMLFormElement): string {
  const entries: Array<[string, string]> = [];
  new FormData(form).forEach((value, key) => {
    entries.push([key, String(value)]);
  });
  entries.sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify(entries);
}

function parseJsonRecord(value: string | null): Record<string, unknown> {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseStringRecord(value: string | null): Record<string, string> {
  const parsed = parseJsonRecord(value);
  return Object.fromEntries(Object.entries(parsed).map(([key, entry]) => [key, String(entry)]));
}

function extractElementValue(el: HTMLElement): unknown {
  if (el instanceof HTMLInputElement) {
    return el.type === "checkbox" ? el.checked : el.value;
  }

  if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    return el.value;
  }

  return el.textContent ?? "";
}

function isValueElement(
  el: HTMLElement
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
}

function isSubmitControl(el: HTMLElement): boolean {
  return (
    (el instanceof HTMLButtonElement && ["submit", "button", "reset"].includes(el.type)) ||
    (el instanceof HTMLInputElement && ["submit", "button", "reset"].includes(el.type))
  );
}

function defaultTriggerForElement(el: HTMLElement, methodName?: string): string {
  if (el instanceof HTMLFormElement) {
    return "submit";
  }

  if (methodName === "get" && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    return "input";
  }

  return "click";
}

function parseTriggers(value: string): ParsedTrigger[] {
  if (!value) {
    return [{ type: "dom", value: "click" }];
  }

  const normalized = value.trim();

  if (normalized === "load") {
    return [{ type: "load", value: "load" }];
  }

  if (normalized === "revealed" || normalized === "intersect") {
    return [{ type: "intersect", value: "intersect" }];
  }

  if (normalized.startsWith("every:")) {
    return [{ type: "every", value: "every", delayMs: parseDuration(normalized.slice(6)) }];
  }

  const tokens = normalized.split(/\s+/);
  const eventName = tokens[0];
  const delayToken = tokens.find((token) => token.startsWith("delay:"));
  const delayMs = delayToken ? parseDuration(delayToken.slice(6)) : undefined;
  const knownDomEvents = new Set(["click", "submit", "change", "input"]);

  if (knownDomEvents.has(eventName)) {
    return [{ type: "dom", value: eventName, delayMs }];
  }

  return [{ type: "event", value: eventName }];
}

function parseDuration(value: string): number {
  if (value.endsWith("ms")) {
    return Number(value.slice(0, -2));
  }

  if (value.endsWith("s")) {
    return Number(value.slice(0, -1)) * 1000;
  }

  return Number(value);
}

function debounce<T extends (...args: never[]) => void>(callback: T, delayMs: number): T {
  let timeoutId: number | undefined;

  return ((...args: never[]) => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => callback(...args), delayMs);
  }) as T;
}

function setLoadingState(el: HTMLElement, active: boolean, prefix: string): () => void {
  const loadingText = el.getAttribute(attributeName(prefix, "loading"));
  const disabledWhile = el.getAttribute(attributeName(prefix, "disabled-while"));
  const indicatorSelector = el.getAttribute(attributeName(prefix, "indicator"));
  const indicator = indicatorSelector
    ? (document.querySelector(indicatorSelector) as HTMLElement | null)
    : null;
  const previousText = loadingText ? el.textContent : null;
  const wasDisabled = "disabled" in el ? (el as HTMLButtonElement).disabled : undefined;

  if (active) {
    if (loadingText) {
      el.textContent = loadingText;
    }

    if (disabledWhile === "request" && "disabled" in el) {
      (el as HTMLButtonElement).disabled = true;
    }

    if (indicator) {
      indicator.hidden = false;
    }
  }

  return () => {
    if (loadingText && previousText != null) {
      el.textContent = previousText;
    }

    if (disabledWhile === "request" && typeof wasDisabled === "boolean") {
      (el as HTMLButtonElement).disabled = wasDisabled;
    }

    if (indicator) {
      indicator.hidden = true;
    }
  };
}

function initializeDropdown(app: ScannerApp, root: HTMLElement): void {
  const trigger = root.querySelector<HTMLElement>(`[${attributeName(app.config.prefix, "dropdown-trigger")}]`);
  const menu = root.querySelector<HTMLElement>(`[${attributeName(app.config.prefix, "dropdown-menu")}]`);

  if (!trigger || !menu) {
    return;
  }

  menu.hidden = true;
  menu.setAttribute("role", "menu");
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  const menuId = menu.id || `latch-dropdown-${Math.random().toString(36).slice(2)}`;
  menu.id = menuId;
  trigger.setAttribute("aria-controls", menuId);

  const getItems = () => Array.from(
    menu.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
  );

  getItems().forEach((item) => {
    item.setAttribute("role", item.getAttribute("role") || "menuitem");
    item.tabIndex = -1;
  });

  const close = (restoreFocus = false) => {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");

    if (restoreFocus) {
      trigger.focus();
    }
  };

  const focusItem = (index: number) => {
    const items = getItems();

    if (items.length === 0) {
      return;
    }

    const nextIndex = (index + items.length) % items.length;
    items.forEach((item) => {
      item.tabIndex = -1;
    });
    items[nextIndex].tabIndex = 0;
    items[nextIndex].focus();
  };

  const open = (focusIndex = 0) => {
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    focusItem(focusIndex);
  };

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    if (menu.hidden) {
      open(0);
      return;
    }

    close(true);
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      open(0);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      open(getItems().length - 1);
    }
  });

  menu.addEventListener("keydown", (event) => {
    const items = getItems();
    const activeIndex = items.findIndex((item) => item === document.activeElement);

    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(activeIndex + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(activeIndex - 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusItem(items.length - 1);
    }
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target as Node)) {
      close();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close(true);
    }
  });
}

function initializeTabs(app: ScannerApp, root: HTMLElement): void {
  const tabs = Array.from(root.querySelectorAll<HTMLElement>(`[${attributeName(app.config.prefix, "tab")}]`));
  const panels = Array.from(root.querySelectorAll<HTMLElement>(`[${attributeName(app.config.prefix, "panel")}]`));

  if (tabs.length === 0 || panels.length === 0) {
    return;
  }

  root.setAttribute("role", "tablist");
  const initial = root.getAttribute(attributeName(app.config.prefix, "tabs"))
    || tabs[0].getAttribute(attributeName(app.config.prefix, "tab"))
    || "";

  tabs.forEach((tab, index) => {
    const name = tab.getAttribute(attributeName(app.config.prefix, "tab")) ?? `tab-${index}`;
    const panel = panels.find((entry) => entry.getAttribute(attributeName(app.config.prefix, "panel")) === name);
    const tabId = tab.id || `latch-tab-${name}-${Math.random().toString(36).slice(2)}`;
    const panelId = panel?.id || `latch-panel-${name}-${Math.random().toString(36).slice(2)}`;

    tab.id = tabId;
    tab.setAttribute("role", "tab");

    if (panel) {
      panel.id = panelId;
      tab.setAttribute("aria-controls", panelId);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tabId);
    }
  });

  const activate = (name: string) => {
    root.dataset.latchActiveTab = name;

    for (const tab of tabs) {
      const selected = tab.getAttribute(attributeName(app.config.prefix, "tab")) === name;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }

    for (const panel of panels) {
      const selected = panel.getAttribute(attributeName(app.config.prefix, "panel")) === name;
      panel.hidden = !selected;
    }
  };

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      const name = tab.getAttribute(attributeName(app.config.prefix, "tab"));

      if (name) {
        activate(name);
      }
    });

    tab.addEventListener("keydown", (event) => {
      const currentIndex = tabs.indexOf(tab);

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        const next = tabs[(currentIndex + 1) % tabs.length];
        const name = next.getAttribute(attributeName(app.config.prefix, "tab"));

        if (name) {
          activate(name);
          next.focus();
        }
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        const next = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
        const name = next.getAttribute(attributeName(app.config.prefix, "tab"));

        if (name) {
          activate(name);
          next.focus();
        }
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        const name = tabs[0].getAttribute(attributeName(app.config.prefix, "tab"));

        if (name) {
          activate(name);
          tabs[0].focus();
        }
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        const last = tabs[tabs.length - 1];
        const name = last.getAttribute(attributeName(app.config.prefix, "tab"));

        if (name) {
          activate(name);
          last.focus();
        }
      }
    });
  }

  activate(initial);
}

function initializeAccordion(app: ScannerApp, root: HTMLElement): void {
  const triggers = Array.from(root.querySelectorAll<HTMLElement>(`[${attributeName(app.config.prefix, "accordion-trigger")}]`));
  const panels = Array.from(root.querySelectorAll<HTMLElement>(`[${attributeName(app.config.prefix, "accordion-panel")}]`));

  if (triggers.length === 0 || panels.length === 0) {
    return;
  }

  const multiple = root.getAttribute(attributeName(app.config.prefix, "accordion")) === "multiple";

  triggers.forEach((trigger, index) => {
    const name = trigger.getAttribute(attributeName(app.config.prefix, "accordion-trigger")) ?? `section-${index}`;
    const panel = panels.find((entry) => entry.getAttribute(attributeName(app.config.prefix, "accordion-panel")) === name);
    const triggerId = trigger.id || `latch-accordion-trigger-${name}-${Math.random().toString(36).slice(2)}`;
    const panelId = panel?.id || `latch-accordion-panel-${name}-${Math.random().toString(36).slice(2)}`;

    trigger.id = triggerId;

    if (panel) {
      panel.id = panelId;
      trigger.setAttribute("aria-controls", panelId);
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", triggerId);
    }
  });

  const setOpen = (name: string) => {
    for (const panel of panels) {
      const matches = panel.getAttribute(attributeName(app.config.prefix, "accordion-panel")) === name;

      if (multiple && matches) {
        panel.hidden = !panel.hidden;
      } else if (!multiple) {
        panel.hidden = !matches;
      }
    }

    for (const trigger of triggers) {
      const triggerName = trigger.getAttribute(attributeName(app.config.prefix, "accordion-trigger"));
      const panel = panels.find(
        (entry) => entry.getAttribute(attributeName(app.config.prefix, "accordion-panel")) === triggerName
      );
      trigger.setAttribute("aria-expanded", String(panel ? !panel.hidden : false));
    }
  };

  panels.forEach((panel, index) => {
    panel.hidden = index !== 0;
  });
  triggers.forEach((trigger, index) => {
    trigger.setAttribute("aria-expanded", String(index === 0));
  });

  for (const trigger of triggers) {
    trigger.addEventListener("click", () => {
      const name = trigger.getAttribute(attributeName(app.config.prefix, "accordion-trigger"));

      if (name) {
        setOpen(name);
      }
    });

    trigger.addEventListener("keydown", (event) => {
      const currentIndex = triggers.indexOf(trigger);

      if (event.key === "ArrowDown") {
        event.preventDefault();
        triggers[(currentIndex + 1) % triggers.length].focus();
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        triggers[(currentIndex - 1 + triggers.length) % triggers.length].focus();
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        triggers[0].focus();
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        triggers[triggers.length - 1].focus();
      }
    });
  }
}

function initializeTable(app: ScannerApp, root: HTMLElement): void {
  if (tableStateByRoot.has(root)) {
    return;
  }

  const source = root.getAttribute(attributeName(app.config.prefix, "source"));
  const targetSelector = root.getAttribute(attributeName(app.config.prefix, "target"));

  if (!source || !targetSelector) {
    return;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const state: TableState = {
    root,
    source,
    targetSelector,
    searchTerm: searchParams.get("q") ?? "",
    filters: {},
    sort: searchParams.get("sort") ?? undefined,
    order: searchParams.get("order") === "desc" ? "desc" : "asc",
    page: Number(searchParams.get("page") ?? "1") || 1,
    syncUrl: root.hasAttribute(attributeName(app.config.prefix, "sync-url")),
    refreshOn: (root.getAttribute(attributeName(app.config.prefix, "refresh-on")) ?? "")
      .split(/\s+/)
      .filter(Boolean),
    requestVersion: 0
  };

  tableStateByRoot.set(root, state);

  for (const field of Array.from(root.querySelectorAll<HTMLElement>(`[${attributeName(app.config.prefix, "table-filter")}]`))) {
    const key = field.getAttribute(attributeName(app.config.prefix, "table-filter"));

    if (!key || !isValueElement(field)) {
      continue;
    }

    state.filters[key] = searchParams.get(key) ?? field.value ?? "";
    field.value = state.filters[key];
    field.addEventListener("change", () => {
      state.filters[key] = field.value;
      state.page = 1;
      void loadTable(app, state);
    });
  }

  const searchInputs = Array.from(root.querySelectorAll<HTMLElement>(`[${attributeName(app.config.prefix, "table-search")}]`));
  const triggerSearch = debounce(() => {
    state.page = 1;
    void loadTable(app, state);
  }, 250);

  for (const field of searchInputs) {
    if (!isValueElement(field)) {
      continue;
    }

    field.value = state.searchTerm;
    field.addEventListener("input", () => {
      state.searchTerm = field.value;
      triggerSearch();
    });
  }

  root.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const sortControl = target?.closest<HTMLElement>(`[${attributeName(app.config.prefix, "table-sort")}]`);

    if (sortControl) {
      const sortKey = sortControl.getAttribute(attributeName(app.config.prefix, "table-sort"));

      if (!sortKey) {
        return;
      }

      if (state.sort === sortKey) {
        state.order = state.order === "asc" ? "desc" : "asc";
      } else {
        state.sort = sortKey;
        state.order = "asc";
      }

      state.page = 1;
      void loadTable(app, state);
      return;
    }

    const pageControl = target?.closest<HTMLElement>(`[${attributeName(app.config.prefix, "table-page")}]`);

    if (!pageControl) {
      return;
    }

    const pageValue = pageControl.getAttribute(attributeName(app.config.prefix, "table-page"));

    if (!pageValue) {
      return;
    }

    if (pageValue === "next") {
      state.page += 1;
    } else if (pageValue === "prev") {
      state.page = Math.max(1, state.page - 1);
    } else {
      state.page = Math.max(1, Number(pageValue) || 1);
    }

    void loadTable(app, state);
  });

  for (const eventName of state.refreshOn) {
    window.addEventListener(eventName, () => {
      void loadTable(app, state);
    });
  }

  root.addEventListener("latch:refresh", () => {
    void loadTable(app, state);
  });

  void loadTable(app, state);
}

async function loadTable(app: ScannerApp, state: TableState): Promise<void> {
  const target = document.querySelector(state.targetSelector);

  if (!target) {
    return;
  }

  const url = new URL(state.source, window.location.href);

  if (state.searchTerm) {
    url.searchParams.set("q", state.searchTerm);
  } else {
    url.searchParams.delete("q");
  }

  for (const [key, value] of Object.entries(state.filters)) {
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  }

  if (state.sort) {
    url.searchParams.set("sort", state.sort);
    url.searchParams.set("order", state.order);
  } else {
    url.searchParams.delete("sort");
    url.searchParams.delete("order");
  }

  if (state.page > 1) {
    url.searchParams.set("page", String(state.page));
  } else {
    url.searchParams.delete("page");
  }

  if (state.syncUrl) {
    window.history.replaceState({}, "", `${window.location.pathname}?${url.searchParams.toString()}`);
  }

  // Cancel outdated table fetches and ignore late responses from mocks/caches.
  state.activeRequest?.abort();
  const controller = new AbortController();
  state.activeRequest = controller;
  const currentVersion = ++state.requestVersion;
  state.root.dataset.latchTableLoading = "true";

  try {
    const response = await app.request({
      element: state.root,
      method: "GET",
      url: url.toString(),
      target,
      swap: "innerHTML",
      signal: controller.signal
    });

    if (currentVersion !== state.requestVersion) return;
    if (!response.ok) {
      app.emit("latch:requestError", {
        element: state.root,
        response
      });
      return;
    }

    await handleResponse(
      {
        emit: app.emit.bind(app),
        config: app.config,
        toast: app.toast.bind(app),
        refresh: app.refresh.bind(app),
        scan: (root) => app.scan(root),
        closeOverlay: (kind) => app.closeOverlay(kind)
      },
      state.root,
      response,
      target,
      "innerHTML"
    );
  } catch (error) {
    if (currentVersion === state.requestVersion && !(error instanceof Error && error.name === "AbortError")) {
      app.emit("latch:requestError", { element: state.root, error });
    }
  } finally {
    if (currentVersion === state.requestVersion) {
      state.activeRequest = undefined;
      state.root.dataset.latchTableLoading = "false";
    }
  }
}

function cssEscape(value: string): string {
  const nativeEscape = (globalThis as typeof globalThis & { CSS?: { escape(value: string): string } }).CSS?.escape;
  return nativeEscape ? nativeEscape(value) : value.replace(/(["\\])/g, "\\$1");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hasEntries(params: URLSearchParams): boolean {
  return params.toString().length > 0;
}

function searchParamsToRecord(params: URLSearchParams): Record<string, string> {
  const record: Record<string, string> = {};
  params.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}
