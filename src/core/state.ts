import { assignExpression, evaluateExpression, executeExpression } from "./evaluator";

export interface ScopeBinding {
  el: HTMLElement;
  kind: "show" | "if" | "text" | "html" | "class" | "bind" | "model";
  expression: string;
  arg?: string;
  appliedClasses?: string[];
}

export interface Scope {
  root: HTMLElement;
  parent?: Scope;
  raw: Record<string, unknown>;
  proxy: Record<string, unknown>;
  bindings: Set<ScopeBinding>;
  children: Set<Scope>;
  notify(): void;
}

const scopeByRoot = new WeakMap<HTMLElement, Scope>();

function findOwner(scope: Scope, key: string): Scope {
  if (Object.prototype.hasOwnProperty.call(scope.raw, key)) {
    return scope;
  }

  if (scope.parent) {
    return findOwner(scope.parent, key);
  }

  return scope;
}

function createRuntimeProxy(scope: Scope, extras?: Record<string, unknown>): Record<string, unknown> {
  return new Proxy(
    {},
    {
      has() {
        return true;
      },
      get(_target, key: string | symbol) {
        if (typeof key !== "string") {
          return undefined;
        }

        if (extras && key in extras) {
          return extras[key];
        }

        if (key in scope.raw) {
          return scope.raw[key];
        }

        if (scope.parent) {
          return createRuntimeProxy(scope.parent, extras)[key];
        }

        return undefined;
      },
      set(_target, key: string | symbol, value) {
        if (typeof key !== "string") {
          return false;
        }

        const owner = findOwner(scope, key);
        owner.raw[key] = value;
        owner.notify();
        return true;
      },
      ownKeys() {
        return Reflect.ownKeys(scope.raw);
      },
      getOwnPropertyDescriptor() {
        return {
          configurable: true,
          enumerable: true
        };
      }
    }
  ) as Record<string, unknown>;
}

function applyBinding(scope: Scope, binding: ScopeBinding): void {
  if (!binding.el.isConnected) {
    scope.bindings.delete(binding);
    return;
  }

  const value = evaluateExpression<unknown>(binding.expression, scope.proxy);

  switch (binding.kind) {
    case "show":
    case "if": {
      binding.el.hidden = !Boolean(value);
      break;
    }
    case "text": {
      binding.el.textContent = value == null ? "" : String(value);
      break;
    }
    case "html": {
      binding.el.innerHTML = value == null ? "" : String(value);
      break;
    }
    case "class": {
      const nextClasses = normalizeClassValue(value);

      for (const name of binding.appliedClasses ?? []) {
        binding.el.classList.remove(name);
      }

      for (const name of nextClasses) {
        binding.el.classList.add(name);
      }

      binding.appliedClasses = nextClasses;
      break;
    }
    case "bind": {
      if (!binding.arg) {
        break;
      }

      applyAttributeValue(binding.el, binding.arg, value);
      break;
    }
    case "model": {
      syncModel(binding.el, value);
      break;
    }
  }
}

function normalizeClassValue(value: unknown): string[] {
  if (typeof value === "string") {
    return value.split(/\s+/).filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeClassValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, active]) => Boolean(active))
      .flatMap(([classes]) => classes.split(/\s+/).filter(Boolean));
  }

  return [];
}

function applyAttributeValue(el: HTMLElement, attr: string, value: unknown): void {
  if (attr in el) {
    (el as unknown as Record<string, unknown>)[attr] = value;
    return;
  }

  if (value === false || value == null) {
    el.removeAttribute(attr);
    return;
  }

  if (value === true) {
    el.setAttribute(attr, "");
    return;
  }

  el.setAttribute(attr, String(value));
}

function syncModel(el: HTMLElement, value: unknown): void {
  if (el instanceof HTMLInputElement) {
    if (el.type === "checkbox") {
      el.checked = Boolean(value);
      return;
    }

    el.value = value == null ? "" : String(value);
    return;
  }

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    el.value = value == null ? "" : String(value);
  }
}

export function getScope(el: HTMLElement | null): Scope | undefined {
  if (!el) {
    return undefined;
  }

  const root = el.closest("[data-latch-scope]") as HTMLElement | null;
  return root ? scopeByRoot.get(root) : undefined;
}

export function createScope(
  root: HTMLElement,
  expression: string,
  parent?: Scope,
  extras?: Record<string, unknown>
): Scope {
  const initialState = evaluateExpression<Record<string, unknown>>(expression, parent?.proxy ?? {}) ?? {};

  const scope: Scope = {
    root,
    parent,
    raw: { ...initialState },
    proxy: {} as Record<string, unknown>,
    bindings: new Set<ScopeBinding>(),
    children: new Set<Scope>(),
    notify() {
      renderScope(scope);
    }
  };

  scope.proxy = createRuntimeProxy(scope, extras);
  root.dataset.latchScope = "true";
  scopeByRoot.set(root, scope);
  parent?.children.add(scope);
  renderScope(scope);
  return scope;
}

export function bindScope(scope: Scope, binding: ScopeBinding): void {
  scope.bindings.add(binding);
  applyBinding(scope, binding);
}

export function runInScope(
  scope: Scope,
  expression: string,
  extras?: Record<string, unknown>
): unknown {
  return executeExpression(expression, createRuntimeProxy(scope, extras));
}

export function setModelValue(
  scope: Scope,
  expression: string,
  value: unknown,
  extras?: Record<string, unknown>
): void {
  assignExpression(expression, createRuntimeProxy(scope, extras), value);
  scope.notify();
}

export function renderScope(scope: Scope): void {
  for (const binding of scope.bindings) {
    applyBinding(scope, binding);
  }

  for (const child of scope.children) {
    renderScope(child);
  }
}