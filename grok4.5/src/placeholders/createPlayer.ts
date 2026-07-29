/**
 * Player placeholder: stacked primitives + clear facing indicator.
 * Bright cyan silhouette for top-down readability.
 */

import * as THREE from 'three';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../shared/constants';

export function createPlayer(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Player';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x33e0ff,
    emissive: 0x0a3340,
    metalness: 0.1,
    roughness: 0.55,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1a6a7a,
    metalness: 0.2,
    roughness: 0.5,
  });
  const aimMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x88ffff,
    emissiveIntensity: 0.6,
    metalness: 0.1,
    roughness: 0.4,
  });

  // Body capsule approximation: cylinder + spheres
  const torsoH = PLAYER_HEIGHT * 0.55;
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(PLAYER_RADIUS * 0.85, PLAYER_RADIUS * 0.95, torsoH, 12),
    bodyMat,
  );
  torso.position.y = PLAYER_HEIGHT * 0.35;
  torso.castShadow = false;
  root.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(PLAYER_RADIUS * 0.55, 12, 10),
    bodyMat,
  );
  head.position.y = PLAYER_HEIGHT * 0.78;
  root.add(head);

  // Shoulder block for silhouette
  const shoulders = new THREE.Mesh(
    new THREE.BoxGeometry(PLAYER_RADIUS * 2.1, 0.25, PLAYER_RADIUS * 0.9),
    darkMat,
  );
  shoulders.position.y = PLAYER_HEIGHT * 0.55;
  root.add(shoulders);

  // Facing chevron / barrel — points toward local −Z (forward after rotation)
  const aimMarker = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.55, 6),
    aimMat,
  );
  aimMarker.rotation.x = Math.PI / 2; // point along -Z after rot
  aimMarker.position.set(0, PLAYER_HEIGHT * 0.45, -PLAYER_RADIUS - 0.25);
  root.add(aimMarker);

  // Ground disc for position readability under top-down
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(PLAYER_RADIUS * 1.15, 20),
    new THREE.MeshBasicMaterial({
      color: 0x33e0ff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.02;
  root.add(disc);

  return root;
}
