/**
 * Deterministic seeded PRNG (mulberry32).
 * Same seed → same sequence. Required for shared-seed co-op layouts later.
 */

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Force uint32
    this.state = seed >>> 0;
  }

  /** Current seed/state (for debug display). */
  get seed(): number {
    return this.state >>> 0;
  }

  /** Reset to a new seed. */
  setSeed(seed: number): void {
    this.state = seed >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}
