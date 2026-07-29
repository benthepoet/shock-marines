/**
 * Breaching charge placeholder — glowing box + fuse timer disc.
 */

import * as THREE from 'three';

export interface ChargeMesh {
  root: THREE.Group;
  /** Fill mesh scale.x used as fuse remaining (0–1). */
  fuseFill: THREE.Mesh;
  bodyMat: THREE.MeshStandardMaterial;
}

export function createCharge(): ChargeMesh {
  const root = new THREE.Group();
  root.name = 'BreachingCharge';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xffaa22,
    emissive: 0xff6600,
    emissiveIntensity: 0.85,
    metalness: 0.3,
    roughness: 0.4,
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.35, 0.55),
    bodyMat,
  );
  body.position.y = 0.55;
  root.add(body);

  // Fuse countdown ring (base)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.5, 24),
    new THREE.MeshBasicMaterial({
      color: 0x331100,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.9;
  root.add(ring);

  // Fuse fill — scales down as time runs out
  const fuseFill = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 24),
    new THREE.MeshBasicMaterial({
      color: 0xff3300,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  fuseFill.rotation.x = -Math.PI / 2;
  fuseFill.position.y = 0.91;
  root.add(fuseFill);

  // Beacon light
  const light = new THREE.PointLight(0xff8800, 1.2, 5);
  light.position.y = 0.7;
  root.add(light);

  return { root, fuseFill, bodyMat };
}
