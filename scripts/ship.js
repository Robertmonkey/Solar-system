import * as THREE from 'three';

export function createShip() {
  const group = new THREE.Group();

  const bodyGeom = new THREE.CylinderGeometry(0.05, 0.2, 0.8, 8);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const wingGeom = new THREE.BoxGeometry(0.6, 0.02, 0.2);
  const wingMat = new THREE.MeshLambertMaterial({ color: 0x4444ff });
  const wing = new THREE.Mesh(wingGeom, wingMat);
  wing.position.set(0, 0, -0.1);
  group.add(wing);

  return group;
}
