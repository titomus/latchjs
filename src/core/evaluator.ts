// Cache compiled developer-authored expressions to avoid repeated parsing for
// every reactive binding update. This is NOT a sandbox; untrusted templates
// must not be evaluated. Strict CSP still requires a separate evaluator.
type Compiled = (scope: object, value?: unknown) => unknown;
const expressionCache = new Map<string, Compiled>();
const CACHE_LIMIT = 512;

function compile(mode: "read" | "execute" | "assign", expression: string): Compiled {
  const key = mode + ":" + expression;
  const cached = expressionCache.get(key);
  if (cached) return cached;
  const source = mode === "read"
    ? `with ($scope) { return (${expression}); }`
    : mode === "execute"
      ? `with ($scope) { ${expression}; return undefined; }`
      : `with ($scope) { ${expression} = $value; }`;
  const compiled = new Function("$scope", "$value", source) as Compiled;
  if (expressionCache.size >= CACHE_LIMIT) {
    const oldest = expressionCache.keys().next().value;
    if (oldest !== undefined) expressionCache.delete(oldest);
  }
  expressionCache.set(key, compiled);
  return compiled;
}

export function evaluateExpression<T>(expression: string, scope: object): T {
  return compile("read", expression)(scope) as T;
}

export function executeExpression(expression: string, scope: object): unknown {
  return compile("execute", expression)(scope);
}

export function assignExpression(expression: string, scope: object, value: unknown): void {
  compile("assign", expression)(scope, value);
}
