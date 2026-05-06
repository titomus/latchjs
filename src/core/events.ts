import type { LatchEventCallback } from "../types";

export class EventBus {
  private listeners = new Map<string, Set<LatchEventCallback>>();

  on(eventName: string, callback: LatchEventCallback): () => void {
    const group = this.listeners.get(eventName) ?? new Set<LatchEventCallback>();
    group.add(callback);
    this.listeners.set(eventName, group);

    return () => this.off(eventName, callback);
  }

  off(eventName: string, callback: LatchEventCallback): void {
    const group = this.listeners.get(eventName);

    if (!group) {
      return;
    }

    group.delete(callback);

    if (group.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  emit(eventName: string, detail?: unknown): CustomEvent<unknown> {
    const event = new CustomEvent(eventName, {
      detail
    });

    const group = this.listeners.get(eventName);

    if (group) {
      for (const callback of group) {
        callback(event);
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(event);
    }

    return event;
  }
}