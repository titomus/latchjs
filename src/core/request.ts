import type { HttpMethod, RequestOptions } from "../types";
import { applySwap } from "./swap";

export interface RequestRuntime {
  emit(eventName: string, detail?: unknown): CustomEvent<unknown>;
  config: {
    credentials: RequestCredentials;
    defaultSwap: RequestOptions["swap"];
    csrf: {
      header: string;
      token?: string;
    };
    requestHeaders: Record<string, string>;
  };
  toast(message: string, options?: { type?: string }): HTMLElement;
  refresh(target: string | Element): Promise<void>;
  scan(root: ParentNode): void;
  closeOverlay(kind: string): void;
}

export interface ResolvedRequest {
  method: HttpMethod;
  url: string;
  target?: Element | null;
  swap: NonNullable<RequestOptions["swap"]>;
  body?: BodyInit | null;
  headers: Headers;
}

export function buildRequest(
  runtime: RequestRuntime,
  options: RequestOptions
): ResolvedRequest {
  const headers = new Headers(runtime.config.requestHeaders);

  if (runtime.config.csrf.token) {
    headers.set(runtime.config.csrf.header, runtime.config.csrf.token);
  }

  if (options.headers) {
    new Headers(options.headers).forEach((value, key) => headers.set(key, value));
  }

  return {
    method: options.method,
    url: options.url,
    target: options.target,
    swap: options.swap ?? runtime.config.defaultSwap ?? "innerHTML",
    body: options.body,
    headers
  };
}

export async function runRequest(
  runtime: RequestRuntime,
  options: RequestOptions
): Promise<Response> {
  const request = buildRequest(runtime, options);
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  runtime.emit("latch:beforeRequest", {
    element: options.element,
    request
  });

  const timeoutId =
    options.timeout && options.timeout > 0
      ? window.setTimeout(() => controller.abort(), options.timeout)
      : undefined;

  try {
    const response = await fetch(request.url, {
      method: request.method,
      body: request.body,
      headers: request.headers,
      credentials: runtime.config.credentials,
      signal: controller.signal
    });

    runtime.emit("latch:afterRequest", {
      element: options.element,
      request,
      response
    });

    return response;
  } finally {
    options.signal?.removeEventListener("abort", abortFromCaller);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export async function handleResponse(
  runtime: RequestRuntime,
  element: HTMLElement,
  response: Response,
  target: Element | null | undefined,
  swap: NonNullable<RequestOptions["swap"]>
): Promise<void> {
  runtime.emit("latch:beforeSwap", {
    element,
    target,
    swap,
    response
  });

  await handleHeaders(runtime, response);

  const contentType = response.headers.get("content-type") ?? "";

  if (response.ok && target && swap !== "none" && contentType.includes("text/html")) {
    const html = await response.text();
    const inserted = applySwap(target, html, swap);

    if (inserted.length > 0) {
      for (const node of inserted) {
        runtime.scan(node);
      }
    } else if (target.isConnected) {
      runtime.scan(target);
    }
  }

  runtime.emit("latch:afterSwap", {
    element,
    target,
    swap,
    response
  });
  runtime.emit("latch:afterSettle", {
    element,
    target,
    swap,
    response
  });
}

export async function handleHeaders(runtime: RequestRuntime, response: Response): Promise<void> {
  const toast = response.headers.get("X-Latch-Toast");
  const toastType = response.headers.get("X-Latch-Toast-Type") ?? "info";
  const eventName = response.headers.get("X-Latch-Event");
  const redirect = response.headers.get("X-Latch-Redirect");
  const close = response.headers.get("X-Latch-Close");
  const refresh = response.headers.get("X-Latch-Refresh");
  const replaceUrl = response.headers.get("X-Latch-Replace-Url");
  const pushUrl = response.headers.get("X-Latch-Push-Url");
  const title = response.headers.get("X-Latch-Title");

  if (toast) {
    runtime.toast(toast, { type: toastType });
  }

  if (eventName) {
    runtime.emit(eventName, { response });
  }

  if (redirect) {
    window.location.assign(redirect);
  }

  if (close) {
    runtime.closeOverlay(close);
  }

  if (refresh) {
    const selectors = refresh
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    for (const selector of selectors) {
      await runtime.refresh(selector);
    }
  }

  if (replaceUrl) {
    window.history.replaceState({}, "", replaceUrl);
  }

  if (pushUrl) {
    window.history.pushState({}, "", pushUrl);
  }

  if (title) {
    document.title = title;
  }
}