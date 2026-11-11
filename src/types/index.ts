export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type LatchEventCallback = (event: CustomEvent<unknown>) => void;

export interface LatchConfig {
  prefix: string;
  credentials: RequestCredentials;
  defaultSwap: SwapMode;
  csrf: {
    header: string;
    token?: string;
  };
  requestHeaders: Record<string, string>;
  toastDuration: number;
}

export type SwapMode =
  | "innerHTML"
  | "outerHTML"
  | "beforebegin"
  | "afterbegin"
  | "beforeend"
  | "afterend"
  | "remove"
  | "none";

export interface RequestOptions {
  element?: HTMLElement;
  method: HttpMethod;
  url: string;
  target?: Element | null;
  swap?: SwapMode;
  body?: BodyInit | null;
  headers?: HeadersInit;
  timeout?: number;
  /** Optional caller cancellation (including latest-wins GET requests). */
  signal?: AbortSignal;
}

export interface ToastOptions {
  type?: "success" | "error" | "warning" | "info" | "neutral";
  duration?: number;
}

export interface ModalOptions {
  kind?: "modal" | "drawer";
  side?: "left" | "right" | "top" | "bottom";
}

export interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "neutral" | "danger";
}

export interface LatchPlugin {
  name?: string;
  install: (app: LatchApp) => void;
}

export interface DirectiveContext {
  el: HTMLElement;
  value: string;
  app: LatchApp;
}

export type DirectiveInstaller = (context: DirectiveContext) => void;

export interface LatchApp {
  start(root?: ParentNode): void;
  stop(): void;
  scan(root: ParentNode): void;
  configure(options: Partial<LatchConfig>): void;
  on(eventName: string, callback: LatchEventCallback): () => void;
  off(eventName: string, callback: LatchEventCallback): void;
  emit(eventName: string, detail?: unknown): CustomEvent<unknown>;
  plugin(plugin: LatchPlugin | ((app: LatchApp) => void)): void;
  store(name: string, value?: unknown): unknown;
  refresh(target: string | Element): Promise<void>;
  request(options: RequestOptions): Promise<Response>;
  toast(message: string, options?: ToastOptions): HTMLElement;
  confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
  modal(source: string, options?: ModalOptions): Promise<void>;
  drawer(source: string, options?: ModalOptions): Promise<void>;
  directive(name: string, installer: DirectiveInstaller): void;
}