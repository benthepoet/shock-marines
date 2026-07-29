/**
 * Input command buffer + latest FrameInput snapshot.
 * Devices write each frame; simulation reads in fixedUpdate.
 */

import type { FrameInput, InputCommand } from './types';

export const EMPTY_FRAME_INPUT: FrameInput = {
  moveX: 0,
  moveZ: 0,
  aimX: 0,
  aimZ: 0,
  aimActive: false,
  fire: false,
  interact: false,
  interactPressed: false,
  magBootsPressed: false,
  rawMoveX: 0,
  rawMoveY: 0,
  rawAimX: 0,
  rawAimY: 0,
  source: 'none',
};

/**
 * Frame-scoped discrete command buffer (future actions).
 */
export class InputCommandBuffer {
  private commands: InputCommand[] = [];

  push(command: InputCommand): void {
    this.commands.push(command);
  }

  /** Returns a snapshot and clears the buffer. */
  drain(): InputCommand[] {
    const out = this.commands;
    this.commands = [];
    return out;
  }

  peek(): readonly InputCommand[] {
    return this.commands;
  }

  clear(): void {
    this.commands = [];
  }
}

export const inputCommands = new InputCommandBuffer();

/** Latest continuous input (overwritten each poll). */
let latestFrameInput: FrameInput = { ...EMPTY_FRAME_INPUT };

export function setFrameInput(input: FrameInput): void {
  latestFrameInput = input;
}

export function getFrameInput(): FrameInput {
  return latestFrameInput;
}
