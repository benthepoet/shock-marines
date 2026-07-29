/**
 * Interior gameplay state — Phase 1: movement + aim simulation.
 */

import type { GameManager } from '../GameManager';
import { InteriorScene } from '../../interior/InteriorScene';

export class InteriorState {
  private scene: InteriorScene | null = null;

  constructor(private readonly game: GameManager) {}

  enter(): void {
    this.scene = new InteriorScene(this.game);
    this.scene.mount();
  }

  fixedUpdate(dt: number): void {
    this.scene?.fixedUpdate(dt);
  }

  render(): void {
    this.scene?.render();
  }

  exit(): void {
    this.scene?.dispose();
    this.scene = null;
    this.game.phase1Debug = null;
  }

  get interiorScene(): InteriorScene | null {
    return this.scene;
  }
}
