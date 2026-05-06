import { createLatch } from "./core";

export const Latch = createLatch();

if (typeof window !== "undefined") {
  (window as typeof window & { Latch: typeof Latch; latch: typeof Latch }).Latch = Latch;
  (window as typeof window & { Latch: typeof Latch; latch: typeof Latch }).latch = Latch;
}

export default Latch;