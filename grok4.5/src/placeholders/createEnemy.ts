/**
 * Ranged enemy placeholder — orange/purple box + gun barrel.
 */

import * as THREE from 'three';
import { ENEMY_HEIGHT, ENEMY_RADIUS } from '../shared/constants';

export function createEnemy(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Enemy';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xe06030,
    emissive: 0x401008,
    metalness: 0.15,
    roughness: 0.55,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x6a2060,
    metalness: 0.2,
    roughness: 0.5,
  });
  const gunMat = new THREE.MeshStandardMaterial({
    color: 0x222228,
    metalness: 0.5,
    roughness: 0.4,
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(ENEMY_RADIUS * 1.8, ENEMY_HEIGHT * 0.7, ENEMY_RADIUS * 1.6),
    bodyMat,
  );
  body.position.y = ENEMY_HEIGHT * 0.4;
  root.add(body);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(ENEMY_RADIUS * 1.1, ENEMY_RADIUS * 1.0, ENEMY_RADIUS * 1.1),
    darkMat,
  );
  head.position.y = ENEMY_HEIGHT * 0.82;
  root.add(head);

  // Barrel points local −Z (same convention as player)
  const gun = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8),
    gunMat,
  );
  gun.rotation.x = Math.PI / 2;
  gun.position.set(0, ENEMY_HEIGHT * 0.55, -ENEMY_RADIUS - 0.2);
  root.add(gun);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(ENEMY_RADIUS * 1.2, 16),
    new THREE.MeshBasicMaterial({
      color: 0xe06030,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.02;
  root.add(disc);

  return root;
}
