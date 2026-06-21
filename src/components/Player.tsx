import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { type PlanetConfig, PLANET_RADIUS, heightOnSphere, getNoise3D } from '../game/planets';
import { input, consumeTapJump } from '../hooks/useControls';
import { playerPos, playerUp, playerForward, playerVel, setCamera, getColliders } from '../game/shared';

const R = 1.05; // ball radius
const SPEED = 11;
const GRAVITY = 26;
const JUMP_FORCE = 9.5;

// Mobile (touch) devices get a wider, further camera so more terrain is visible.
const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
const CAM_DIST = isTouch ? 17 : 11;
const CAM_HEIGHT = isTouch ? 8.5 : 6;
const LOOK_HEIGHT = 1.5;

interface Props {
  planet: PlanetConfig;
}

function buildFluffyGeometry(): THREE.BufferGeometry {
  const geom = new THREE.IcosahedronGeometry(R, 5);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.copy(v).normalize();
    const d = 0.07 * (0.5 + 0.5 * Math.sin(n.x * 4.1 + n.y * 3.3 + n.z * 5.7)) + 0.04 * Math.cos(n.y * 6.2);
    v.addScaledVector(n, d);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geom.computeVertexNormals();
  return geom;
}

const UP_WORLD = new THREE.Vector3(0, 1, 0);

export default function Player({ planet }: Props) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);

  const geom = useMemo(buildFluffyGeometry, []);

  const pos = useRef(new THREE.Vector3(0, PLANET_RADIUS + 2, 0));
  const vel = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3(0, 0, 1));
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const right = useRef(new THREE.Vector3(1, 0, 0));
  const vVel = useRef(0);
  const grounded = useRef(true);
  const rollQuat = useRef(new THREE.Quaternion());

  // Publish camera to the shared view for the compass.
  useEffect(() => {
    setCamera(camera);
    return () => setCamera(null);
  }, [camera]);

  // (Re)spawn when the planet changes (after a transport).
  useEffect(() => {
    const noise = getNoise3D(planet.seed);
    const spawnDir = new THREE.Vector3(0, 1, 0);
    const h = heightOnSphere(planet, noise, spawnDir.x, spawnDir.y, spawnDir.z);
    const groundDist = PLANET_RADIUS + h + R;
    pos.current.set(0, groundDist, 0);
    vel.current.set(0, 0, 0);
    vVel.current = 0;
    grounded.current = true;
    up.current.set(0, 1, 0);
    forward.current.set(0, 0, 1);
    right.current.set(1, 0, 0);
    rollQuat.current.identity();
    camera.position.set(0, groundDist + CAM_HEIGHT, -CAM_DIST);
    camera.up.copy(up.current);
    camera.lookAt(0, groundDist + LOOK_HEIGHT, 0);
  }, [planet, camera]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const g = group.current;
    if (!g) return;

    // Current radial up from position.
    up.current.copy(pos.current).normalize();

    // Screen-right = forward × up (fixed: was swapped before).
    right.current.crossVectors(forward.current, up.current).normalize();

    // Build the desired movement direction in the tangent plane.
    const moveDir = new THREE.Vector3()
      .addScaledVector(forward.current, input.y)
      .addScaledVector(right.current, input.x);
    if (moveDir.lengthSq() > 1) moveDir.normalize();
    // Re-project onto the tangent plane in case of drift, then normalize.
    moveDir.addScaledVector(up.current, -moveDir.dot(up.current));
    if (moveDir.lengthSq() > 1e-6) moveDir.normalize();

    const targetVel = moveDir.clone().multiplyScalar(SPEED);
    const accel = 1 - Math.exp(-8 * dt);
    vel.current.lerp(targetVel, accel);

    // Integrate position (free in world space), then snap to the sphere surface.
    pos.current.addScaledVector(vel.current, dt);
    up.current.copy(pos.current).normalize();
    const noise = getNoise3D(planet.seed);
    const h = heightOnSphere(planet, noise, up.current.x, up.current.y, up.current.z);
    const groundDist = PLANET_RADIUS + h + R;

    // Hop (radial away from center).
    if ((input.jump || consumeTapJump()) && grounded.current) {
      vVel.current = JUMP_FORCE;
      grounded.current = false;
    }

    if (grounded.current) {
      pos.current.copy(up.current).multiplyScalar(groundDist);
      vVel.current = 0;
    } else {
      vVel.current -= GRAVITY * dt;
      const radial = pos.current.length();
      const nextRadial = Math.max(groundDist, radial + vVel.current * dt);
      if (nextRadial <= groundDist) {
        vVel.current = 0;
        grounded.current = true;
      }
      pos.current.copy(up.current).multiplyScalar(nextRadial);
    }

    // --- Collide with fixed decorations (sphere vs sphere) ---
    const colliders = getColliders();
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      const cp = c.pos;
      const dx = pos.current.x - cp.x;
      const dy = pos.current.y - cp.y;
      const dz = pos.current.z - cp.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const minD = R + c.radius;
      if (d2 < minD * minD && d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const nx = dx / d, ny = dy / d, nz = dz / d;
        const pen = minD - d;
        pos.current.x += nx * pen;
        pos.current.y += ny * pen;
        pos.current.z += nz * pen;
        // Soft bounce: cancel + slightly reverse the inward velocity component.
        const vdotn = vel.current.x * nx + vel.current.y * ny + vel.current.z * nz;
        if (vdotn < 0) {
          vel.current.x -= vdotn * nx * 1.2;
          vel.current.y -= vdotn * ny * 1.2;
          vel.current.z -= vdotn * nz * 1.2;
        }
      }
    }
    // After any push, refresh the radial up and re-snap to the surface when grounded.
    up.current.copy(pos.current).normalize();
    if (grounded.current) {
      const hc = heightOnSphere(planet, noise, up.current.x, up.current.y, up.current.z);
      pos.current.copy(up.current).multiplyScalar(PLANET_RADIUS + hc + R);
    }

    // Re-orthonormalize the basis on the new tangent plane.
    forward.current.addScaledVector(up.current, -forward.current.dot(up.current));
    if (forward.current.lengthSq() < 1e-6) {
      // Pick any perpendicular vector.
      forward.current.crossVectors(up.current, UP_WORLD);
      if (forward.current.lengthSq() < 1e-6) forward.current.set(0, 0, 1);
    }
    forward.current.normalize();

    // Rolling spin: rotate about axis = up × velDir so the top rolls forward.
    const speed = vel.current.length();
    if (speed > 0.05 && ball.current) {
      const dir = vel.current.clone().normalize();
      const axis = new THREE.Vector3().crossVectors(up.current, dir).normalize();
      const angle = (speed * dt) / R;
      const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      rollQuat.current.premultiply(q);
      ball.current.quaternion.copy(rollQuat.current);
      // Steer the heading toward the velocity direction, entirely in the
      // tangent plane. Avoids world-space yaw (which breaks near the equator
      // where the world XZ plane is perpendicular to the tangent plane).
      const steer = 1 - Math.exp(-3 * dt);
      forward.current.lerp(dir, steer);
      forward.current.addScaledVector(up.current, -forward.current.dot(up.current)).normalize();
    }

    // Publish shared state.
    playerPos.copy(pos.current);
    playerUp.copy(up.current);
    playerForward.copy(forward.current);
    playerVel.copy(vel.current);

    // Squash & stretch + gentle breathing.
    const stretch = THREE.MathUtils.clamp(1 + vVel.current * 0.012, 0.9, 1.12);
    const squash = 1 / Math.sqrt(stretch);
    if (ball.current) {
      const breathe = 1 + 0.012 * Math.sin(performance.now() * 0.003);
      ball.current.scale.set(squash * breathe, stretch * breathe, squash * breathe);
    }
    if (halo.current) {
      const hv = 1 + 0.05 * Math.sin(performance.now() * 0.002);
      halo.current.scale.setScalar(hv);
    }

    // Trailing camera that stays level with the surface (radial up).
    const desired = new THREE.Vector3()
      .copy(pos.current)
      .addScaledVector(forward.current, -CAM_DIST)
      .addScaledVector(up.current, CAM_HEIGHT);
    camera.position.lerp(desired, 1 - Math.exp(-4 * dt));
    camera.up.copy(up.current);
    camera.lookAt(
      pos.current.x + up.current.x * LOOK_HEIGHT,
      pos.current.y + up.current.y * LOOK_HEIGHT,
      pos.current.z + up.current.z * LOOK_HEIGHT
    );

    g.position.copy(pos.current);
  });

  return (
    <group ref={group}>
      <mesh ref={ball} geometry={geom} castShadow>
        <meshPhysicalMaterial
          color="#fffaff"
          roughness={0.85}
          metalness={0}
          sheen={1}
          sheenColor="#ffc6e2"
          sheenRoughness={0.5}
          clearcoat={0.15}
          clearcoatRoughness={0.8}
          emissive="#ffd9ec"
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh ref={halo} geometry={geom} scale={1.12}>
        <meshBasicMaterial
          color="#ffe6f3"
          transparent
          opacity={0.08}
          depthWrite={false}
          side={THREE.BackSide}
          fog={false}
        />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={0.5} distance={6} color="#ffd1e8" />
    </group>
  );
}
