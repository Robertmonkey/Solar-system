import * as THREE from 'three';
import { solarBodies } from './data.js';

/**
 * Create a miniature 3D representation of the solar system rendered to a texture.
 * The resulting mesh can be placed on a cockpit dashboard like a monitor.
 *
 * @param {THREE.WebGLRenderer} renderer WebGL renderer used to draw the texture.
 * @returns {object} { mesh, update, planetMeshes }
 */
export function createOrrery(renderer) {
  const size = 256;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 50);
  camera.position.set(0, 5, 8);
  camera.lookAt(0, 0, 0);

  const light = new THREE.PointLight(0xffffff, 1.2, 30);
  light.position.set(5, 10, 5);
  scene.add(light);

  const root = new THREE.Group();
  scene.add(root);

  const planetMeshes = [];
  solarBodies.forEach((body, i) => {
    const radius = i === 0 ? 0.4 : 0.1;
    const color = new THREE.Color(body.color || 0xffffff);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), new THREE.MeshStandardMaterial({ color }));
    root.add(mesh);
    planetMeshes.push(mesh);
  });

  const renderTarget = new THREE.WebGLRenderTarget(size, size);
  const planeGeom = new THREE.PlaneGeometry(0.6, 0.6);
  const planeMat = new THREE.MeshBasicMaterial({ map: renderTarget.texture, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(planeGeom, planeMat);
  mesh.name = 'OrreryScreen';
  mesh.position.set(0, 1.5, -0.29);
  mesh.rotation.x = -0.3;

  function update(bodyPositions) {
    const maxDist = bodyPositions.reduce((m, p) => Math.max(m, p.length()), 1);
    const scale = 2.0 / maxDist; // fit within ~2 units radius
    bodyPositions.forEach((pos, i) => {
      if (planetMeshes[i]) {
        planetMeshes[i].position.set(pos.x * scale, pos.y * scale, pos.z * scale);
      }
    });
    
    const xrWasEnabled = renderer.xr.enabled;
    renderer.xr.enabled = false;

    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    renderer.xr.enabled = xrWasEnabled;
  }

  return { mesh, update, planetMeshes };
}
