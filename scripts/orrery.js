import * as THREE from 'three';
import { solarBodies } from './data.js';

/**
 * Create a miniature 3D representation of the solar system rendered to a texture.
 *
 * The original implementation temporarily disabled `renderer.xr.enabled` when
 * rendering the orrery to its off‑screen target.  On some WebXR browsers
 * (notably the Meta Quest browser), toggling XR mode each frame causes the
 * entire VR view to go black even though the scene continues to update in
 * the background.  A separate WebGL renderer dedicated to the orrery avoids
 * interfering with the main XR session entirely.
 *
 * @param {THREE.WebGLRenderer} renderer Main WebGL renderer used for the
 *  immersive scene.  Its colour space and shadow settings are mirrored on
 *  the off‑screen renderer so the orrery appears consistent with the rest
 *  of the cockpit.
 * @returns {{ mesh: THREE.Mesh, update: Function, planetMeshes: THREE.Mesh[] }}
 */
export function createOrrery(renderer) {
  // Size of the square render target.  This should match the dimensions of
  // the dashboard screen onto which the texture is mapped.  Keeping this
  // relatively small helps minimise the overhead of the additional renderer.
  const size = 256;

  // Local scene and camera for the miniature solar system.  This scene is
  // completely independent from the main scene and only contains the orrery's
  // tiny planets and a single light source.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 50);
  camera.position.set(0, 5, 8);
  camera.lookAt(0, 0, 0);

  // Add a point light so the planets are visible.  Using a single
  // point light keeps the lighting simple and efficient.
  const light = new THREE.PointLight(0xffffff, 1.2, 30);
  light.position.set(5, 10, 5);
  scene.add(light);

  // Root group for all planet meshes.  Scaling this group allows the
  // orrery to accommodate the vast range of planetary distances without
  // overflowing the screen.
  const root = new THREE.Group();
  scene.add(root);

  // Create a small sphere for each solar body.  The sun is drawn larger
  // (radius 0.4) while all other planets are drawn with a much smaller
  // radius.  Colours default to white when no colour is specified.
  const planetMeshes = [];
  solarBodies.forEach((body, i) => {
    const radius = i === 0 ? 0.4 : 0.1;
    const color = new THREE.Color(body.color || 0xffffff);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 16, 16),
      new THREE.MeshStandardMaterial({ color })
    );
    root.add(mesh);
    planetMeshes.push(mesh);
  });

  // Use a separate renderer for the orrery.  The off‑screen renderer
  // inherits the colour space and shadow settings from the main renderer
  // so that lighting and tone mapping are consistent.  Because this
  // renderer never has XR enabled, it will not interfere with the XR
  // presentation of the main scene.
  const offscreenRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  offscreenRenderer.setSize(size, size);
  offscreenRenderer.setPixelRatio(1);
  // Mirror colour space and shadow settings from the main renderer
  offscreenRenderer.outputColorSpace = renderer.outputColorSpace;
  offscreenRenderer.shadowMap.enabled = renderer.shadowMap.enabled;

  // Create a render target that the off‑screen renderer will draw into.
  const renderTarget = new THREE.WebGLRenderTarget(size, size);

  // Plane geometry to display the render target texture within the cockpit.
  // The plane is rotated slightly downward and centred on the dashboard.
  const planeGeom = new THREE.PlaneGeometry(0.6, 0.6);
  const planeMat = new THREE.MeshBasicMaterial({ map: renderTarget.texture, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(planeGeom, planeMat);
  mesh.name = 'OrreryScreen';
  mesh.position.set(0, 1.5, -0.29);
  mesh.rotation.x = -0.3;

  /**
   * Update the positions of the planets and render the orrery.  The
   * distances of the planets are normalised so that the farthest planet
   * always fits within the 2 unit radius sphere of the miniature system.
   *
   * @param {THREE.Vector3[]} bodyPositions World positions of each body in the
   *  main scene.  These are projected into the miniature using a uniform
   *  scaling factor.
   */
  function update(bodyPositions) {
    // Determine the maximum distance of any planet from the origin.  If
    // bodyPositions is empty this defaults to 1 to avoid division by zero.
    const maxDist = bodyPositions.reduce((max, p) => Math.max(max, p.length()), 1);
    const scale = 2.0 / maxDist;
    bodyPositions.forEach((pos, i) => {
      if (planetMeshes[i]) {
        planetMeshes[i].position.set(pos.x * scale, pos.y * scale, pos.z * scale);
      }
    });
    // Render the orrery into its texture.  Because the off‑screen renderer
    // never has XR enabled, there is no need to toggle `xr.enabled` here.
    offscreenRenderer.setRenderTarget(renderTarget);
    offscreenRenderer.render(scene, camera);
    offscreenRenderer.setRenderTarget(null);
  }

  return { mesh, update, planetMeshes };
}
