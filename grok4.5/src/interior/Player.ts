/**
 * Player: movement, aim, health, rifle, oxygen, mag-boots, suction.
 */

import * as THREE from 'three';
import {
  MAGBOOT_MOVE_MULT,
  MAGBOOT_SUCTION_MULT,
  MOVE_ACCELERATION,
  MOVE_FRICTION,
  MOVE_MAX_SPEED,
  OXYGEN_DRAIN_FIRE,
  OXYGEN_DRAIN_IDLE,
  OXYGEN_DRAIN_MOVE,
  OXYGEN_EMPTY_DPS,
  OXYGEN_MAX,
  PLAYER_HIT_IFRAME,
  PLAYER_MAX_HEALTH,
  PLAYER_RADIUS,
  RIFLE_DAMAGE,
  RIFLE_FIRE_RATE,
  RIFLE_MUZZLE_HEIGHT,
  RIFLE_MUZZLE_OFFSET,
  RIFLE_PROJECTILE_LIFETIME,
  RIFLE_PROJECTILE_RADIUS,
  RIFLE_PROJECTILE_SPEED,
} from '../shared/constants';
import type { FrameInput } from '../shared/types';
import { createPlayer } from '../placeholders/createPlayer';
import type { WallAabb } from '../placeholders/createWall';
import {
  isOverHole,
  suctionAccelAt,
  type HullHole,
} from './Breach';
import type { Grid } from './Grid';
import { Projectile } from './Projectile';

export class Player {
  readonly mesh: THREE.Group;
  readonly position = new THREE.Vector3(0, 0, 0);
  readonly velocity = new THREE.Vector3(0, 0, 0);
  readonly radius: number;

  facing = 0;
  health = PLAYER_MAX_HEALTH;
  alive = true;
  oxygen = OXYGEN_MAX;
  magBoots = false;
  inVacuum = false;

  private fireCooldown = 0;
  private hitIframe = 0;
  private hitFlash = 0;
  private muzzleFlash = 0;
  private readonly muzzleLight: THREE.PointLight;
  private readonly bodyMats: THREE.MeshStandardMaterial[] = [];
  private readonly bootRing: THREE.Mesh;

  constructor(radius: number = PLAYER_RADIUS) {
    this.radius = radius;
    this.mesh = createPlayer();
    this.mesh.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.material instanceof THREE.MeshStandardMaterial
      ) {
        this.bodyMats.push(obj.material);
      }
    });

    this.muzzleLight = new THREE.PointLight(0xaaffff, 0, 4);
    this.muzzleLight.position.set(0, RIFLE_MUZZLE_HEIGHT, -RIFLE_MUZZLE_OFFSET);
    this.mesh.add(this.muzzleLight);

    this.bootRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.7, 24),
      new THREE.MeshBasicMaterial({
        color: 0x44ffaa,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.bootRing.rotation.x = -Math.PI / 2;
    this.bootRing.position.y = 0.05;
    this.mesh.add(this.bootRing);

    this.syncMesh();
  }

  get facingDirection(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
  }

  /**
   * @returns optional rifle projectile; sets diedInSpace if sucked out
   */
  fixedUpdate(
    dt: number,
    input: FrameInput,
    walls: readonly WallAabb[],
    grid: Grid | null,
    holes: readonly HullHole[],
  ): { shot: Projectile | null; diedInSpace: boolean } {
    if (!this.alive) {
      this.muzzleLight.intensity = 0;
      return { shot: null, diedInSpace: false };
    }

    if (input.magBootsPressed) {
      this.magBoots = !this.magBoots;
      console.log(`[Player] mag-boots ${this.magBoots ? 'ON' : 'OFF'}`);
    }

    if (this.hitIframe > 0) this.hitIframe -= dt;
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      if (this.hitFlash <= 0) this.clearHitFlash();
    }
    if (this.muzzleFlash > 0) {
      this.muzzleFlash -= dt;
      this.muzzleLight.intensity = Math.max(0, this.muzzleFlash * 12);
    } else {
      this.muzzleLight.intensity = 0;
    }

    this.inVacuum = !!grid && grid.isDepressurizedWorld(this.position.x, this.position.z);

    const moveMult = this.magBoots ? MAGBOOT_MOVE_MULT : 1;
    const maxSpeed = MOVE_MAX_SPEED * moveMult;

    const targetVx = input.moveX * maxSpeed;
    const targetVz = input.moveZ * maxSpeed;
    const hasMove = Math.hypot(input.moveX, input.moveZ) > 1e-4;

    if (hasMove) {
      this.velocity.x = approach(
        this.velocity.x,
        targetVx,
        MOVE_ACCELERATION * moveMult * dt,
      );
      this.velocity.z = approach(
        this.velocity.z,
        targetVz,
        MOVE_ACCELERATION * moveMult * dt,
      );
    } else {
      this.velocity.x = approach(this.velocity.x, 0, MOVE_FRICTION * dt);
      this.velocity.z = approach(this.velocity.z, 0, MOVE_FRICTION * dt);
    }

    // Suction in vacuum
    if (this.inVacuum && holes.length > 0) {
      const s = suctionAccelAt(this.position.x, this.position.z, holes);
      const mult = this.magBoots ? MAGBOOT_SUCTION_MULT : 1;
      this.velocity.x += s.ax * mult * dt;
      this.velocity.z += s.az * mult * dt;
    }

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const hardCap = maxSpeed * (this.inVacuum && !this.magBoots ? 2.2 : 1);
    if (speed > hardCap) {
      const s = hardCap / speed;
      this.velocity.x *= s;
      this.velocity.z *= s;
    }

    this.position.x += this.velocity.x * dt;
    this.resolveCircleAabbs(walls);
    this.position.z += this.velocity.z * dt;
    this.resolveCircleAabbs(walls);

    if (input.aimActive) {
      this.facing = Math.atan2(input.aimX, input.aimZ);
    }

    // Oxygen in vacuum
    if (this.inVacuum) {
      let drain = OXYGEN_DRAIN_IDLE;
      const spd = Math.hypot(this.velocity.x, this.velocity.z);
      if (spd > 0.4) {
        drain += OXYGEN_DRAIN_MOVE * Math.min(1, spd / MOVE_MAX_SPEED);
      }
      if (input.fire) drain += OXYGEN_DRAIN_FIRE;
      this.oxygen = Math.max(0, this.oxygen - drain * dt);
      if (this.oxygen <= 0) {
        this.takeDamage(OXYGEN_EMPTY_DPS * dt);
      }
    }

    // Space death
    if (this.inVacuum && isOverHole(this.position.x, this.position.z, holes)) {
      this.alive = false;
      this.health = 0;
      this.velocity.set(0, 0, 0);
      this.mesh.visible = false;
      console.log('[Player] sucked into space');
      return { shot: null, diedInSpace: true };
    }

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    let shot: Projectile | null = null;

    if (input.fire && this.fireCooldown <= 0) {
      this.fireCooldown = 1 / RIFLE_FIRE_RATE;
      const dir = this.facingDirection;
      shot = new Projectile({
        x: this.position.x + dir.x * RIFLE_MUZZLE_OFFSET,
        y: RIFLE_MUZZLE_HEIGHT,
        z: this.position.z + dir.z * RIFLE_MUZZLE_OFFSET,
        dirX: dir.x,
        dirZ: dir.z,
        speed: RIFLE_PROJECTILE_SPEED,
        lifetime: RIFLE_PROJECTILE_LIFETIME,
        radius: RIFLE_PROJECTILE_RADIUS,
        damage: RIFLE_DAMAGE,
        team: 'player',
        color: 0x88ffff,
      });
      this.muzzleFlash = 0.06;
      this.muzzleLight.intensity = 2.5;
      this.mesh.scale.setScalar(1.04);
    }

    this.syncMesh();
    return { shot, diedInSpace: false };
  }

  takeDamage(amount: number): void {
    if (!this.alive || this.hitIframe > 0) return;
    // Continuous O2 damage bypasses iframe slightly: only set iframe for discrete hits
    if (amount > 2) this.hitIframe = PLAYER_HIT_IFRAME;
    this.health -= amount;
    if (amount > 2) {
      this.flashHit();
      this.mesh.scale.setScalar(1.12);
    }
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.velocity.set(0, 0, 0);
      console.log('[Player] died');
    }
  }

  reset(x = 0, z = 0): void {
    this.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.facing = 0;
    this.health = PLAYER_MAX_HEALTH;
    this.alive = true;
    this.oxygen = OXYGEN_MAX;
    this.magBoots = false;
    this.inVacuum = false;
    this.fireCooldown = 0;
    this.hitIframe = 0;
    this.hitFlash = 0;
    this.muzzleFlash = 0;
    this.mesh.visible = true;
    this.mesh.scale.setScalar(1);
    this.clearHitFlash();
    this.syncMesh();
  }

  private flashHit(): void {
    this.hitFlash = 0.1;
    for (const m of this.bodyMats) {
      m.emissive.setHex(0xff2222);
      m.emissiveIntensity = 1.4;
    }
  }

  private clearHitFlash(): void {
    for (const m of this.bodyMats) {
      m.emissive.setHex(0x0a3340);
      m.emissiveIntensity = 1;
    }
  }

  private syncMesh(): void {
    this.mesh.position.set(this.position.x, 0, this.position.z);
    this.mesh.rotation.y = this.facing + Math.PI;
    this.mesh.visible = this.alive;

    const mat = this.bootRing.material as THREE.MeshBasicMaterial;
    mat.opacity = this.magBoots ? 0.85 : 0;

    const s = this.mesh.scale.x;
    if (s > 1.001) {
      const next = 1 + (s - 1) * 0.7;
      this.mesh.scale.setScalar(next < 1.01 ? 1 : next);
    }
  }

  private resolveCircleAabbs(walls: readonly WallAabb[]): void {
    const r = this.radius;
    for (const w of walls) {
      const nearestX = clamp(this.position.x, w.minX, w.maxX);
      const nearestZ = clamp(this.position.z, w.minZ, w.maxZ);
      let dx = this.position.x - nearestX;
      let dz = this.position.z - nearestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq >= r * r) continue;

      if (distSq < 1e-10) {
        const penLeft = this.position.x - (w.minX - r);
        const penRight = w.maxX + r - this.position.x;
        const penUp = this.position.z - (w.minZ - r);
        const penDown = w.maxZ + r - this.position.z;
        const m = Math.min(penLeft, penRight, penUp, penDown);
        if (m === penLeft) {
          this.position.x = w.minX - r;
          if (this.velocity.x > 0) this.velocity.x = 0;
        } else if (m === penRight) {
          this.position.x = w.maxX + r;
          if (this.velocity.x < 0) this.velocity.x = 0;
        } else if (m === penUp) {
          this.position.z = w.minZ - r;
          if (this.velocity.z > 0) this.velocity.z = 0;
        } else {
          this.position.z = w.maxZ + r;
          if (this.velocity.z < 0) this.velocity.z = 0;
        }
        continue;
      }

      const dist = Math.sqrt(distSq);
      const push = (r - dist) / dist;
      this.position.x += dx * push;
      this.position.z += dz * push;

      const nx = dx / dist;
      const nz = dz / dist;
      const vn = this.velocity.x * nx + this.velocity.z * nz;
      if (vn < 0) {
        this.velocity.x -= vn * nx;
        this.velocity.z -= vn * nz;
      }
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

function approach(current: number, target: number, maxDelta: number): number {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
