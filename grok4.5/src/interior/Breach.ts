/**
 * Active outer-hull hole + suction field.
 */

import * as THREE from 'three';
import {
  SPACE_SUCK_RADIUS,
  SUCTION_ACCEL,
  SUCTION_FULL_RANGE,
  SUCTION_MAX_RANGE,
} from '../shared/constants';
import type { GridPoint } from './Grid';

export interface HullHole {
  cell: GridPoint;
  worldX: number;
  worldZ: number;
  /** Visual marker group */
  visual: THREE.Group;
}

/**
 * Suction acceleration at a world point toward the nearest hole.
 * Returns zero if outside max range.
 */
export function suctionAccelAt(
  wx: number,
  wz: number,
  holes: readonly HullHole[],
): { ax: number; az: number; nearest: HullHole | null; dist: number } {
  if (holes.length === 0) {
    return { ax: 0, az: 0, nearest: null, dist: Infinity };
  }

  let nearest: HullHole | null = null;
  let best = Infinity;
  for (const h of holes) {
    const d = Math.hypot(h.worldX - wx, h.worldZ - wz);
    if (d < best) {
      best = d;
      nearest = h;
    }
  }
  if (!nearest || best > SUCTION_MAX_RANGE) {
    return { ax: 0, az: 0, nearest, dist: best };
  }

  // Direction toward hole
  const dx = nearest.worldX - wx;
  const dz = nearest.worldZ - wz;
  const len = Math.hypot(dx, dz) || 1;
  const nx = dx / len;
  const nz = dz / len;

  // Strength: full within FULL_RANGE, linear fade to MAX_RANGE
  let strength = 1;
  if (best > SUCTION_FULL_RANGE) {
    strength =
      1 -
      (best - SUCTION_FULL_RANGE) / (SUCTION_MAX_RANGE - SUCTION_FULL_RANGE);
  }
  strength = Math.max(0, Math.min(1, strength));
  // Closer = slightly stronger pull
  const nearBoost = 1 + (1 - Math.min(1, best / SUCTION_FULL_RANGE)) * 0.5;
  const accel = SUCTION_ACCEL * strength * nearBoost;

  return { ax: nx * accel, az: nz * accel, nearest, dist: best };
}

export function isOverHole(
  wx: number,
  wz: number,
  holes: readonly HullHole[],
): HullHole | null {
  for (const h of holes) {
    if (Math.hypot(h.worldX - wx, h.worldZ - wz) <= SPACE_SUCK_RADIUS) {
      return h;
    }
  }
  return null;
}

/** Dark void plane + swirling markers for a hull hole. */
export function createHoleVisual(worldX: number, worldZ: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'HullHole';
  root.position.set(worldX, 0, worldZ);

  const voidMesh = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 20),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
    }),
  );
  voidMesh.rotation.x = -Math.PI / 2;
  voidMesh.position.y = 0.05;
  root.add(voidMesh);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.35, 24),
    new THREE.MeshBasicMaterial({
      color: 0x66aaff,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  root.add(ring);

  const mist = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.2),
    new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mist.rotation.x = -Math.PI / 2;
  mist.position.y = 0.12;
  mist.name = 'Mist';
  root.add(mist);

  // Outward arrows (suction direction cue — particles stream out)
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)),
      new THREE.Vector3(0, 0.4, 0),
      1.2,
      0x88ddff,
      0.3,
      0.2,
    );
    root.add(arrow);
  }

  return root;
}

export class BreachSystem {
  readonly holes: HullHole[] = [];

  addHole(cell: GridPoint, worldX: number, worldZ: number, scene: THREE.Scene): HullHole {
    // Avoid duplicates
    const existing = this.holes.find(
      (h) => h.cell.x === cell.x && h.cell.z === cell.z,
    );
    if (existing) return existing;

    const visual = createHoleVisual(worldX, worldZ);
    scene.add(visual);
    const hole: HullHole = { cell: { ...cell }, worldX, worldZ, visual };
    this.holes.push(hole);
    return hole;
  }

  clear(scene: THREE.Scene): void {
    for (const h of this.holes) {
      scene.remove(h.visual);
      h.visual.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
    }
    this.holes.length = 0;
  }

  /** Animate mist spin for readability. */
  renderTick(time: number): void {
    for (const h of this.holes) {
      const mist = h.visual.getObjectByName('Mist');
      if (mist) mist.rotation.z = time * 0.8;
    }
  }
}
