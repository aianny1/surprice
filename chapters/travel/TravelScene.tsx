'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from '@/animation/gsap';
import { fx, FX_DEFAULTS, rig } from '@/engine/stage/rig';
import { useSceneReady } from '@/engine/stage/useSceneReady';
import { useExperience } from '@/store/experience';
import { travel } from '@/data/travel';
import { GLOBE_R, latLng, orbit, travelScene, useTravel } from './state';

const CAT_COLOR: Record<string, string> = {
  mountains: '#cfe3ff', forests: '#8fe3a6', waterfalls: '#7fd8ff', adventure: '#ffb36b', cities: '#ffd3f0', beaches: '#ffe28a',
};
const HOME = latLng(travel.home.lat, travel.home.lng, GLOBE_R * 1.004);
const SEGS = 96;

/** Great-circle arc between two surface points, lifted above the globe. */
function arcCurve(a: THREE.Vector3, b: THREE.Vector3) {
  const pts: THREE.Vector3[] = [];
  const lift = 0.08 + a.distanceTo(b) * 0.35;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const p = new THREE.Vector3().copy(a).lerp(b, t).normalize();
    pts.push(p.multiplyScalar(GLOBE_R + Math.sin(Math.PI * t) * lift + 0.01));
  }
  return new THREE.CatmullRomCurve3(pts);
}

const ATMO_VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
const ATMO_FRAG = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main(){ float f = pow(1. - abs(dot(vN, vV)), 3.); gl_FragColor = vec4(vec3(.35,.62,1.)*f*1.6, f); }`;

export default function TravelScene() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const quality = useExperience((s) => s.quality);
  const [earth, water, clouds] = useLoader(THREE.TextureLoader, [
    '/textures/travel/earth.webp',
    '/textures/travel/water.webp',
    '/textures/travel/clouds.webp',
  ]);
  const cloudRef = useRef<THREE.Mesh>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const plane = useRef<THREE.Group>(null);
  const arcMesh = useRef<THREE.Mesh>(null);
  const markers = useRef<THREE.Group>(null);
  const flight = useRef({ p: 0, curve: null as THREE.CatmullRomCurve3 | null });
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), w: new THREE.Vector3(), q: new THREE.Quaternion() }), []);

  useSceneReady('travel');

  useLayoutEffect(() => {
    earth.colorSpace = THREE.SRGBColorSpace;
    for (const t of [earth, water, clouds]) t.anisotropy = 4;
    scene.background = new THREE.Color('#02040b');
    rig.fov = 38;
    rig.parallax = 0.04;
    Object.assign(orbit, { lat: 24, lng: 30, dist: 11, vLng: 0, vLat: 0, idle: true });
    Object.assign(fx, FX_DEFAULTS, { bloom: 0.8, bloomThreshold: 0.75, vignette: 0.6, aberration: 0.0003, grain: 0.035 });
    useTravel.getState().init();
    return () => {
      scene.background = null;
    };
  }, [scene, earth, water, clouds]);

  // Earth material: day texture + water glint from the specular mask
  const earthMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ map: earth, roughnessMap: water, roughness: 1, metalness: 0.0 }),
    [earth, water],
  );
  useEffect(() => {
    // the specular mask is white on water, so invert it into roughness (water shiny, land matte)
    earthMat.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        'float roughnessFactor = roughness; vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv ); roughnessFactor *= mix(0.92, 0.32, texelRoughness.g);',
      );
    };
    return () => earthMat.dispose();
  }, [earthMat]);

  const atmoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, side: THREE.BackSide, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => atmoMat.dispose(), [atmoMat]);

  const points = useMemo(() => travel.destinations.map((d) => latLng(d.lat, d.lng, GLOBE_R * 1.004)), []);

  // flight to the selected place: arc draws itself, the plane rides it, the camera swings over
  const selected = useTravel((s) => s.selected);
  const lastFrom = useRef<THREE.Vector3 | null>(null);
  useEffect(() => {
    const m = arcMesh.current;
    if (!m) return;
    if (selected == null) {
      // back to the overview above India
      lastFrom.current = null;
      flight.current.p = 0;
      if (plane.current) plane.current.visible = false;
      m.geometry.setDrawRange(0, 0);
      const tl = gsap.to(orbit, { lat: 28, lng: 78, dist: 6.2, duration: 1.8, ease: 'power2.inOut' });
      return () => {
        tl.kill();
      };
    }
    // each hop flies on from the previous place (the first one leaves from home)
    const curve = arcCurve(lastFrom.current ?? HOME, points[selected]);
    lastFrom.current = points[selected];
    m.geometry.dispose();
    m.geometry = new THREE.TubeGeometry(curve, SEGS, 0.006, 6, false);
    flight.current.curve = curve;
    const f = flight.current;
    const d = travel.destinations[selected];
    const reduced = useExperience.getState().reducedMotion;
    const tl = gsap.timeline();
    tl.fromTo(f, { p: 0 }, { p: 1, duration: reduced ? 0.01 : 2.6, ease: 'power2.inOut' }, 0);
    tl.to(orbit, { lat: d.lat - 4, lng: d.lng, dist: 5, duration: reduced ? 0.01 : 2.2, ease: 'power2.inOut' }, 0);
    return () => {
      tl.kill();
    };
  }, [selected, points]);

  useEffect(() => () => arcMesh.current?.geometry.dispose(), []);

  // drag to spin (ignores the DOM controls)
  useEffect(() => {
    let last: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button,a,[data-card]')) return;
      last = { x: e.clientX, y: e.clientY };
      orbit.dragging = true;
      orbit.idle = false;
    };
    const move = (e: PointerEvent) => {
      if (!last) return;
      const k = 0.18 * (orbit.dist / 10);
      orbit.vLng = -(e.clientX - last.x) * k;
      orbit.vLat = (e.clientY - last.y) * k;
      orbit.lng += orbit.vLng;
      orbit.lat = THREE.MathUtils.clamp(orbit.lat + orbit.vLat, -60, 70);
      last = { x: e.clientX, y: e.clientY };
    };
    const up = () => {
      last = null;
      orbit.dragging = false;
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  // engine API
  useEffect(() => {
    travelScene.api = {
      arrive(mode) {
        const tl = gsap.timeline();
        if (mode === 'rewind') return tl;
        // climb out of the sky: start close and bright, pull back to orbit, then settle over India
        tl.fromTo(orbit, { dist: 3.2, lat: 30, lng: 60 }, { dist: 10, lat: 24, lng: 70, duration: 2.6, ease: 'power2.out' }, 0);
        tl.to(orbit, { dist: 6.2, lat: 28, lng: 78, duration: 2.2, ease: 'power2.inOut' }, '>-0.2');
        return tl;
      },
      takeOff() {
        const tl = gsap.timeline();
        tl.to(orbit, { dist: 2.6, lat: '+=6', lng: '+=24', duration: 1.6, ease: 'power2.in' }, 0);
        tl.to(rig, { fov: 70, duration: 1.6, ease: 'power2.in' }, 0);
        return tl;
      },
    };
    return () => {
      travelScene.api = null;
    };
  }, []);

  const filter = useTravel((s) => s.filter);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (!orbit.dragging) {
      orbit.vLng *= 0.92;
      orbit.vLat *= 0.92;
      orbit.lng += orbit.vLng;
      orbit.lat = THREE.MathUtils.clamp(orbit.lat + orbit.vLat, -60, 70);
      if (orbit.idle && useTravel.getState().selected == null) orbit.lng += dt * 1.2;
    }
    latLng(orbit.lat, orbit.lng, orbit.dist, rig.position);
    rig.target.set(0, 0, 0);
    if (sun.current) {
      // sun sits up and to the left of the camera so her side of the planet is always in daylight
      sun.current.position.copy(camera.position).applyAxisAngle(THREE.Object3D.DEFAULT_UP, 0.7);
      sun.current.position.y += 4;
    }
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.006;

    // markers pulse; filtered-out ones dim
    markers.current?.children.forEach((m, i) => {
      const d = travel.destinations[i];
      const on = !filter || d.category === filter;
      const s = (on ? 1 : 0.45) * (1 + Math.sin(t * 3 + i) * 0.18) * (useTravel.getState().selected === i ? 1.7 : 1);
      m.scale.setScalar(s * Math.min(1, orbit.dist / 6));
    });

    const f = flight.current;
    if (f.curve && plane.current && arcMesh.current) {
      arcMesh.current.geometry.setDrawRange(0, Math.floor(f.p * SEGS) * 6 * 6);
      const p = Math.min(f.p, 0.999);
      f.curve.getPointAt(p, tmp.v);
      f.curve.getTangentAt(p, tmp.w);
      plane.current.position.copy(tmp.v);
      plane.current.up.copy(tmp.v).normalize();
      plane.current.lookAt(tmp.v.add(tmp.w));
      plane.current.visible = f.p > 0.01;
    }
  });

  const segs = quality === 'low' ? 64 : quality === 'medium' ? 96 : 128;

  return (
    <>
      <ambientLight intensity={0.08} />
      <directionalLight ref={sun} intensity={2.6} color="#fff3e2" />
      <Stars radius={60} depth={30} count={quality === 'low' ? 1500 : 3500} factor={2.4} fade speed={0.3} />
      <mesh material={earthMat}>
        <sphereGeometry args={[GLOBE_R, segs, segs / 2]} />
      </mesh>
      <mesh ref={cloudRef} scale={1.012}>
        <sphereGeometry args={[GLOBE_R, segs, segs / 2]} />
        <meshStandardMaterial alphaMap={clouds} transparent depthWrite={false} color="#ffffff" opacity={0.9} />
      </mesh>
      <mesh material={atmoMat} scale={1.09}>
        <sphereGeometry args={[GLOBE_R, 64, 32]} />
      </mesh>

      {/* home + destinations */}
      <mesh position={HOME}>
        <sphereGeometry args={[0.018, 12, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <group ref={markers}>
        {points.map((p, i) => (
          <mesh
            key={i}
            position={p}
            onClick={(e) => {
              e.stopPropagation();
              useTravel.getState().select(i);
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = '')}
          >
            <sphereGeometry args={[0.022, 12, 8]} />
            <meshBasicMaterial color={CAT_COLOR[travel.destinations[i].category]} toneMapped={false} />
          </mesh>
        ))}
      </group>

      <mesh ref={arcMesh}>
        <bufferGeometry />
        <meshBasicMaterial color="#ffd9a8" toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <group ref={plane} visible={false} scale={0.05}>
        <mesh rotation-x={Math.PI / 2}>
          <coneGeometry args={[0.12, 0.9, 8]} />
          <meshStandardMaterial color="#f4f4f6" metalness={0.3} roughness={0.35} />
        </mesh>
        <mesh>
          <boxGeometry args={[1.1, 0.03, 0.22]} />
          <meshStandardMaterial color="#e8e8ee" metalness={0.3} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.12, -0.36]}>
          <boxGeometry args={[0.03, 0.26, 0.16]} />
          <meshStandardMaterial color="#e8e8ee" />
        </mesh>
      </group>
    </>
  );
}
