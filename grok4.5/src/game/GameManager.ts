/**
 * Top-level game manager: renderer, state machine, seed, time scale.
 * Phase 0: Loading → Interior → Results skeleton only.
 */

import * as THREE from 'three';
import {
  DEFAULT_SEED,
  DEFAULT_TIME_SCALE,
  FIXED_TIMESTEP,
  MAX_FIXED_STEPS_PER_FRAME,
} from '../shared/constants';
import type { GameStateId, Phase1DebugSnapshot } from '../shared/types';
import { SeededRandom } from './SeededRandom';
import { InteriorState } from './states/InteriorState';
import { ResultsState } from './states/ResultsState';

interface GameState {
  enter(): void;
  fixedUpdate(dt: number): void;
  render(): void;
  exit(): void;
}

export class GameManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly rng: SeededRandom;

  /** Live Phase 1 debug readout (updated by InteriorScene). */
  phase1Debug: Phase1DebugSnapshot | null = null;

  private stateId: GameStateId = 'Loading';
  private current: GameState | null = null;

  private _seed: number = DEFAULT_SEED;
  private _timeScale: number = DEFAULT_TIME_SCALE;
  private _showGrid: boolean = false;

  /** Access InteriorState when active (debug GUI camera toggles). */
  get interiorState(): InteriorState | null {
    return this.current instanceof InteriorState ? this.current : null;
  }

  private accumulator = 0;
  private lastFrameTime = 0;
  private running = false;
  private rafId = 0;

  /** Called when seed changes (debug GUI / external). */
  onSeedChanged: ((seed: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0a0f, 1);

    this.rng = new SeededRandom(this._seed);

    window.addEventListener('resize', this.handleResize);
  }

  get seed(): number {
    return this._seed;
  }

  set seed(value: number) {
    const next = value >>> 0;
    if (next === this._seed) return;
    this._seed = next;
    this.rng.setSeed(next);
    console.log(`[GameManager] seed set to ${next}`);
    this.onSeedChanged?.(next);
  }

  get timeScale(): number {
    return this._timeScale;
  }

  set timeScale(value: number) {
    this._timeScale = Math.max(0, value);
  }

  get showGrid(): boolean {
    return this._showGrid;
  }

  set showGrid(value: boolean) {
    this._showGrid = value;
    console.log(`[GameManager] showGrid = ${value}`);
  }

  get currentStateId(): GameStateId {
    return this.stateId;
  }

  /** Begin the main loop and enter Loading → Interior. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.transitionTo('Loading');
    // Phase 0: immediately leave Loading into Interior once foundation is ready.
    this.transitionTo('Interior');
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  dispose(): void {
    this.stop();
    this.current?.exit();
    this.current = null;
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }

  transitionTo(next: GameStateId): void {
    if (this.current) {
      this.current.exit();
      this.current = null;
    }

    this.stateId = next;
    console.log(`[GameManager] state → ${next}`);

    switch (next) {
      case 'Loading':
        // Phase 0: no asset load — brief clear only.
        this.current = {
          enter: () => {
            this.renderer.setClearColor(0x0a0a0f, 1);
            this.renderer.clear();
          },
          fixedUpdate: () => {},
          render: () => {
            this.renderer.clear();
          },
          exit: () => {},
        };
        break;
      case 'Interior':
        this.current = new InteriorState(this);
        break;
      case 'Results':
        this.current = new ResultsState(this);
        break;
    }

    this.current?.enter();
  }

  /**
   * Fixed timestep (see FIXED_TIMESTEP in constants).
   * Render runs once per animation frame; simulation steps at fixed dt.
   */
  private readonly frame = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.frame);

    const rawDt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    const scaledDt = rawDt * this._timeScale;
    this.accumulator += scaledDt;

    let steps = 0;
    while (
      this.accumulator >= FIXED_TIMESTEP &&
      steps < MAX_FIXED_STEPS_PER_FRAME
    ) {
      this.current?.fixedUpdate(FIXED_TIMESTEP);
      this.accumulator -= FIXED_TIMESTEP;
      steps++;
    }

    // If we hit the cap, drop leftover time to avoid spiral of death.
    if (steps >= MAX_FIXED_STEPS_PER_FRAME) {
      this.accumulator = 0;
    }

    this.current?.render();
  };

  private readonly handleResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    // InteriorScene listens / will re-read size on next render via getSize.
    // Phase 0: InteriorScene also hooks resize on its camera.
  };
}
