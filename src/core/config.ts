import type { LatchConfig } from "../types";

export const defaultConfig: LatchConfig = {
  prefix: "lt",
  credentials: "same-origin",
  defaultSwap: "innerHTML",
  csrf: {
    header: "X-CSRF-Token",
    token: undefined
  },
  requestHeaders: {
    "X-Requested-With": "Latch"
  },
  toastDuration: 3200
};

export function mergeConfig(
  current: LatchConfig,
  incoming: Partial<LatchConfig>
): LatchConfig {
  return {
    ...current,
    ...incoming,
    csrf: {
      ...current.csrf,
      ...incoming.csrf
    },
    requestHeaders: {
      ...current.requestHeaders,
      ...incoming.requestHeaders
    }
  };
}

export function attributeName(prefix: string, suffix: string): string {
  return `${prefix}-${suffix}`;
}