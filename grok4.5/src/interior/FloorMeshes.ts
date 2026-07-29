/**
 * Build Three.js meshes from a Grid.
 * Walls use InstancedMesh; floors too; markers are simple props.
 */

import * as THREE from 'three';
import { CELL_SIZE, WALL_HEIGHT } from '../shared/constants';
import type { Grid } from './Grid';

export interface FloorMeshBundle {
  group: THREE.Group;
  /** Dispose geometries/materials and remove from parent. */
  dispose: () => void;
}

const FLOOR_COLOR = 0x1a2030;
/** Outer hull — dark, thick look, not breachable. */
const OUTER_HULL_COLOR = 0x2a3344;
/** Interior partitions — warm steel, all breachable. */
const INTERIOR_WALL_COLOR = 0xa89050;
const ENTRY_COLOR = 0x33e0ff;
const BOMB_COLOR = 0xff2244;
const EXTRACT_COLOR = 0x44ff88;

export function buildFloorMeshes(grid: Grid): FloorMeshBundle {
  const group = new THREE.Group();
  group.name = 'ProceduralFloor';

  const disposables: Array<{ geo?: THREE.BufferGeometry; mat?: THREE.Material }> =
    [];

  // Collect instances
  const floors: { x: number; z: number }[] = [];
  const vacuumFloors: { x: number; z: number }[] = [];
  const outerHull: { x: number; z: number }[] = [];
  const outerHullBreachable: { x: number; z: number }[] = [];
  const interiorWalls: { x: number; z: number }[] = [];

  grid.forEach((cx, cz, cell) => {
    const w = grid.cellToWorld(cx, cz);
    if (cell.kind === 'floor') {
      if (cell.depressurized) vacuumFloors.push(w);
      else floors.push(w);
    } else if (cell.kind === 'wall') {
      if (cell.outerHull) {
        if (cell.breachable) outerHullBreachable.push(w);
        else outerHull.push(w);
      } else if (cell.breachable) {
        interiorWalls.push(w);
      } else {
        outerHull.push(w);
      }
    }
  });

  const dummy = new THREE.Object3D();

  // Pressurized floors
  if (floors.length > 0) {
    const geo = new THREE.BoxGeometry(CELL_SIZE * 0.98, 0.12, CELL_SIZE * 0.98);
    const mat = new THREE.MeshStandardMaterial({
      color: FLOOR_COLOR,
      metalness: 0.12,
      roughness: 0.9,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, floors.length);
    mesh.name = 'Floors';
    floors.forEach((p, i) => {
      dummy.position.set(p.x, 0.06, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    disposables.push({ geo, mat });
  }

  // Vacuum floors — colder tint
  if (vacuumFloors.length > 0) {
    const geo = new THREE.BoxGeometry(CELL_SIZE * 0.98, 0.12, CELL_SIZE * 0.98);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a1830,
      emissive: 0x102040,
      emissiveIntensity: 0.35,
      metalness: 0.2,
      roughness: 0.85,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, vacuumFloors.length);
    mesh.name = 'VacuumFloors';
    vacuumFloors.forEach((p, i) => {
      dummy.position.set(p.x, 0.06, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    disposables.push({ geo, mat });
  }

  // Outer hull — dark, taller silhouette
  if (outerHull.length > 0) {
    const geo = new THREE.BoxGeometry(
      CELL_SIZE * 0.98,
      WALL_HEIGHT * 1.08,
      CELL_SIZE * 0.98,
    );
    const mat = new THREE.MeshStandardMaterial({
      color: OUTER_HULL_COLOR,
      metalness: 0.4,
      roughness: 0.65,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, outerHull.length);
    mesh.name = 'OuterHull';
    outerHull.forEach((p, i) => {
      dummy.position.set(p.x, (WALL_HEIGHT * 1.08) * 0.5, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    disposables.push({ geo, mat });
  }

  // Outer hull breachable tags — icy danger (charge only)
  if (outerHullBreachable.length > 0) {
    const geo = new THREE.BoxGeometry(
      CELL_SIZE * 0.98,
      WALL_HEIGHT * 1.08,
      CELL_SIZE * 0.98,
    );
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3a6088,
      emissive: 0x2060aa,
      emissiveIntensity: 0.55,
      metalness: 0.45,
      roughness: 0.5,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, outerHullBreachable.length);
    mesh.name = 'OuterHullBreachable';
    outerHullBreachable.forEach((p, i) => {
      dummy.position.set(p.x, (WALL_HEIGHT * 1.08) * 0.5, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    disposables.push({ geo, mat });

    // Warning stripe
    const stripeGeo = new THREE.BoxGeometry(
      CELL_SIZE * 0.55,
      0.18,
      CELL_SIZE * 0.55,
    );
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x66ccff,
      emissive: 0x2288ff,
      emissiveIntensity: 0.9,
    });
    const stripeMesh = new THREE.InstancedMesh(
      stripeGeo,
      stripeMat,
      outerHullBreachable.length,
    );
    outerHullBreachable.forEach((p, i) => {
      dummy.position.set(p.x, WALL_HEIGHT * 1.08 + 0.12, p.z);
      dummy.updateMatrix();
      stripeMesh.setMatrixAt(i, dummy.matrix);
    });
    stripeMesh.instanceMatrix.needsUpdate = true;
    group.add(stripeMesh);
    disposables.push({ geo: stripeGeo, mat: stripeMat });
  }

  // Interior walls — all breachable (warm steel)
  if (interiorWalls.length > 0) {
    const geo = new THREE.BoxGeometry(
      CELL_SIZE * 0.98,
      WALL_HEIGHT,
      CELL_SIZE * 0.98,
    );
    const mat = new THREE.MeshStandardMaterial({
      color: INTERIOR_WALL_COLOR,
      emissive: 0x3a3010,
      emissiveIntensity: 0.22,
      metalness: 0.3,
      roughness: 0.55,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, interiorWalls.length);
    mesh.name = 'InteriorWalls';
    interiorWalls.forEach((p, i) => {
      dummy.position.set(p.x, WALL_HEIGHT * 0.5, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    disposables.push({ geo, mat });
  }

  // Objective markers (not interactive yet)
  addMarker(
    group,
    disposables,
    grid.cellToWorld(grid.entry.x, grid.entry.z),
    ENTRY_COLOR,
    'EntryPad',
    'ring',
  );
  addMarker(
    group,
    disposables,
    grid.cellToWorld(grid.bomb.x, grid.bomb.z),
    BOMB_COLOR,
    'BombMarker',
    'cylinder',
  );
  addMarker(
    group,
    disposables,
    grid.cellToWorld(grid.extract.x, grid.extract.z),
    EXTRACT_COLOR,
    'ExtractPad',
    'ring',
  );

  return {
    group,
    dispose: () => {
      group.removeFromParent();
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry?.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose();
        }
      });
      // disposables already covered by traverse in most cases
      void disposables;
    },
  };
}

function addMarker(
  group: THREE.Group,
  disposables: Array<{ geo?: THREE.BufferGeometry; mat?: THREE.Material }>,
  pos: { x: number; z: number },
  color: number,
  name: string,
  shape: 'ring' | 'cylinder',
): void {
  if (shape === 'ring') {
    const geo = new THREE.RingGeometry(0.35, 0.7, 24);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      side: THREE.DoubleSide,
      metalness: 0.2,
      roughness: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.14, pos.z);
    mesh.name = name;
    group.add(mesh);
    disposables.push({ geo, mat });
  } else {
    const geo = new THREE.CylinderGeometry(0.35, 0.4, 0.7, 12);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      metalness: 0.25,
      roughness: 0.45,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 0.45, pos.z);
    mesh.name = name;
    group.add(mesh);
    disposables.push({ geo, mat });
  }
}
