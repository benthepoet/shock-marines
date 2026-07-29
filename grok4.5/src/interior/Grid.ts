/**
 * 2D grid driving wall/floor mesh placement and collision.
 */

import { CELL_SIZE } from '../shared/constants';
import type { WallAabb } from '../placeholders/createWall';

export type CellKind = 'void' | 'floor' | 'wall';

export interface Cell {
  kind: CellKind;
  /** Player spawn / entry room marker. */
  entry: boolean;
  /** Bomb objective location (not plantable until Phase 6). */
  bomb: boolean;
  /** Extraction zone marker (not active until Phase 6). */
  extract: boolean;
  /**
   * Wall openable with a breaching charge.
   * Interior walls: always. Outer hull: only pre-tagged segments.
   */
  breachable: boolean;
  /** Outer hull (perimeter). Opening a breachable hull cell causes vacuum. */
  outerHull: boolean;
  /** Floor (or opened cell) is depressurized — permanent once set. */
  depressurized: boolean;
  /** Suggested enemy spawn. */
  enemySpawn: boolean;
}

export interface GridPoint {
  x: number;
  z: number;
}

function emptyCell(): Cell {
  return {
    kind: 'void',
    entry: false,
    bomb: false,
    extract: false,
    breachable: false,
    outerHull: false,
    depressurized: false,
    enemySpawn: false,
  };
}

export class Grid {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  private readonly cells: Cell[];

  entry: GridPoint = { x: 0, z: 0 };
  bomb: GridPoint = { x: 0, z: 0 };
  extract: GridPoint = { x: 0, z: 0 };

  constructor(width: number, height: number, cellSize: number = CELL_SIZE) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cells = new Array(width * height);
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = emptyCell();
    }
  }

  inBounds(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x < this.width && z < this.height;
  }

  index(x: number, z: number): number {
    return z * this.width + x;
  }

  get(x: number, z: number): Cell {
    if (!this.inBounds(x, z)) {
      return emptyCell();
    }
    return this.cells[this.index(x, z)];
  }

  setKind(x: number, z: number, kind: CellKind): void {
    if (!this.inBounds(x, z)) return;
    this.cells[this.index(x, z)].kind = kind;
  }

  /**
   * Open a wall cell into walkable floor (breaching).
   * @returns true if a wall was opened
   */
  /**
   * Open a breachable wall into floor.
   * Outer hull may open only if tagged breachable (charge-only rule).
   * @returns 'interior' | 'outer' | null
   */
  openWall(x: number, z: number): 'interior' | 'outer' | null {
    if (!this.inBounds(x, z)) return null;
    const cell = this.cells[this.index(x, z)];
    if (cell.kind !== 'wall' || !cell.breachable) return null;
    const wasOuter = cell.outerHull;
    cell.kind = 'floor';
    cell.breachable = false;
    // Outer hull opening becomes a hole into space (floor tile at edge for pathing)
    if (wasOuter) {
      cell.depressurized = true;
    }
    return wasOuter ? 'outer' : 'interior';
  }

  isDepressurizedWorld(wx: number, wz: number): boolean {
    const c = this.worldToCell(wx, wz);
    return this.get(c.x, c.z).depressurized;
  }

  /**
   * Flood-fill floor cells from seed with depressurized=true.
   * Walls block; stops at non-floor.
   */
  floodDepressurize(seedX: number, seedZ: number): number {
    const qx: number[] = [];
    const qz: number[] = [];
    if (this.inBounds(seedX, seedZ) && this.get(seedX, seedZ).kind === 'floor') {
      qx.push(seedX);
      qz.push(seedZ);
    }
    // Also seed from floor neighbors of a hole cell
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dz] of dirs) {
      const nx = seedX + dx;
      const nz = seedZ + dz;
      if (this.inBounds(nx, nz) && this.get(nx, nz).kind === 'floor') {
        qx.push(nx);
        qz.push(nz);
      }
    }

    let marked = 0;
    const seen = new Set<number>();
    let head = 0;
    while (head < qx.length) {
      const x = qx[head];
      const z = qz[head];
      head++;
      const i = this.index(x, z);
      if (seen.has(i)) continue;
      seen.add(i);
      const cell = this.get(x, z);
      if (cell.kind !== 'floor') continue;
      if (!cell.depressurized) {
        cell.depressurized = true;
        marked++;
      }
      for (const [dx, dz] of dirs) {
        const nx = x + dx;
        const nz = z + dz;
        if (!this.inBounds(nx, nz)) continue;
        if (this.get(nx, nz).kind !== 'floor') continue;
        const ni = this.index(nx, nz);
        if (!seen.has(ni)) {
          qx.push(nx);
          qz.push(nz);
        }
      }
    }
    return marked;
  }

  /**
   * Expand vacuum into any newly connected floor regions
   * (call after interior walls open).
   */
  expandDepressurization(): number {
    let total = 0;
    const seeds: GridPoint[] = [];
    this.forEach((x, z, cell) => {
      if (cell.kind === 'floor' && cell.depressurized) {
        seeds.push({ x, z });
      }
    });
    for (const s of seeds) {
      total += this.floodDepressurize(s.x, s.z);
    }
    return total;
  }

  /**
   * Grid line-of-sight between world positions (cell-step ray).
   * Blocked by wall cells. Floor/void are clear.
   */
  hasLineOfSight(wx0: number, wz0: number, wx1: number, wz1: number): boolean {
    const a = this.worldToCell(wx0, wz0);
    const b = this.worldToCell(wx1, wz1);
    return this.hasLineOfSightCells(a.x, a.z, b.x, b.z);
  }

  hasLineOfSightCells(
    x0: number,
    z0: number,
    x1: number,
    z1: number,
  ): boolean {
    // Supercover / Bresenham-style: visit cells along the segment
    let x = x0;
    let z = z0;
    const dx = Math.abs(x1 - x0);
    const dz = Math.abs(z1 - z0);
    const sx = x0 < x1 ? 1 : -1;
    const sz = z0 < z1 ? 1 : -1;
    let err = dx - dz;

    // Skip start cell; block if we hit a wall before reaching end
    while (x !== x1 || z !== z1) {
      const e2 = 2 * err;
      if (e2 > -dz) {
        err -= dz;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        z += sz;
      }
      if (x === x1 && z === z1) return true;
      if (!this.inBounds(x, z)) return false;
      if (this.get(x, z).kind === 'wall') return false;
    }
    return true;
  }

  /**
   * Find a nearby floor cell that has no LOS to the player and sits
   * next to a wall (simple cover). Returns null if none found.
   */
  findCoverNear(
    fromWx: number,
    fromWz: number,
    playerWx: number,
    playerWz: number,
    maxSteps = 14,
  ): GridPoint | null {
    const start = this.worldToCell(fromWx, fromWz);
    const player = this.worldToCell(playerWx, playerWz);
    if (!this.isWalkable(start.x, start.z)) return null;

    const key = (x: number, z: number) => z * this.width + x;
    const visited = new Uint8Array(this.width * this.height);
    const qx: number[] = [start.x];
    const qz: number[] = [start.z];
    const qd: number[] = [0];
    visited[key(start.x, start.z)] = 1;
    let head = 0;

    let best: GridPoint | null = null;
    let bestScore = -Infinity;

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    while (head < qx.length) {
      const cx = qx[head];
      const cz = qz[head];
      const dist = qd[head];
      head++;

      const los = this.hasLineOfSightCells(cx, cz, player.x, player.z);
      const wallAdj = this.countWallNeighbors(cx, cz);
      if (!los && wallAdj > 0) {
        // Prefer cover closer to current pos, with more wall neighbors
        const score = wallAdj * 3 - dist;
        if (score > bestScore) {
          bestScore = score;
          best = { x: cx, z: cz };
        }
      }

      if (dist >= maxSteps) continue;
      for (const [dx, dz] of dirs) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (!this.inBounds(nx, nz)) continue;
        const i = key(nx, nz);
        if (visited[i]) continue;
        if (!this.isWalkable(nx, nz)) continue;
        visited[i] = 1;
        qx.push(nx);
        qz.push(nz);
        qd.push(dist + 1);
      }
    }

    return best;
  }

  countWallNeighbors(x: number, z: number): number {
    let n = 0;
    if (this.get(x + 1, z).kind === 'wall') n++;
    if (this.get(x - 1, z).kind === 'wall') n++;
    if (this.get(x, z + 1).kind === 'wall') n++;
    if (this.get(x, z - 1).kind === 'wall') n++;
    return n;
  }

  /** Count remaining breachable wall cells. */
  countBreachable(): number {
    let n = 0;
    this.forEach((_x, _z, cell) => {
      if (cell.kind === 'wall' && cell.breachable) n++;
    });
    return n;
  }

  /** World-space center of cell (x, z). Grid origin at map center. */
  cellToWorld(cx: number, cz: number): { x: number; z: number } {
    const x = (cx - this.width * 0.5 + 0.5) * this.cellSize;
    const z = (cz - this.height * 0.5 + 0.5) * this.cellSize;
    return { x, z };
  }

  /** Nearest cell for a world position. */
  worldToCell(wx: number, wz: number): GridPoint {
    const cx = Math.floor(wx / this.cellSize + this.width * 0.5);
    const cz = Math.floor(wz / this.cellSize + this.height * 0.5);
    return {
      x: clamp(cx, 0, this.width - 1),
      z: clamp(cz, 0, this.height - 1),
    };
  }

  isWalkable(x: number, z: number): boolean {
    return this.get(x, z).kind === 'floor';
  }

  /** Axis-aligned wall boxes for circle collision. */
  buildWallAabbs(): WallAabb[] {
    const aabbs: WallAabb[] = [];
    const half = this.cellSize * 0.5;
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const c = this.get(x, z);
        if (c.kind !== 'wall') continue;
        const w = this.cellToWorld(x, z);
        aabbs.push({
          minX: w.x - half,
          maxX: w.x + half,
          minZ: w.z - half,
          maxZ: w.z + half,
        });
      }
    }
    return aabbs;
  }

  forEach(fn: (x: number, z: number, cell: Cell) => void): void {
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        fn(x, z, this.get(x, z));
      }
    }
  }

  /** BFS walkability from start to goal on floor cells. */
  hasPath(start: GridPoint, goal: GridPoint): boolean {
    if (!this.isWalkable(start.x, start.z) || !this.isWalkable(goal.x, goal.z)) {
      return false;
    }
    const key = (x: number, z: number) => z * this.width + x;
    const visited = new Uint8Array(this.width * this.height);
    const qx: number[] = [start.x];
    const qz: number[] = [start.z];
    visited[key(start.x, start.z)] = 1;
    let head = 0;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    while (head < qx.length) {
      const cx = qx[head];
      const cz = qz[head];
      head++;
      if (cx === goal.x && cz === goal.z) return true;
      for (const [dx, dz] of dirs) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (!this.inBounds(nx, nz)) continue;
        const i = key(nx, nz);
        if (visited[i]) continue;
        if (!this.isWalkable(nx, nz)) continue;
        visited[i] = 1;
        qx.push(nx);
        qz.push(nz);
      }
    }
    return false;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
