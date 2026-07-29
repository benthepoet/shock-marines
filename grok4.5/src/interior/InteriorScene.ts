/**
 * Interior scene — Phase 5:
 * Outer-hull breach → permanent vacuum, suction, oxygen, mag-boots.
 */

import * as THREE from 'three';
import {
  BREACH_AGGRO_DURATION,
  BREACH_AGGRO_RADIUS,
  BREACH_CHARGE_COUNT,
  BREACH_PLACE_RANGE,
  CAMERA_ANGLE_DEGREES,
  CAMERA_FOLLOW_RATE,
  CAMERA_FRUSTUM_SIZE,
  CAMERA_HEIGHT,
  DEATH_RESTART_DELAY,
  INTERIOR_BACKGROUND_COLOR,
  OXYGEN_MAX,
} from '../shared/constants';
import type { GameManager } from '../game/GameManager';
import { getFrameInput } from '../shared/InputCommands';
import { inputReader } from '../input/InputReader';
import type { Phase1DebugSnapshot } from '../shared/types';
import type { WallAabb } from '../placeholders/createWall';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { BreachingCharge } from './BreachingCharge';
import { BreachSystem } from './Breach';
import { Grid, type GridPoint } from './Grid';
import { generateFloor, type FloorLayout } from './FloorGenerator';
import { buildFloorMeshes, type FloorMeshBundle } from './FloorMeshes';

export class InteriorScene {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly player: Player;
  private readonly enemies: Enemy[] = [];
  private readonly projectiles: Projectile[] = [];
  private readonly charges: BreachingCharge[] = [];
  private wallAabbs: WallAabb[] = [];
  private disposed = false;

  private layout: FloorLayout | null = null;
  private floorMeshes: FloorMeshBundle | null = null;
  private grid: Grid | null = null;
  private roomCount = 0;
  private pathOk = false;
  private breachableCount = 0;
  private chargesRemaining = BREACH_CHARGE_COUNT;
  private canPlant = false;
  private plantIsOuterHull = false;
  private fuseHud = 0;
  private readonly breachSystem = new BreachSystem();
  private elapsed = 0;

  angledCamera = false;
  private frustumSize = CAMERA_FRUSTUM_SIZE;

  private readonly camFollow = new THREE.Vector3(0, CAMERA_HEIGHT, 0);
  private readonly lookTarget = new THREE.Vector3(0, 0, 0);

  private moveArrow: THREE.ArrowHelper | null = null;
  private aimArrow: THREE.ArrowHelper | null = null;
  showStickArrows = true;

  private deathTimer = 0;
  private deathBanner: HTMLDivElement | null = null;
  private debugGridHelper: THREE.GridHelper | null = null;
  private readonly detonationFlashes: { light: THREE.PointLight; life: number }[] =
    [];

  constructor(private readonly game: GameManager) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(INTERIOR_BACKGROUND_COLOR);

    const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
    this.camera = new THREE.OrthographicCamera(
      (-this.frustumSize * aspect) / 2,
      (this.frustumSize * aspect) / 2,
      this.frustumSize / 2,
      -this.frustumSize / 2,
      0.1,
      200,
    );
    this.applyCameraPose(0, 0);

    const ambient = new THREE.AmbientLight(0xb0c0d0, 0.65);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(8, 20, 6);
    this.scene.add(key);

    // Dark void plane under the ship (visual only)
    const voidPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshBasicMaterial({ color: 0x06080e }),
    );
    voidPlane.rotation.x = -Math.PI / 2;
    voidPlane.position.y = -0.05;
    voidPlane.name = 'VoidPlane';
    this.scene.add(voidPlane);

    this.debugGridHelper = new THREE.GridHelper(80, 80, 0x2a3548, 0x1e2838);
    this.debugGridHelper.position.y = 0.02;
    this.debugGridHelper.name = 'DebugGrid';
    this.debugGridHelper.visible = this.game.showGrid;
    this.scene.add(this.debugGridHelper);

    this.player = new Player();
    this.scene.add(this.player.mesh);

    this.moveArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0.3, 0),
      1.5,
      0x44ff88,
      0.35,
      0.25,
    );
    this.aimArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0.5, 0),
      2.0,
      0xff6644,
      0.4,
      0.28,
    );
    this.scene.add(this.moveArrow);
    this.scene.add(this.aimArrow);

    this.deathBanner = document.createElement('div');
    this.deathBanner.id = 'death-banner';
    this.deathBanner.textContent = 'KIA — restarting…';
    Object.assign(this.deathBanner.style, {
      position: 'absolute',
      left: '50%',
      top: '40%',
      transform: 'translate(-50%, -50%)',
      color: '#ff6677',
      font: 'bold 28px system-ui, sans-serif',
      textShadow: '0 2px 8px #000',
      display: 'none',
      zIndex: '10',
      pointerEvents: 'none',
    } as CSSStyleDeclaration);
    document.getElementById('app')?.appendChild(this.deathBanner);

    // Build procedural floor for current seed
    this.rebuildFromSeed(this.game.seed);

    window.addEventListener('resize', this.handleResize);
  }

  mount(): void {
    inputReader.bind();
    console.log(
      '[InteriorScene] Phase 5 — outer hull breach / vacuum / oxygen / mag-boots',
    );
    console.log(
      '[InteriorScene] Warm walls = interior · Blue-glow hull = outer charge targets · B = mag-boots',
    );
  }

  /**
   * Regenerate layout from seed (debug GUI / seed change).
   */
  rebuildFromSeed(seed: number): void {
    this.clearProjectiles();
    this.clearEnemies();
    this.clearCharges();
    this.breachSystem.clear(this.scene);
    this.floorMeshes?.dispose();
    this.floorMeshes = null;

    this.layout = generateFloor(seed);
    this.grid = this.layout.grid;
    this.roomCount = this.layout.roomCount;
    this.chargesRemaining = BREACH_CHARGE_COUNT;

    this.pathOk =
      this.grid.hasPath(this.grid.entry, this.grid.bomb) &&
      this.grid.hasPath(this.grid.bomb, this.grid.extract);

    this.breachableCount = this.grid.countBreachable();

    this.floorMeshes = buildFloorMeshes(this.grid);
    this.scene.add(this.floorMeshes.group);
    this.wallAabbs = this.grid.buildWallAabbs();

    const spawn = this.grid.cellToWorld(this.grid.entry.x, this.grid.entry.z);
    this.player.reset(spawn.x, spawn.z);
    this.lookTarget.set(spawn.x, 0, spawn.z);
    this.camFollow.set(spawn.x, CAMERA_HEIGHT, spawn.z);

    this.spawnEnemiesFromGrid();
    this.deathTimer = 0;
    if (this.deathBanner) this.deathBanner.style.display = 'none';

    console.log(
      `[InteriorScene] layout seed=${seed} rooms=${this.roomCount} pathOk=${this.pathOk} breachable=${this.breachableCount} charges=${this.chargesRemaining}`,
    );
  }

  fixedUpdate(dt: number): void {
    if (this.disposed) return;

    this.updateMouseWorldAim();
    inputReader.playerPos = {
      x: this.player.position.x,
      z: this.player.position.z,
    };
    inputReader.poll();
    const input = getFrameInput();

    if (!this.player.alive) {
      this.deathTimer += dt;
      if (this.deathBanner) this.deathBanner.style.display = 'block';
      if (this.deathTimer >= DEATH_RESTART_DELAY) {
        this.restartEncounter();
      }
    } else {
      this.deathTimer = 0;
      if (this.deathBanner) this.deathBanner.style.display = 'none';
    }

    // Breaching target + plant
    const plantTarget = this.findPlantTarget();
    this.canPlant =
      !!plantTarget &&
      this.chargesRemaining > 0 &&
      this.player.alive &&
      !this.isCellCharged(plantTarget.x, plantTarget.z);
    this.plantIsOuterHull = false;
    if (plantTarget && this.grid) {
      this.plantIsOuterHull = this.grid.get(plantTarget.x, plantTarget.z).outerHull;
    }

    if (input.interactPressed && this.canPlant && plantTarget) {
      this.tryPlantCharge(plantTarget);
    }

    this.elapsed += dt;
    const playerResult = this.player.fixedUpdate(
      dt,
      input,
      this.wallAabbs,
      this.grid,
      this.breachSystem.holes,
    );
    if (playerResult.shot) this.addProjectile(playerResult.shot);
    if (playerResult.diedInSpace && this.deathBanner) {
      this.deathBanner.textContent = 'SUCKED INTO SPACE — restarting…';
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const enemyShot = enemy.fixedUpdate(
        dt,
        this.player.alive,
        this.player.position.x,
        this.player.position.z,
        this.wallAabbs,
        this.grid,
        this.breachSystem.holes,
      );
      if (enemyShot) this.addProjectile(enemyShot);
    }

    this.updateCharges(dt);
    this.updateDetonationFlashes(dt);
    this.updateProjectiles(dt);
    this.updateDebugArrows(input);
    this.game.phase1Debug = this.buildDebugSnapshot(input);
  }

  render(): void {
    if (this.disposed) return;

    const px = this.player.position.x;
    const pz = this.player.position.z;
    const followDt = 1 / 60;
    const t = 1 - Math.exp(-CAMERA_FOLLOW_RATE * followDt);
    this.lookTarget.x += (px - this.lookTarget.x) * t;
    this.lookTarget.z += (pz - this.lookTarget.z) * t;
    this.lookTarget.y = 0;

    this.applyCameraPose(this.lookTarget.x, this.lookTarget.z);
    this.breachSystem.renderTick(this.elapsed);

    if (this.debugGridHelper) {
      this.debugGridHelper.visible = this.game.showGrid;
    }

    // Vacuum visual: cooler clear color when player in vacuum
    if (this.player.inVacuum) {
      this.scene.background = new THREE.Color(0x061018);
    } else {
      this.scene.background = new THREE.Color(INTERIOR_BACKGROUND_COLOR);
    }

    this.game.renderer.render(this.scene, this.camera);
  }

  setAngledCamera(enabled: boolean): void {
    this.angledCamera = enabled;
  }

  /** Reset combat + restore walls on same seed. */
  restartEncounter(): void {
    const seed = this.layout?.seed ?? this.game.seed;
    this.rebuildFromSeed(seed);
    if (this.deathBanner) {
      this.deathBanner.style.display = 'none';
      this.deathBanner.textContent = 'KIA — restarting…';
    }
    console.log('[InteriorScene] encounter restarted (same seed, walls restored)');
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('resize', this.handleResize);
    inputReader.unbind();
    this.clearProjectiles();
    this.clearEnemies();
    this.clearCharges();
    this.breachSystem.clear(this.scene);
    this.floorMeshes?.dispose();
    this.player.dispose();
    this.deathBanner?.remove();
    this.deathBanner = null;
    this.scene.clear();
  }

  private tryPlantCharge(cell: GridPoint): void {
    if (!this.grid || this.chargesRemaining <= 0) return;
    if (this.isCellCharged(cell.x, cell.z)) return;

    const c = this.grid.get(cell.x, cell.z);
    if (c.kind !== 'wall' || !c.breachable) return;

    const world = this.grid.cellToWorld(cell.x, cell.z);
    const charge = new BreachingCharge(cell, world.x, world.z);
    this.charges.push(charge);
    this.scene.add(charge.mesh);
    this.chargesRemaining -= 1;

    // Vulnerability window: nearby enemies push / flank
    this.aggroNearbyEnemies(world.x, world.z);

    console.log(
      `[Breach] charge planted at (${cell.x},${cell.z}) fuse=${charge.fuseRemaining.toFixed(1)}s remaining charges=${this.chargesRemaining}`,
    );
  }

  private aggroNearbyEnemies(wx: number, wz: number): void {
    let n = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.position.x - wx, e.position.z - wz);
      if (d <= BREACH_AGGRO_RADIUS) {
        e.triggerAggression(BREACH_AGGRO_DURATION);
        n++;
      }
    }
    if (n > 0) {
      console.log(`[Breach] ${n} enemies aggressive for ${BREACH_AGGRO_DURATION}s`);
    }
  }

  private updateCharges(dt: number): void {
    this.fuseHud = 0;
    for (let i = this.charges.length - 1; i >= 0; i--) {
      const ch = this.charges[i];
      if (ch.state === 'fusing') {
        this.fuseHud = Math.max(this.fuseHud, ch.fuseRemaining);
      }
      const detonated = ch.fixedUpdate(dt);
      if (detonated) {
        this.detonateCharge(ch);
        this.scene.remove(ch.mesh);
        ch.dispose();
        this.charges.splice(i, 1);
      } else if (ch.state !== 'fusing') {
        this.scene.remove(ch.mesh);
        ch.dispose();
        this.charges.splice(i, 1);
      }
    }
  }

  private detonateCharge(ch: BreachingCharge): void {
    if (!this.grid) return;
    const kind = this.grid.openWall(ch.cell.x, ch.cell.z);
    if (!kind) {
      console.warn('[Breach] detonate failed — cell not openable');
      return;
    }

    if (kind === 'outer') {
      // Permanent hull hole + vacuum flood
      this.breachSystem.addHole(
        ch.cell,
        ch.worldX,
        ch.worldZ,
        this.scene,
      );
      const marked = this.grid.floodDepressurize(ch.cell.x, ch.cell.z);
      console.log(
        `[Hull] OUTER breach at (${ch.cell.x},${ch.cell.z}) — vacuum marked ${marked} cells (permanent)`,
      );
      if (this.deathBanner) {
        // brief flash message via console; banner only on death
      }
    } else {
      // Interior open may expand existing vacuum into newly connected rooms
      const expanded = this.grid.expandDepressurization();
      if (expanded > 0) {
        console.log(`[Hull] vacuum expanded into ${expanded} new cells`);
      }
      console.log(
        `[Breach] interior wall opened at (${ch.cell.x},${ch.cell.z})`,
      );
    }

    this.breachableCount = this.grid.countBreachable();
    this.rebuildFloorMeshesOnly();
    this.wallAabbs = this.grid.buildWallAabbs();

    const flashColor = kind === 'outer' ? 0x66aaff : 0xffaa44;
    const flash = new THREE.PointLight(flashColor, 6, 12);
    flash.position.set(ch.worldX, 1.5, ch.worldZ);
    this.scene.add(flash);
    this.detonationFlashes.push({ light: flash, life: kind === 'outer' ? 0.35 : 0.15 });
  }

  private updateDetonationFlashes(dt: number): void {
    for (let i = this.detonationFlashes.length - 1; i >= 0; i--) {
      const f = this.detonationFlashes[i];
      f.life -= dt;
      f.light.intensity = Math.max(0, f.life * 30);
      if (f.life <= 0) {
        this.scene.remove(f.light);
        this.detonationFlashes.splice(i, 1);
      }
    }
  }

  private rebuildFloorMeshesOnly(): void {
    if (!this.grid) return;
    this.floorMeshes?.dispose();
    this.floorMeshes = buildFloorMeshes(this.grid);
    this.scene.add(this.floorMeshes.group);
  }

  private findPlantTarget(): GridPoint | null {
    if (!this.grid || !this.player.alive) return null;

    const px = this.player.position.x;
    const pz = this.player.position.z;
    const facing = this.player.facingDirection;
    let best: GridPoint | null = null;
    let bestScore = Infinity;

    this.grid.forEach((cx, cz, cell) => {
      if (cell.kind !== 'wall' || !cell.breachable) return;
      if (this.isCellCharged(cx, cz)) return;
      const w = this.grid!.cellToWorld(cx, cz);
      const dx = w.x - px;
      const dz = w.z - pz;
      const dist = Math.hypot(dx, dz);
      if (dist > BREACH_PLACE_RANGE) return;

      // Prefer walls in front of facing
      const nd = dist || 1;
      const dot = (dx / nd) * facing.x + (dz / nd) * facing.z;
      // Score: prefer close + in front
      const score = dist - Math.max(0, dot) * 1.2;
      if (score < bestScore) {
        bestScore = score;
        best = { x: cx, z: cz };
      }
    });

    return best;
  }

  private isCellCharged(x: number, z: number): boolean {
    return this.charges.some(
      (c) => c.state === 'fusing' && c.cell.x === x && c.cell.z === z,
    );
  }

  private clearCharges(): void {
    for (const c of this.charges) {
      this.scene.remove(c.mesh);
      c.dispose();
    }
    this.charges.length = 0;
  }

  private spawnEnemiesFromGrid(): void {
    if (!this.grid) return;
    this.grid.forEach((cx, cz, cell) => {
      if (!cell.enemySpawn) return;
      const w = this.grid!.cellToWorld(cx, cz);
      const e = new Enemy(w.x, w.z);
      this.enemies.push(e);
      this.scene.add(e.mesh);
    });
  }

  private clearEnemies(): void {
    for (const e of this.enemies) {
      this.scene.remove(e.mesh);
      e.dispose();
    }
    this.enemies.length = 0;
  }

  private addProjectile(p: Projectile): void {
    this.projectiles.push(p);
    this.scene.add(p.mesh);
  }

  private clearProjectiles(): void {
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
      p.dispose();
    }
    this.projectiles.length = 0;
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.alive) {
        this.scene.remove(p.mesh);
        p.dispose();
        this.projectiles.splice(i, 1);
        continue;
      }

      p.fixedUpdate(dt, this.wallAabbs);
      if (!p.alive) {
        this.scene.remove(p.mesh);
        p.dispose();
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.team === 'player') {
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          if (
            circleHit(
              p.x,
              p.z,
              p.radius,
              enemy.position.x,
              enemy.position.z,
              enemy.radius,
            )
          ) {
            enemy.takeDamage(p.damage);
            p.kill();
            break;
          }
        }
      } else if (p.team === 'enemy' && this.player.alive) {
        if (
          circleHit(
            p.x,
            p.z,
            p.radius,
            this.player.position.x,
            this.player.position.z,
            this.player.radius,
          )
        ) {
          this.player.takeDamage(p.damage);
          p.kill();
        }
      }

      if (!p.alive) {
        this.scene.remove(p.mesh);
        p.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateDebugArrows(input: ReturnType<typeof getFrameInput>): void {
    if (!this.moveArrow || !this.aimArrow) return;
    this.moveArrow.visible = this.showStickArrows;
    this.aimArrow.visible = this.showStickArrows;
    const origin = this.player.position;
    this.moveArrow.position.set(origin.x, 0.3, origin.z);
    this.aimArrow.position.set(origin.x, 0.5, origin.z);

    const moveLen = Math.hypot(input.moveX, input.moveZ);
    if (moveLen > 0.01) {
      this.moveArrow.setDirection(
        new THREE.Vector3(input.moveX, 0, input.moveZ).normalize(),
      );
      this.moveArrow.setLength(1.2 + moveLen * 1.2, 0.35, 0.25);
    } else {
      this.moveArrow.setLength(0.01, 0.01, 0.01);
    }

    const dir = this.player.facingDirection;
    if (dir.lengthSq() > 1e-6) {
      this.aimArrow.setDirection(dir.normalize());
    }
    this.aimArrow.setLength(input.aimActive || input.fire ? 2.0 : 1.6, 0.4, 0.28);
  }

  private applyCameraPose(tx: number, tz: number): void {
    if (this.angledCamera) {
      const rad = (CAMERA_ANGLE_DEGREES * Math.PI) / 180;
      const back = Math.sin(rad) * CAMERA_HEIGHT * 0.55;
      const height = Math.cos(rad) * CAMERA_HEIGHT;
      this.camFollow.set(tx, height, tz + back);
      this.camera.position.copy(this.camFollow);
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(tx, 0, tz);
    } else {
      this.camFollow.set(tx, CAMERA_HEIGHT, tz);
      this.camera.position.copy(this.camFollow);
      this.camera.up.set(0, 0, -1);
      this.camera.lookAt(tx, 0, tz);
    }
    this.camera.updateProjectionMatrix();
  }

  private updateMouseWorldAim(): void {
    const mouse = inputReader.clientMouse;
    if (!mouse.active) {
      inputReader.mouseWorldAim = null;
      return;
    }
    const ndcX = (mouse.x / window.innerWidth) * 2 - 1;
    const ndcY = -(mouse.y / window.innerHeight) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hit)) {
      inputReader.mouseWorldAim = { x: hit.x, z: hit.z };
    }
  }

  private buildDebugSnapshot(
    input: ReturnType<typeof getFrameInput>,
  ): Phase1DebugSnapshot {
    const vx = this.player.velocity.x;
    const vz = this.player.velocity.z;
    const aliveEnemies = this.enemies.filter((e) => e.alive).length;
    return {
      velX: vx,
      velZ: vz,
      speed: Math.hypot(vx, vz),
      posX: this.player.position.x,
      posZ: this.player.position.z,
      moveX: input.moveX,
      moveZ: input.moveZ,
      aimX: input.aimX,
      aimZ: input.aimZ,
      rawMoveX: input.rawMoveX,
      rawMoveY: input.rawMoveY,
      rawAimX: input.rawAimX,
      rawAimY: input.rawAimY,
      inputSource: input.source,
      facingDeg: (this.player.facing * 180) / Math.PI,
      fire: input.fire,
      playerHealth: this.player.health,
      playerAlive: this.player.alive,
      enemyCount: aliveEnemies,
      projectileCount: this.projectiles.length,
      roomCount: this.roomCount,
      pathOk: this.pathOk,
      breachableCount: this.breachableCount,
      layoutSeed: this.layout?.seed ?? this.game.seed,
      charges: this.chargesRemaining,
      activeCharges: this.charges.filter((c) => c.state === 'fusing').length,
      fuseRemaining: this.fuseHud,
      canPlant: this.canPlant,
      oxygen: this.player.oxygen,
      oxygenMax: OXYGEN_MAX,
      inVacuum: this.player.inVacuum,
      magBoots: this.player.magBoots,
      hullBreaches: this.breachSystem.holes.length,
      plantIsOuterHull: this.plantIsOuterHull,
    };
  }

  private readonly handleResize = (): void => {
    const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
    this.camera.left = (-this.frustumSize * aspect) / 2;
    this.camera.right = (this.frustumSize * aspect) / 2;
    this.camera.top = this.frustumSize / 2;
    this.camera.bottom = -this.frustumSize / 2;
    this.camera.updateProjectionMatrix();
  };
}

function circleHit(
  ax: number,
  az: number,
  ar: number,
  bx: number,
  bz: number,
  br: number,
): boolean {
  const dx = ax - bx;
  const dz = az - bz;
  const r = ar + br;
  return dx * dx + dz * dz <= r * r;
}
