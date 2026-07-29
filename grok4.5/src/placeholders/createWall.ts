/**
 * Simple wall box mesh for hardcoded Phase 1 collision tests.
 */

import * as THREE from 'three';
import { WALL_HEIGHT } from '../shared/constants';

export interface WallSpec {
  /** Center X */
  x: number;
  /** Center Z */
  z: number;
  /** Size along X */
  width: number;
  /** Size along Z */
  depth: number;
  /** Optional height override */
  height?: number;
  color?: number;
}

export function createWall(spec: WallSpec): THREE.Mesh {
  const height = spec.height ?? WALL_HEIGHT;
  const geo = new THREE.BoxGeometry(spec.width, height, spec.depth);
  const mat = new THREE.MeshStandardMaterial({
    color: spec.color ?? 0x4a5568,
    metalness: 0.25,
    roughness: 0.7,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(spec.x, height / 2, spec.z);
  mesh.name = 'Wall';
  return mesh;
}

/** Axis-aligned bounds on XZ for collision (y ignored). */
export interface WallAabb {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function wallSpecToAabb(spec: WallSpec): WallAabb {
  const hx = spec.width / 2;
  const hz = spec.depth / 2;
  return {
    minX: spec.x - hx,
    maxX: spec.x + hx,
    minZ: spec.z - hz,
    maxZ: spec.z + hz,
  };
}
