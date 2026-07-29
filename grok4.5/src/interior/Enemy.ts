/**
 * Ranged enemy with line-of-sight firing and cover-seeking under fire.
 * Phase 4 aggression still applies when a breach is planted nearby.
 */

import * as THREE from 'three';
import {
  ENEMY_AGGRO_FIRE_MULT,
  ENEMY_AGGRO_PREFERRED_RANGE,
  ENEMY_AGGRO_SPEED_MULT,
  ENEMY_AIM_HEIGHT,
  ENEMY_COVER_DURATION,
  ENEMY_COVER_SEARCH_STEPS,
  ENEMY_DAMAGE,
  ENEMY_FIRE_RANGE,
  ENEMY_FIRE_RATE,
  ENEMY_MAX_HEALTH,
  ENEMY_MOVE_SPEED,
  ENEMY_PROJECTILE_LIFETIME,
  ENEMY_PROJECTILE_RADIUS,
  ENEMY_PROJECTILE_SPEED,
  ENEMY_RADIUS,
  ENEMY_STAND_RANGE,
} from '../shared/constants';
import { createEnemy } from '../placeholders/createEnemy';
import type { WallAabb } from '../placeholders/createWall';
import {
  isOverHole,
  suctionAccelAt,
  type HullHole,
} from './Breach';
import type { Grid, GridPoint } from './Grid';
import { Projectile } from './Projectile';

export class Enemy {
  readonly mesh: THREE.Group;
  readonly position = new THREE.Vector3(0, 0, 0);
  readonly radius = ENEMY_RADIUS;

  health = ENEMY_MAX_HEALTH;
  alive = true;
  facing = 0;

  /** Remaining aggression time (breach reaction). */
  aggressionTimer = 0;
  /** Remaining cover-seek time after taking damage. */
  underFireTimer = 0;

  private fireCooldown = 0;
  private hitFlash = 0;
  private readonly bodyMats: THREE.MeshStandardMaterial[] = [];
  private flankSign = 1;
  private coverTarget: GridPoint | null = null;
  private coverRetarget = 0;
  private suctionVx = 0;
  private suctionVz = 0;

  constructor(x: number, z: number) {
    this.mesh = createEnemy();
    this.position.set(x, 0, z);
    this.flankSign = Math.sin(x * 12.3 + z * 7.1) >= 0 ? 1 : -1;
    this.mesh.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.material instanceof THREE.MeshStandardMaterial
      ) {
        this.bodyMats.push(obj.material);
      }
    });
    this.syncMesh();
  }

  triggerAggression(duration: number): void {
    if (!this.alive) return;
    this.aggressionTimer = Math.max(this.aggressionTimer, duration);
    this.setEmissive(0xaa0000, 0.9);
    this.mesh.scale.setScalar(1.2);
  }

  get isAggressive(): boolean {
    return this.aggressionTimer > 0;
  }

  get isUnderFire(): boolean {
    return this.underFireTimer > 0;
  }

  /**
   * @returns optional projectile this step (only with LOS)
   */
  fixedUpdate(
    dt: number,
    playerAlive: boolean,
    playerX: number,
    playerZ: number,
    walls: readonly WallAabb[],
    grid: Grid | null,
    holes: readonly HullHole[] = [],
  ): Projectile | null {
    if (!this.alive) return null;

    if (this.aggressionTimer > 0) {
      this.aggressionTimer -= dt;
      if (this.aggressionTimer <= 0) {
        this.aggressionTimer = 0;
        if (!this.isUnderFire) this.setEmissive(0x401008, 0.35);
      }
    }

    if (this.underFireTimer > 0) {
      this.underFireTimer -= dt;
      if (this.underFireTimer <= 0) {
        this.underFireTimer = 0;
        this.coverTarget = null;
        if (!this.isAggressive) this.setEmissive(0x401008, 0.35);
      }
    }

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      if (this.hitFlash <= 0 && !this.isAggressive && !this.isUnderFire) {
        this.setEmissive(0x401008, 0.35);
      }
    }

    const dx = playerX - this.position.x;
    const dz = playerZ - this.position.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const dirX = dx / dist;
    const dirZ = dz / dist;

    this.facing = Math.atan2(dirX, dirZ);

    const hasLos =
      !!grid &&
      playerAlive &&
      grid.hasLineOfSight(
        this.position.x,
        this.position.z,
        playerX,
        playerZ,
      );

    // --- Movement ---
    if (playerAlive && grid) {
      if (this.isUnderFire && !this.isAggressive) {
        this.seekCover(dt, grid, playerX, playerZ, walls);
      } else if (this.isAggressive) {
        this.pushTowardPlayer(dt, dirX, dirZ, dist, walls, true);
      } else if (!hasLos) {
        this.pushTowardPlayer(dt, dirX, dirZ, dist, walls, false);
      } else {
        this.holdRange(dt, dirX, dirZ, dist, walls);
      }
    }

    // Suction in vacuum (enemies have no mag-boots)
    const inVacuum =
      !!grid && grid.isDepressurizedWorld(this.position.x, this.position.z);
    if (inVacuum && holes.length > 0) {
      const s = suctionAccelAt(this.position.x, this.position.z, holes);
      this.suctionVx += s.ax * dt;
      this.suctionVz += s.az * dt;
      // Soft clamp
      const sp = Math.hypot(this.suctionVx, this.suctionVz);
      if (sp > 14) {
        this.suctionVx = (this.suctionVx / sp) * 14;
        this.suctionVz = (this.suctionVz / sp) * 14;
      }
      this.position.x += this.suctionVx * dt;
      this.resolveWalls(walls);
      this.position.z += this.suctionVz * dt;
      this.resolveWalls(walls);

      if (isOverHole(this.position.x, this.position.z, holes)) {
        this.alive = false;
        this.health = 0;
        this.mesh.visible = false;
        console.log('[Enemy] sucked into space');
        return null;
      }
    } else {
      this.suctionVx *= 0.85;
      this.suctionVz *= 0.85;
    }

    // --- Fire only with clear LOS ---
    const fireRate =
      ENEMY_FIRE_RATE * (this.isAggressive ? ENEMY_AGGRO_FIRE_MULT : 1);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    let shot: Projectile | null = null;

    // No shooting without LOS. While seeking cover (under fire), hold fire
    // unless in breach-aggression push mode.
    const mayShoot =
      playerAlive &&
      hasLos &&
      dist <= ENEMY_FIRE_RANGE &&
      this.fireCooldown <= 0 &&
      (!this.isUnderFire || this.isAggressive);

    if (mayShoot) {
      this.fireCooldown = 1 / fireRate;
      shot = new Projectile({
        x: this.position.x + dirX * (this.radius + 0.2),
        y: ENEMY_AIM_HEIGHT,
        z: this.position.z + dirZ * (this.radius + 0.2),
        dirX,
        dirZ,
        speed: ENEMY_PROJECTILE_SPEED * (this.isAggressive ? 1.15 : 1),
        lifetime: ENEMY_PROJECTILE_LIFETIME,
        radius: ENEMY_PROJECTILE_RADIUS,
        damage: ENEMY_DAMAGE,
        team: 'enemy',
        color: this.isAggressive ? 0xff2200 : 0xff4422,
      });
    }

    this.syncMesh();
    return shot;
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.health -= amount;
    this.hitFlash = 0.1;
    this.underFireTimer = Math.max(this.underFireTimer, ENEMY_COVER_DURATION);
    this.coverTarget = null; // repath cover
    this.coverRetarget = 0;
    this.setEmissive(0xffffff, 1.2);
    this.mesh.scale.setScalar(1.15);
    // Blue-ish tint while seeking cover (after flash)
    if (this.health > 0) {
      // hit flash handled; under-fire tint applied next frames via underFireTimer
    }
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.mesh.visible = false;
    }
  }

  private seekCover(
    dt: number,
    grid: Grid,
    playerX: number,
    playerZ: number,
    walls: readonly WallAabb[],
  ): void {
    this.coverRetarget -= dt;
    if (this.coverRetarget <= 0 || !this.coverTarget) {
      this.coverRetarget = 0.45;
      this.coverTarget = grid.findCoverNear(
        this.position.x,
        this.position.z,
        playerX,
        playerZ,
        ENEMY_COVER_SEARCH_STEPS,
      );
      // Visual: cool tint while in cover mode
      if (!this.isAggressive) this.setEmissive(0x204060, 0.55);
    }

    if (!this.coverTarget) {
      // No cover found — strafe perpendicular away from player
      const dx = playerX - this.position.x;
      const dz = playerZ - this.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      const dirX = dx / dist;
      const dirZ = dz / dist;
      const sx = -dirZ * this.flankSign;
      const sz = dirX * this.flankSign;
      this.moveDir(sx, sz, ENEMY_MOVE_SPEED * 1.1, dt, walls);
      return;
    }

    const goal = grid.cellToWorld(this.coverTarget.x, this.coverTarget.z);
    const gx = goal.x - this.position.x;
    const gz = goal.z - this.position.z;
    const glen = Math.hypot(gx, gz);
    if (glen < 0.35) {
      // In cover — hold
      return;
    }
    this.moveDir(gx / glen, gz / glen, ENEMY_MOVE_SPEED * 1.25, dt, walls);
  }

  private pushTowardPlayer(
    dt: number,
    dirX: number,
    dirZ: number,
    dist: number,
    walls: readonly WallAabb[],
    aggressive: boolean,
  ): void {
    const pref = aggressive
      ? ENEMY_AGGRO_PREFERRED_RANGE
      : ENEMY_STAND_RANGE;
    const speed =
      ENEMY_MOVE_SPEED * (aggressive ? ENEMY_AGGRO_SPEED_MULT : 1.05);
    let moveFwd = 0;
    if (dist > pref + 0.8) moveFwd = 1;
    else if (aggressive && dist > 2.2) moveFwd = 1;

    let strafe = 0;
    if (aggressive) strafe = this.flankSign * 0.85;

    const mx = dirX * moveFwd + -dirZ * strafe;
    const mz = dirZ * moveFwd + dirX * strafe;
    const mlen = Math.hypot(mx, mz);
    if (mlen > 1e-4) {
      this.moveDir(mx / mlen, mz / mlen, speed, dt, walls);
    }
  }

  private holdRange(
    dt: number,
    dirX: number,
    dirZ: number,
    dist: number,
    walls: readonly WallAabb[],
  ): void {
    let moveFwd = 0;
    if (dist > ENEMY_STAND_RANGE + 1.5) moveFwd = 1;
    else if (dist < ENEMY_STAND_RANGE - 1.5) moveFwd = -0.75;
    // Slight strafe for liveliness
    const strafe = this.flankSign * 0.25;
    const mx = dirX * moveFwd + -dirZ * strafe;
    const mz = dirZ * moveFwd + dirX * strafe;
    const mlen = Math.hypot(mx, mz);
    if (mlen > 1e-4) {
      this.moveDir(mx / mlen, mz / mlen, ENEMY_MOVE_SPEED, dt, walls);
    }
  }

  private moveDir(
    nx: number,
    nz: number,
    speed: number,
    dt: number,
    walls: readonly WallAabb[],
  ): void {
    this.position.x += nx * speed * dt;
    this.resolveWalls(walls);
    this.position.z += nz * speed * dt;
    this.resolveWalls(walls);
  }

  private setEmissive(color: number, intensity: number): void {
    for (const m of this.bodyMats) {
      m.emissive.setHex(color);
      m.emissiveIntensity = intensity;
    }
  }

  private syncMesh(): void {
    this.mesh.position.set(this.position.x, 0, this.position.z);
    this.mesh.rotation.y = this.facing + Math.PI;
    const s = this.mesh.scale.x;
    if (s > 1.001) {
      const next = 1 + (s - 1) * 0.75;
      this.mesh.scale.setScalar(next < 1.01 ? 1 : next);
    }
  }

  private resolveWalls(walls: readonly WallAabb[]): void {
    const r = this.radius;
    for (const w of walls) {
      const nearestX = clamp(this.position.x, w.minX, w.maxX);
      const nearestZ = clamp(this.position.z, w.minZ, w.maxZ);
      const dx = this.position.x - nearestX;
      const dz = this.position.z - nearestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq >= r * r || distSq < 1e-10) {
        if (distSq < 1e-10) {
          const left = this.position.x - w.minX + r;
          const right = w.maxX + r - this.position.x;
          const up = this.position.z - w.minZ + r;
          const down = w.maxZ + r - this.position.z;
          const m = Math.min(left, right, up, down);
          if (m === left) this.position.x = w.minX - r;
          else if (m === right) this.position.x = w.maxX + r;
          else if (m === up) this.position.z = w.minZ - r;
          else this.position.z = w.maxZ + r;
        }
        continue;
      }
      const dist = Math.sqrt(distSq);
      const push = (r - dist) / dist;
      this.position.x += dx * push;
      this.position.z += dz * push;
    }
  }

  dispose(): void {
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
