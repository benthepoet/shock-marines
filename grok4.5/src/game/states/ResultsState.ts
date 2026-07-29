/**
 * Results / win-lose state (stub).
 * Phase 0: placeholder only — no UI beyond console log.
 */

import type { GameManager } from '../GameManager';

export class ResultsState {
  constructor(private readonly game: GameManager) {}

  enter(): void {
    // Phase 0: no results UI. Clear the canvas background to distinguish state.
    const renderer = this.game.renderer;
    renderer.setClearColor(0x1a1020, 1);
    renderer.clear();
    console.log('[ResultsState] entered (stub — no results UI yet)');
  }

  fixedUpdate(_dt: number): void {
    // Intentionally empty in Phase 0
  }

  render(): void {
    this.game.renderer.clear();
  }

  exit(): void {
    // no-op
  }
}
