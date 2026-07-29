/**
 * Simple projectile: mesh + velocity + lifetime + wall/entity collision.
 */

import * as THREE from 'three';
import type { TeamId } from '../shared/types';
import type { WallAabb } from '../placeholders/createWall';

export interface ProjectileSpawn {
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirZ: number;
  speed: number;
  lifetime: number;
  radius: number;
  damage: number;
  team: TeamId;
  color: number;
}

export class Projectile {
  readonly mesh: THREE.Mesh;
  readonly team: TeamId;
  readonly damage: number;
  readonly radius: number;

  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  alive = true;

  private life: number;
  private readonly mat: THREE.MeshStandardMaterial;

  constructor(spawn: ProjectileSpawn) {
    this.team = spawn.team;
    this.damage = spawn.damage;
    this.radius = spawn.radius;
    this.x = spawn.x;
    this.y = spawn.y;
    this.z = spawn.z;
    this.life = spawn.lifetime;

    const len = Math.hypot(spawn.dirX, spawn.dirZ) || 1;
    const dx = spawn.dirX / len;
    const dz = spawn.dirZ / len;
    this.vx = dx * spawn.speed;
    this.vz = dz * spawn.speed;

    this.mat = new THREE.MeshStandardMaterial({
      color: spawn.color,
      emissive: spawn.color,
      emissiveIntensity: 0.9,
      metalness: 0.2,
      roughness: 0.35,
    });
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(spawn.radius, 8, 8),
      this.mat,
    );
    this.mesh.position.set(this.x, this.y, this.z);
  }

  /**
   * @returns true if still alive
   */
  fixedUpdate(dt: number, walls: readonly WallAabb[]): boolean {
    if (!this.alive) return false;

    this.life -= dt;
    if (this.life <= 0) {
      this.kill();
      return false;
    }

    const prevX = this.x;
    const prevZ = this.z;
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    if (hitsWallSegment(prevX, prevZ, this.x, this.z, this.radius, walls)) {
      this.kill();
      return false;
    }

    this.mesh.position.set(this.x, this.y, this.z);
    return true;
  }

  kill(): void {
    this.alive = false;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}

function hitsWallSegment(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  radius: number,
  walls: readonly WallAabb[],
): boolean {
  // Sample end point + mid against expanded AABB (good enough for fast bullets)
  for (const w of walls) {
    if (pointNearAabb(x1, z1, w, radius)) return true;
    if (pointNearAabb((x0 + x1) * 0.5, (z0 + z1) * 0.5, w, radius)) return true;
  }
  return false;
}

function pointNearAabb(
  x: number,
  z: number,
  w: WallAabb,
  radius: number,
): boolean {
  const nx = clamp(x, w.minX, w.maxX);
  const nz = clamp(z, w.minZ, w.maxZ);
  const dx = x - nx;
  const dz = z - nz;
  return dx * dx + dz * dz <= radius * radius;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
