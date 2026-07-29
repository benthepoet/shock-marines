/**
 * Placed breaching charge: fuse countdown → open wall cell.
 */

import * as THREE from 'three';
import { BREACH_FUSE_TIME } from '../shared/constants';
import { createCharge } from '../placeholders/createCharge';
import type { GridPoint } from './Grid';

export type ChargeState = 'fusing' | 'detonated' | 'cancelled';

export class BreachingCharge {
  readonly mesh: THREE.Group;
  readonly cell: GridPoint;
  readonly worldX: number;
  readonly worldZ: number;

  /** Seconds remaining on fuse. */
  fuseRemaining: number;
  readonly fuseTotal: number;
  state: ChargeState = 'fusing';

  private readonly fuseFill: THREE.Mesh;
  private readonly bodyMat: THREE.MeshStandardMaterial;
  private pulse = 0;

  constructor(
    cell: GridPoint,
    worldX: number,
    worldZ: number,
    fuseTime: number = BREACH_FUSE_TIME,
  ) {
    this.cell = { x: cell.x, z: cell.z };
    this.worldX = worldX;
    this.worldZ = worldZ;
    this.fuseTotal = fuseTime;
    this.fuseRemaining = fuseTime;

    const created = createCharge();
    this.mesh = created.root;
    this.fuseFill = created.fuseFill;
    this.bodyMat = created.bodyMat;
    this.mesh.position.set(worldX, 0, worldZ);
  }

  /**
   * @returns true when detonation just happened this step
   */
  fixedUpdate(dt: number): boolean {
    if (this.state !== 'fusing') return false;

    this.fuseRemaining -= dt;
    this.pulse += dt * 10;

    const t = Math.max(0, this.fuseRemaining / this.fuseTotal);
    // Shrink fuse disc with remaining time
    const s = 0.15 + t * 0.85;
    this.fuseFill.scale.set(s, s, s);

    // Pulse emissive harder as fuse runs down
    const urgency = 1 - t;
    this.bodyMat.emissiveIntensity = 0.7 + urgency * 1.5 + Math.sin(this.pulse) * 0.25;

    if (this.fuseRemaining <= 0) {
      this.fuseRemaining = 0;
      this.state = 'detonated';
      return true;
    }
    return false;
  }

  dispose(): void {
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
      if (obj instanceof THREE.PointLight) {
        // lights have no geometry
      }
    });
  }
}
