/**
 * Shared constants.
 * Phase 1: foundation + movement / camera feel starting values.
 * Feel numbers are starting points for owner gamepad sign-off (not final).
 */

/** Default procedural seed (can be changed via lil-gui). */
export const DEFAULT_SEED = 12345;

/** Default time scale (1 = real time). */
export const DEFAULT_TIME_SCALE = 1;

/** Clear color for the Interior scene (dark ship-void). */
export const INTERIOR_BACKGROUND_COLOR = 0x0b0e14;

/** Fixed simulation timestep in seconds (authoritative for game logic). */
export const FIXED_TIMESTEP = 1 / 60;

/** Max accumulated fixed steps per frame (spiral-of-death guard). */
export const MAX_FIXED_STEPS_PER_FRAME = 5;

// --- Scale (from prototype-plan) ---
/** 1 unit ≈ 1 meter */
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_RADIUS = 0.4;
export const WALL_HEIGHT = 2.75;

// --- Movement feel (starting values — Phase 1 quality gate) ---
/** Max walk speed on XZ plane (m/s). */
export const MOVE_MAX_SPEED = 7.0;
/** Acceleration toward stick target velocity (m/s²). */
export const MOVE_ACCELERATION = 55.0;
/** Deceleration / friction when stick is released (m/s²). */
export const MOVE_FRICTION = 45.0;
/** Radial stick deadzone (both sticks). */
export const STICK_DEADZONE = 0.18;
/**
 * Stick response exponent after deadzone remap.
 * 1 = linear; >1 = finer near center (less twitchy aim).
 */
export const STICK_RESPONSE_EXPONENT = 1.35;
/**
 * Right-stick aim deadzone (raw magnitude).
 * Outside this, facing uses a unit direction so the stick can spin a full 360°.
 * (Movement still uses STICK_DEADZONE + response curve.)
 */
export const AIM_STICK_DEADZONE = 0.2;

// --- Camera ---
/** Orthographic vertical frustum size (world units). */
export const CAMERA_FRUSTUM_SIZE = 22;
/** Camera height above ground (top-down). */
export const CAMERA_HEIGHT = 24;
/** Smooth follow rate (higher = snappier). Used as lerp factor per second. */
export const CAMERA_FOLLOW_RATE = 10;
/** Default slight pitch angle in degrees when “angled camera” is on. */
export const CAMERA_ANGLE_DEGREES = 18;

// --- Phase 2 combat (starting values — owner feel gate) ---
export const PLAYER_MAX_HEALTH = 100;

/** Standard Rifle */
export const RIFLE_DAMAGE = 22;
/** Shots per second while trigger held. */
export const RIFLE_FIRE_RATE = 7;
export const RIFLE_PROJECTILE_SPEED = 38;
export const RIFLE_PROJECTILE_LIFETIME = 1.1;
export const RIFLE_PROJECTILE_RADIUS = 0.12;
/** Spawn offset along facing from player center. */
export const RIFLE_MUZZLE_OFFSET = 0.75;
export const RIFLE_MUZZLE_HEIGHT = 1.0;

/** Ranged enemy — tuned so standing still is pressuring. */
export const ENEMY_MAX_HEALTH = 70;
export const ENEMY_RADIUS = 0.45;
export const ENEMY_HEIGHT = 1.7;
export const ENEMY_MOVE_SPEED = 2.8;
export const ENEMY_PREFERRED_RANGE = 9;
export const ENEMY_FIRE_RANGE = 16;
export const ENEMY_DAMAGE = 14;
export const ENEMY_FIRE_RATE = 1.35;
export const ENEMY_PROJECTILE_SPEED = 16;
export const ENEMY_PROJECTILE_LIFETIME = 1.5;
export const ENEMY_PROJECTILE_RADIUS = 0.15;
export const ENEMY_AIM_HEIGHT = 1.0;

/** Seconds of invuln after taking a hit (player only). */
export const PLAYER_HIT_IFRAME = 0.12;

/** Seconds before auto-restart after player death. */
export const DEATH_RESTART_DELAY = 1.4;

// --- Phase 3/4 procedural floor (rectangular subdivided ship) ---
/** World meters per grid cell. */
export const CELL_SIZE = 2.0;
/** Grid dimensions in cells. */
export const GRID_WIDTH = 36;
export const GRID_HEIGHT = 28;
/** Empty margin around the rectangular hull. */
export const SHIP_MARGIN = 2;
/** Min room half-size before BSP stops splitting (cells). */
export const SUBDIVIDE_MIN_SIZE = 3;
/** Max BSP depth for interior partitions. */
export const SUBDIVIDE_MAX_DEPTH = 5;
/** Enemy count to place on floor cells away from entry. */
export const PROC_ENEMY_COUNT = 5;
/** Min cell distance from entry for enemy spawns. */
export const ENEMY_SPAWN_MIN_DIST = 5;
/** How long enemies stay in “seek cover” after taking damage. */
export const ENEMY_COVER_DURATION = 2.8;
/** Max grid steps when searching for cover. */
export const ENEMY_COVER_SEARCH_STEPS = 12;

// --- Phase 4 breaching ---
/** Charges carried at start of a run / layout. */
export const BREACH_CHARGE_COUNT = 3;
/** Fuse duration after place (seconds). */
export const BREACH_FUSE_TIME = 2.0;
/** Max distance from player to breachable wall center to plant. */
export const BREACH_PLACE_RANGE = 2.4;
/** How close enemies must be to react to a plant. */
export const BREACH_AGGRO_RADIUS = 14;
/** Aggression duration on nearby enemies. */
export const BREACH_AGGRO_DURATION = 3.5;
/** Move speed multiplier while aggressive. */
export const ENEMY_AGGRO_SPEED_MULT = 1.85;
/** Fire rate multiplier while aggressive. */
export const ENEMY_AGGRO_FIRE_MULT = 1.6;
/** Preferred range while aggressive (push closer). */
export const ENEMY_AGGRO_PREFERRED_RANGE = 4.5;
/** Preferred stand-off when not aggressive and have LOS. */
export const ENEMY_STAND_RANGE = 7.5;

// --- Phase 5 outer hull / vacuum ---
/** How many outer-hull segments pre-tagged as charge-breachable. */
export const OUTER_HULL_BREACH_TAGS_MIN = 2;
export const OUTER_HULL_BREACH_TAGS_MAX = 4;
/** Suction acceleration toward hull hole (m/s²) in vacuum. */
export const SUCTION_ACCEL = 22;
/** Distance falloff: suction full within this range of hole, fades after. */
export const SUCTION_FULL_RANGE = 6;
export const SUCTION_MAX_RANGE = 22;
/** Reach hole center within this distance → sucked into space. */
export const SPACE_SUCK_RADIUS = 0.85;
/** Player oxygen reserve (seconds of idle equivalent at base drain). */
export const OXYGEN_MAX = 18;
/** Base oxygen drain per second while in vacuum (idle). */
export const OXYGEN_DRAIN_IDLE = 0.55;
/** Extra drain while moving (scaled by speed / max). */
export const OXYGEN_DRAIN_MOVE = 1.4;
/** Extra drain while firing. */
export const OXYGEN_DRAIN_FIRE = 1.1;
/** HP damage per second when oxygen is empty in vacuum. */
export const OXYGEN_EMPTY_DPS = 35;
/** Mag-boots: suction force multiplier while active. */
export const MAGBOOT_SUCTION_MULT = 0.12;
/** Mag-boots: move speed multiplier while active. */
export const MAGBOOT_MOVE_MULT = 0.42;
