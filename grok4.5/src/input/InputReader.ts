/**
 * Device → FrameInput.
 * Gamepad is primary; keyboard + mouse are fallback only.
 * Phase 2: RT / mouse left / Space → fire.
 */

import {
  AIM_STICK_DEADZONE,
  STICK_DEADZONE,
  STICK_RESPONSE_EXPONENT,
} from '../shared/constants';
import { setFrameInput, EMPTY_FRAME_INPUT } from '../shared/InputCommands';
import type { FrameInput } from '../shared/types';

function applyRadialDeadzoneAndCurve(
  x: number,
  y: number,
  deadzone: number,
  exponent: number,
): { x: number; y: number } {
  const mag = Math.hypot(x, y);
  if (mag < deadzone || mag < 1e-6) {
    return { x: 0, y: 0 };
  }
  const remapped = Math.min(1, (mag - deadzone) / (1 - deadzone));
  const curved = Math.pow(remapped, exponent);
  const scale = curved / mag;
  return { x: x * scale, y: y * scale };
}

function aimUnitFromStick(
  x: number,
  y: number,
  deadzone: number,
): { x: number; y: number; active: boolean } {
  const mag = Math.hypot(x, y);
  if (mag < deadzone || mag < 1e-6) {
    return { x: 0, y: 0, active: false };
  }
  return { x: x / mag, y: y / mag, active: true };
}

/** Standard mapping: buttons[7] = RT. Also check axis triggers when present. */
function readGamepadFire(gp: Gamepad): boolean {
  const rt = gp.buttons[7];
  if (rt && (rt.pressed || rt.value > 0.35)) return true;
  // Some browsers expose RT as axis 7 (-1..1 or 0..1)
  if (gp.axes.length > 7) {
    const a = gp.axes[7];
    if (a > 0.35) return true;
  }
  return false;
}

function readGamepadInteract(gp: Gamepad): boolean {
  // Standard: button 0 = A / Cross
  const a = gp.buttons[0];
  if (a && (a.pressed || a.value > 0.5)) return true;
  // Some pads: button 2 = X / Square also usable as interact
  const x = gp.buttons[2];
  if (x && (x.pressed || x.value > 0.5)) return true;
  return false;
}

export class InputReader {
  private keys = new Set<string>();
  private mouseX = 0;
  private mouseY = 0;
  private mouseInWindow = false;
  private mouseLeftDown = false;
  private bound = false;
  private prevInteract = false;
  private prevMagBoots = false;

  mouseWorldAim: { x: number; z: number } | null = null;
  playerPos: { x: number; z: number } = { x: 0, z: 0 };

  bind(): void {
    if (this.bound) return;
    this.bound = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseenter', this.onMouseEnter);
    window.addEventListener('mouseleave', this.onMouseLeave);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  unbind(): void {
    if (!this.bound) return;
    this.bound = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseenter', this.onMouseEnter);
    window.removeEventListener('mouseleave', this.onMouseLeave);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.keys.clear();
    this.mouseLeftDown = false;
    this.prevInteract = false;
    this.prevMagBoots = false;
  }

  poll(): FrameInput {
    const pads = navigator.getGamepads?.() ?? [];
    let gp: Gamepad | null = null;
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (p && p.connected) {
        gp = p;
        break;
      }
    }

    const padFire = gp ? readGamepadFire(gp) : false;
    const kbFire =
      this.mouseLeftDown ||
      this.keys.has('Space') ||
      this.keys.has('KeyF');

    const padInteract = gp ? readGamepadInteract(gp) : false;
    const kbInteract = this.keys.has('KeyE') || this.keys.has('KeyQ');
    const interact = padInteract || kbInteract;
    const interactPressed = interact && !this.prevInteract;
    this.prevInteract = interact;

    // Mag-boots: keyboard B / Shift, gamepad LB (button 4) or left stick click (10)
    const padMag =
      !!gp &&
      ((gp.buttons[4]?.pressed ?? false) ||
        (gp.buttons[10]?.pressed ?? false));
    const kbMag = this.keys.has('KeyB') || this.keys.has('ShiftLeft');
    const magHeld = padMag || kbMag;
    const magBootsPressed = magHeld && !this.prevMagBoots;
    this.prevMagBoots = magHeld;

    // Sticks from gamepad when active; otherwise keyboard/mouse.
    const padSticks = gp ? this.readGamepadSticks(gp) : null;
    const kb = this.readKeyboardMouseAxes();

    let moveX = 0;
    let moveZ = 0;
    let aimX = 0;
    let aimZ = 0;
    let aimActive = false;
    let rawMoveX = 0;
    let rawMoveY = 0;
    let rawAimX = 0;
    let rawAimY = 0;
    let source: FrameInput['source'] = 'none';

    if (padSticks && padSticks.stickActive) {
      moveX = padSticks.moveX;
      moveZ = padSticks.moveZ;
      aimX = padSticks.aimX;
      aimZ = padSticks.aimZ;
      aimActive = padSticks.aimActive;
      rawMoveX = padSticks.rawMoveX;
      rawMoveY = padSticks.rawMoveY;
      rawAimX = padSticks.rawAimX;
      rawAimY = padSticks.rawAimY;
      source = 'gamepad';
    } else {
      moveX = kb.moveX;
      moveZ = kb.moveZ;
      aimX = kb.aimX;
      aimZ = kb.aimZ;
      aimActive = kb.aimActive;
      rawMoveX = kb.rawMoveX;
      rawMoveY = kb.rawMoveY;
      rawAimX = kb.rawAimX;
      rawAimY = kb.rawAimY;
      if (kb.moveLen > 0 || kb.aimActive || kbFire || kbInteract) {
        source = 'keyboard';
      }
    }

    // Fire is always OR'd so RT works even when sticks are idle / KB is moving.
    const fire = padFire || kbFire;
    if (padFire && source === 'none') source = 'gamepad';
    if (padInteract && source === 'none') source = 'gamepad';

    const frame: FrameInput = {
      moveX,
      moveZ,
      aimX,
      aimZ,
      aimActive,
      fire,
      interact,
      interactPressed,
      magBootsPressed,
      rawMoveX,
      rawMoveY,
      rawAimX,
      rawAimY,
      source,
    };
    setFrameInput(frame);
    return frame;
  }

  private readGamepadSticks(gp: Gamepad): {
    stickActive: boolean;
    moveX: number;
    moveZ: number;
    aimX: number;
    aimZ: number;
    aimActive: boolean;
    rawMoveX: number;
    rawMoveY: number;
    rawAimX: number;
    rawAimY: number;
  } {
    let rawMoveX = gp.axes[0] ?? 0;
    let rawMoveY = gp.axes[1] ?? 0;
    let rawAimX = gp.axes[2] ?? 0;
    let rawAimY = gp.axes[3] ?? 0;

    if (gp.mapping !== 'standard' && gp.axes.length >= 6) {
      const a3 = gp.axes[3] ?? 0;
      const a5 = gp.axes[5] ?? 0;
      if (Math.abs(a5) > Math.abs(a3) + 0.1) {
        rawAimX = gp.axes[2] ?? 0;
        rawAimY = a5;
      }
    }

    const moveActivity = Math.hypot(rawMoveX, rawMoveY) > 0.05;
    const aimActivity = Math.hypot(rawAimX, rawAimY) > 0.05;
    const stickActive = moveActivity || aimActivity;

    const move = applyRadialDeadzoneAndCurve(
      rawMoveX,
      rawMoveY,
      STICK_DEADZONE,
      STICK_RESPONSE_EXPONENT,
    );
    const aim = aimUnitFromStick(rawAimX, rawAimY, AIM_STICK_DEADZONE);

    return {
      stickActive,
      moveX: move.x,
      moveZ: move.y,
      aimX: aim.x,
      aimZ: aim.y,
      aimActive: aim.active,
      rawMoveX,
      rawMoveY,
      rawAimX,
      rawAimY,
    };
  }

  private readKeyboardMouseAxes(): {
    moveX: number;
    moveZ: number;
    aimX: number;
    aimZ: number;
    aimActive: boolean;
    rawMoveX: number;
    rawMoveY: number;
    rawAimX: number;
    rawAimY: number;
    moveLen: number;
  } {
    let mx = 0;
    let mz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) mz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) mz += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;

    const moveLen = Math.hypot(mx, mz);
    if (moveLen > 1e-6) {
      mx /= moveLen;
      mz /= moveLen;
    }

    let aimX = 0;
    let aimZ = 0;
    let aimActive = false;
    if (this.mouseWorldAim) {
      aimX = this.mouseWorldAim.x - this.playerPos.x;
      aimZ = this.mouseWorldAim.z - this.playerPos.z;
      const len = Math.hypot(aimX, aimZ);
      if (len > 1e-4) {
        aimX /= len;
        aimZ /= len;
        aimActive = true;
      }
    }

    return {
      moveX: mx,
      moveZ: mz,
      aimX,
      aimZ,
      aimActive,
      rawMoveX: mx,
      rawMoveY: mz,
      rawAimX: aimX,
      rawAimY: aimZ,
      moveLen,
    };
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private readonly onBlur = (): void => {
    this.keys.clear();
    this.mouseLeftDown = false;
    this.prevInteract = false;
    this.prevMagBoots = false;
  };

  private readonly onMouseMove = (e: MouseEvent): void => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.mouseInWindow = true;
  };

  private readonly onMouseEnter = (): void => {
    this.mouseInWindow = true;
  };

  private readonly onMouseLeave = (): void => {
    this.mouseInWindow = false;
    this.mouseWorldAim = null;
    this.mouseLeftDown = false;
  };

  private readonly onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) this.mouseLeftDown = true;
  };

  private readonly onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.mouseLeftDown = false;
  };

  get clientMouse(): { x: number; y: number; active: boolean } {
    return { x: this.mouseX, y: this.mouseY, active: this.mouseInWindow };
  }
}

export const inputReader = new InputReader();

export { EMPTY_FRAME_INPUT };
