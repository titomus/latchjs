export function evaluateExpression<T>(expression: string, scope: object): T {
  return new Function("$scope", `with ($scope) { return (${expression}); }`)(scope) as T;
}

export function executeExpression(expression: string, scope: object): unknown {
  return new Function("$scope", `with ($scope) { ${expression}; return undefined; }`)(scope);
}

export function assignExpression(expression: string, scope: object, value: unknown): void {
  new Function(
    "$scope",
    "$value",
    `with ($scope) { ${expression} = $value; }`
  )(scope, value);
}