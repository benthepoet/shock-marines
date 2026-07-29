/**
 * Rectangular battleship hull subdivided into rooms and hallways.
 * Outer hull walls are indestructible; all interior walls are breachable.
 * Guarantees walkable path: Entry → Bomb → Extract.
 */

import {
  ENEMY_SPAWN_MIN_DIST,
  GRID_HEIGHT,
  GRID_WIDTH,
  OUTER_HULL_BREACH_TAGS_MAX,
  OUTER_HULL_BREACH_TAGS_MIN,
  PROC_ENEMY_COUNT,
  SHIP_MARGIN,
  SUBDIVIDE_MIN_SIZE,
  SUBDIVIDE_MAX_DEPTH,
} from '../shared/constants';
import { SeededRandom } from '../game/SeededRandom';
import { Grid, type GridPoint } from './Grid';

export interface FloorLayout {
  grid: Grid;
  seed: number;
  roomCount: number;
}

interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/**
 * Generate a complete floor from seed.
 */
export function generateFloor(seed: number): FloorLayout {
  for (let attempt = 0; attempt < 16; attempt++) {
    const rng = new SeededRandom((seed + attempt * 9973) >>> 0);
    const layout = tryGenerate(rng, seed);
    if (layout) return layout;
  }
  console.warn('[FloorGenerator] falling back to simple rect ship');
  return simpleRectFallback(seed);
}

function tryGenerate(rng: SeededRandom, seed: number): FloorLayout | null {
  const grid = new Grid(GRID_WIDTH, GRID_HEIGHT);

  // --- Rectangular hull ---
  const sx0 = SHIP_MARGIN;
  const sz0 = SHIP_MARGIN;
  const sx1 = GRID_WIDTH - 1 - SHIP_MARGIN;
  const sz1 = GRID_HEIGHT - 1 - SHIP_MARGIN;
  if (sx1 - sx0 < 12 || sz1 - sz0 < 10) return null;

  // Fill ship footprint: interior floor, perimeter outer hull
  for (let z = sz0; z <= sz1; z++) {
    for (let x = sx0; x <= sx1; x++) {
      const onHull =
        x === sx0 || x === sx1 || z === sz0 || z === sz1;
      if (onHull) {
        grid.setKind(x, z, 'wall');
        const c = grid.get(x, z);
        c.outerHull = true;
        c.breachable = false;
      } else {
        grid.setKind(x, z, 'floor');
        const c = grid.get(x, z);
        c.outerHull = false;
        c.breachable = false;
      }
    }
  }

  // Interior region (inside hull)
  const interior: Rect = {
    x0: sx0 + 1,
    z0: sz0 + 1,
    x1: sx1 - 1,
    z1: sz1 - 1,
  };

  // Optional: main spine hallway (horizontal) for ship feel
  const spineZ = Math.floor((interior.z0 + interior.z1) / 2);
  const spineHalf = rng.next() < 0.5 ? 0 : 1; // 1 or 3 cell wide hall
  for (let x = interior.x0; x <= interior.x1; x++) {
    for (let dz = -spineHalf; dz <= spineHalf; dz++) {
      const z = spineZ + dz;
      if (z >= interior.z0 && z <= interior.z1) {
        grid.setKind(x, z, 'floor');
      }
    }
  }

  // Recursive subdivision of interior into rooms with interior walls + doors
  let partitionCount = 0;
  partitionCount += subdivide(grid, interior, rng, SUBDIVIDE_MAX_DEPTH);

  // Cross hallway (vertical) roughly mid-ship for more corridor structure
  if (rng.next() < 0.75) {
    const hallX = rng.int(
      interior.x0 + 4,
      Math.max(interior.x0 + 4, interior.x1 - 4),
    );
    for (let z = interior.z0; z <= interior.z1; z++) {
      // Don't erase outer hull
      if (grid.get(hallX, z).outerHull) continue;
      // Leave wall stubs occasionally for cover (skip making floor on some)
      if (grid.get(hallX, z).kind === 'wall' && grid.get(hallX, z).breachable) {
        // Open into corridor door-strip
        grid.setKind(hallX, z, 'floor');
        grid.get(hallX, z).breachable = false;
      } else if (grid.get(hallX, z).kind === 'floor') {
        // already floor
      } else {
        grid.setKind(hallX, z, 'floor');
      }
    }
  }

  // Tag every non-hull wall as interior + breachable
  tagInteriorWalls(grid);

  // Pre-tag a few outer-hull segments as charge-breachable (high risk)
  tagOuterHullBreachPoints(grid, sx0, sz0, sx1, sz1, rng);

  // Objectives: entry west, bomb mid/east, extract east
  const entry = pickFloorNear(
    grid,
    sx0 + 2,
    Math.floor((sz0 + sz1) / 2),
    interior,
    rng,
  );
  const extract = pickFloorNear(
    grid,
    sx1 - 2,
    Math.floor((sz0 + sz1) / 2) + rng.int(-3, 3),
    interior,
    rng,
  );
  const bomb = pickFloorNear(
    grid,
    Math.floor((sx0 + sx1) * 0.62),
    Math.floor((sz0 + sz1) / 2) + rng.int(-4, 4),
    interior,
    rng,
  );

  if (!entry || !bomb || !extract) return null;

  grid.get(entry.x, entry.z).entry = true;
  grid.get(bomb.x, bomb.z).bomb = true;
  grid.get(extract.x, extract.z).extract = true;
  grid.entry = entry;
  grid.bomb = bomb;
  grid.extract = extract;

  if (!grid.hasPath(grid.entry, grid.bomb)) return null;
  if (!grid.hasPath(grid.bomb, grid.extract)) return null;

  placeEnemySpawns(grid, rng);

  // roomCount estimate: partitions + 1
  const roomCount = Math.max(4, partitionCount + 1);

  return { grid, seed, roomCount };
}

/**
 * BSP-style split: place an interior wall with a door gap.
 * Returns number of wall partitions created.
 */
function subdivide(
  grid: Grid,
  rect: Rect,
  rng: SeededRandom,
  depth: number,
): number {
  const w = rect.x1 - rect.x0 + 1;
  const h = rect.z1 - rect.z0 + 1;
  if (depth <= 0) return 0;
  if (w < SUBDIVIDE_MIN_SIZE * 2 + 1 && h < SUBDIVIDE_MIN_SIZE * 2 + 1) {
    return 0;
  }

  // Prefer splitting the longer axis
  const splitVertical =
    w >= h
      ? w >= SUBDIVIDE_MIN_SIZE * 2 + 1
      : h < SUBDIVIDE_MIN_SIZE * 2 + 1
        ? true
        : false;
  // If both ok, randomize when roughly square
  const canV = w >= SUBDIVIDE_MIN_SIZE * 2 + 1;
  const canH = h >= SUBDIVIDE_MIN_SIZE * 2 + 1;
  let vertical = splitVertical;
  if (canV && canH) vertical = rng.next() < 0.5;
  else if (canV) vertical = true;
  else if (canH) vertical = false;
  else return 0;

  let count = 0;

  if (vertical) {
    const minSplit = rect.x0 + SUBDIVIDE_MIN_SIZE;
    const maxSplit = rect.x1 - SUBDIVIDE_MIN_SIZE;
    if (minSplit > maxSplit) return 0;
    const splitX = rng.int(minSplit, maxSplit);

    // Wall column with door gap(s)
    const doorZ = rng.int(rect.z0, rect.z1);
    const doorWidth = rng.next() < 0.35 ? 2 : 1; // occasional wider doorway / hall junction
    for (let z = rect.z0; z <= rect.z1; z++) {
      const cell = grid.get(splitX, z);
      if (cell.outerHull) continue;
      const inDoor =
        z >= doorZ && z < doorZ + doorWidth && z <= rect.z1;
      if (inDoor) {
        grid.setKind(splitX, z, 'floor');
        cell.breachable = false;
      } else {
        grid.setKind(splitX, z, 'wall');
        cell.outerHull = false;
        cell.breachable = true;
      }
    }
    count = 1;
    count += subdivide(
      grid,
      { x0: rect.x0, z0: rect.z0, x1: splitX - 1, z1: rect.z1 },
      rng,
      depth - 1,
    );
    count += subdivide(
      grid,
      { x0: splitX + 1, z0: rect.z0, x1: rect.x1, z1: rect.z1 },
      rng,
      depth - 1,
    );
  } else {
    const minSplit = rect.z0 + SUBDIVIDE_MIN_SIZE;
    const maxSplit = rect.z1 - SUBDIVIDE_MIN_SIZE;
    if (minSplit > maxSplit) return 0;
    const splitZ = rng.int(minSplit, maxSplit);

    const doorX = rng.int(rect.x0, rect.x1);
    const doorWidth = rng.next() < 0.35 ? 2 : 1;
    for (let x = rect.x0; x <= rect.x1; x++) {
      const cell = grid.get(x, splitZ);
      if (cell.outerHull) continue;
      const inDoor =
        x >= doorX && x < doorX + doorWidth && x <= rect.x1;
      if (inDoor) {
        grid.setKind(x, splitZ, 'floor');
        cell.breachable = false;
      } else {
        grid.setKind(x, splitZ, 'wall');
        cell.outerHull = false;
        cell.breachable = true;
      }
    }
    count = 1;
    count += subdivide(
      grid,
      { x0: rect.x0, z0: rect.z0, x1: rect.x1, z1: splitZ - 1 },
      rng,
      depth - 1,
    );
    count += subdivide(
      grid,
      { x0: rect.x0, z0: splitZ + 1, x1: rect.x1, z1: rect.z1 },
      rng,
      depth - 1,
    );
  }

  return count;
}

/** Ensure all non-hull walls are marked interior + breachable. */
function tagInteriorWalls(grid: Grid): void {
  grid.forEach((_x, _z, cell) => {
    if (cell.kind !== 'wall') return;
    if (cell.outerHull) {
      // Default: outer hull sealed unless explicitly tagged later
      if (!cell.breachable) cell.breachable = false;
      return;
    }
    cell.breachable = true;
    cell.outerHull = false;
  });
}

/**
 * Mark 2–4 outer hull wall cells as charge-breachable.
 * Prefer mid-edge segments (not corners) so openings feel like hull cuts.
 */
function tagOuterHullBreachPoints(
  grid: Grid,
  sx0: number,
  sz0: number,
  sx1: number,
  sz1: number,
  rng: SeededRandom,
): void {
  const candidates: GridPoint[] = [];

  // North / south edges (exclude corners)
  for (let x = sx0 + 2; x <= sx1 - 2; x++) {
    candidates.push({ x, z: sz0 });
    candidates.push({ x, z: sz1 });
  }
  // West / east edges
  for (let z = sz0 + 2; z <= sz1 - 2; z++) {
    candidates.push({ x: sx0, z });
    candidates.push({ x: sx1, z });
  }

  // Only keep actual outer hull walls adjacent to interior floor
  const valid = candidates.filter((p) => {
    const c = grid.get(p.x, p.z);
    if (c.kind !== 'wall' || !c.outerHull) return false;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dz] of dirs) {
      const n = grid.get(p.x + dx, p.z + dz);
      if (n.kind === 'floor' && !n.outerHull) return true;
    }
    return false;
  });

  for (let i = valid.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const t = valid[i];
    valid[i] = valid[j];
    valid[j] = t;
  }

  const count = Math.min(
    valid.length,
    rng.int(OUTER_HULL_BREACH_TAGS_MIN, OUTER_HULL_BREACH_TAGS_MAX),
  );
  for (let i = 0; i < count; i++) {
    const p = valid[i];
    const c = grid.get(p.x, p.z);
    c.breachable = true;
    c.outerHull = true;
  }
}

function pickFloorNear(
  grid: Grid,
  preferX: number,
  preferZ: number,
  bounds: Rect,
  rng: SeededRandom,
): GridPoint | null {
  const candidates: GridPoint[] = [];
  grid.forEach((x, z, cell) => {
    if (cell.kind !== 'floor') return;
    if (x < bounds.x0 || x > bounds.x1 || z < bounds.z0 || z > bounds.z1) {
      return;
    }
    candidates.push({ x, z });
  });
  if (candidates.length === 0) return null;

  // Sort by distance to preferred point, take from nearest 12 with rng
  candidates.sort((a, b) => {
    const da = Math.abs(a.x - preferX) + Math.abs(a.z - preferZ);
    const db = Math.abs(b.x - preferX) + Math.abs(b.z - preferZ);
    return da - db;
  });
  const pool = candidates.slice(0, Math.min(12, candidates.length));
  return pool[rng.int(0, pool.length - 1)];
}

function placeEnemySpawns(grid: Grid, rng: SeededRandom): void {
  const floors: GridPoint[] = [];
  grid.forEach((x, z, cell) => {
    if (cell.kind !== 'floor') return;
    if (cell.entry || cell.bomb || cell.extract) return;
    const dist =
      Math.abs(x - grid.entry.x) + Math.abs(z - grid.entry.z);
    if (dist < ENEMY_SPAWN_MIN_DIST) return;
    floors.push({ x, z });
  });

  for (let i = floors.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = floors[i];
    floors[i] = floors[j];
    floors[j] = tmp;
  }

  const n = Math.min(PROC_ENEMY_COUNT, floors.length);
  for (let i = 0; i < n; i++) {
    grid.get(floors[i].x, floors[i].z).enemySpawn = true;
  }
}

function simpleRectFallback(seed: number): FloorLayout {
  const grid = new Grid(GRID_WIDTH, GRID_HEIGHT);
  const sx0 = SHIP_MARGIN;
  const sz0 = SHIP_MARGIN;
  const sx1 = GRID_WIDTH - 1 - SHIP_MARGIN;
  const sz1 = GRID_HEIGHT - 1 - SHIP_MARGIN;

  for (let z = sz0; z <= sz1; z++) {
    for (let x = sx0; x <= sx1; x++) {
      const onHull = x === sx0 || x === sx1 || z === sz0 || z === sz1;
      grid.setKind(x, z, onHull ? 'wall' : 'floor');
      const c = grid.get(x, z);
      c.outerHull = onHull;
      c.breachable = false;
    }
  }
  // One interior wall with door
  const midX = Math.floor((sx0 + sx1) / 2);
  const doorZ = Math.floor((sz0 + sz1) / 2);
  for (let z = sz0 + 1; z <= sz1 - 1; z++) {
    if (z === doorZ) continue;
    grid.setKind(midX, z, 'wall');
    grid.get(midX, z).outerHull = false;
    grid.get(midX, z).breachable = true;
  }
  tagInteriorWalls(grid);

  grid.entry = { x: sx0 + 2, z: doorZ };
  grid.bomb = { x: midX + 2, z: doorZ };
  grid.extract = { x: sx1 - 2, z: doorZ };
  grid.setKind(grid.entry.x, grid.entry.z, 'floor');
  grid.setKind(grid.bomb.x, grid.bomb.z, 'floor');
  grid.setKind(grid.extract.x, grid.extract.z, 'floor');
  grid.get(grid.entry.x, grid.entry.z).entry = true;
  grid.get(grid.bomb.x, grid.bomb.z).bomb = true;
  grid.get(grid.extract.x, grid.extract.z).extract = true;
  if (grid.inBounds(grid.bomb.x, grid.bomb.z + 1)) {
    grid.get(grid.bomb.x, grid.bomb.z + 1).enemySpawn = true;
  }

  return { grid, seed, roomCount: 2 };
}
