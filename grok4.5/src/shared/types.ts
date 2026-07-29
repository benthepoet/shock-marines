/**
 * Shared type definitions.
 */

/** High-level game lifecycle states. */
export type GameStateId = 'Loading' | 'Interior' | 'Results';

/**
 * Input command pattern.
 * Continuous sticks are carried as a FrameInput snapshot each step;
 * discrete actions can still be pushed as commands later.
 */
export type InputCommandType =
  | 'Move'
  | 'Aim'
  | 'Fire'
  | 'Interact'
  | 'ToggleMagBoots'
  | 'Sprint';

export interface InputCommand {
  type: InputCommandType;
  /** Player index (0 for single-player). */
  playerId: number;
  /** Optional payload (e.g. stick axes). */
  payload?: Record<string, number | boolean>;
}

/**
 * Per-frame stick / pointer state after deadzone + curve.
 * Axes are in world XZ: +x right, +z down on screen when camera is top-down
 * with up vector (0,0,-1) — i.e. stick up → −z in world if we map stick Y inverted.
 */
export interface FrameInput {
  /** Left stick / WASD, already deadzoned & curved, length ≤ 1. */
  moveX: number;
  moveZ: number;
  /** Right stick (or mouse-derived), unit aim direction when active. */
  aimX: number;
  aimZ: number;
  /** True when aim stick (or mouse) is actively providing a facing. */
  aimActive: boolean;
  /** True while fire is held (RT / R2, mouse left, or Space). */
  fire: boolean;
  /** True while interact is held (E / gamepad A). */
  interact: boolean;
  /** True on the frame interact became pressed (edge). */
  interactPressed: boolean;
  /** True on the frame mag-boots toggle was pressed. */
  magBootsPressed: boolean;
  /** Raw stick values before deadzone (debug visualization). */
  rawMoveX: number;
  rawMoveY: number;
  rawAimX: number;
  rawAimY: number;
  /** Which device last contributed (debug). */
  source: 'gamepad' | 'keyboard' | 'none';
}

export type TeamId = 'player' | 'enemy';

export interface GameConfig {
  seed: number;
  timeScale: number;
  showGrid: boolean;
}

/** Live debug readout updated each frame (Phase 1–2). */
export interface Phase1DebugSnapshot {
  velX: number;
  velZ: number;
  speed: number;
  posX: number;
  posZ: number;
  moveX: number;
  moveZ: number;
  aimX: number;
  aimZ: number;
  rawMoveX: number;
  rawMoveY: number;
  rawAimX: number;
  rawAimY: number;
  inputSource: string;
  facingDeg: number;
  /** Phase 2 */
  fire: boolean;
  playerHealth: number;
  playerAlive: boolean;
  enemyCount: number;
  projectileCount: number;
  /** Phase 3 */
  roomCount: number;
  pathOk: boolean;
  breachableCount: number;
  layoutSeed: number;
  /** Phase 4 */
  charges: number;
  activeCharges: number;
  fuseRemaining: number;
  canPlant: boolean;
  /** Phase 5 */
  oxygen: number;
  oxygenMax: number;
  inVacuum: boolean;
  magBoots: boolean;
  hullBreaches: number;
  plantIsOuterHull: boolean;
}
