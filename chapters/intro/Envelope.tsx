'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ENV, LETTER } from './state';
import {
  glowTexture,
  letterTexture,
  linerTexture,
  paperTextures,
  pocketTexture,
  sealEmbossTexture,
} from '@/lib/textures';
import { messages } from '@/data/messages';
import { person } from '@/data/person';

/** Everything the choreography needs to move. */
export interface EnvelopeRefs {
  body: THREE.Group;
  flapHinge: THREE.Group;
  sealL: THREE.Group;
  sealR: THREE.Group;
  sealMats: THREE.MeshPhysicalMaterial[];
  letter: THREE.Group;
  letterTop: THREE.Group;
  letterBottom: THREE.Group;
  letterFront: THREE.MeshStandardMaterial;
  glow: THREE.Mesh;
  glowMat: THREE.MeshBasicMaterial;
  innerLight: THREE.PointLight;
}

/** ShapeGeometry with UVs normalised to the shape's bounding box (or a supplied frame). */
function shapeGeo(shape: THREE.Shape, frame?: { minX: number; minY: number; w: number; h: number }) {
  const g = new THREE.ShapeGeometry(shape, 24);
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const f = frame ?? { minX: bb.min.x, minY: bb.min.y, w: bb.max.x - bb.min.x, h: bb.max.y - bb.min.y };
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - f.minX) / f.w, (pos.getY(i) - f.minY) / f.h);
  }
  uv.needsUpdate = true;
  return g;
}

/** Wax seal half: lathe with an irregular, hand-poured rim. */
function sealHalf(phiStart: number) {
  const profile = [
    [0.0, 0.07],
    [0.2, 0.07],
    [0.235, 0.066],
    [0.262, 0.055],
    [0.285, 0.04],
    [0.3, 0.022],
    [0.31, 0.006],
    [0.312, 0.0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(profile, 48, phiStart, Math.PI);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 0.19) continue;
    const a = Math.atan2(x, z);
    const k = 1 + 0.07 * Math.sin(a * 5 + 1.3) + 0.035 * Math.sin(a * 11 + 0.4) + 0.02 * Math.sin(a * 23);
    const t = THREE.MathUtils.smoothstep(r, 0.19, 0.31);
    const s = 1 + (k - 1) * t;
    p.setX(i, x * s);
    p.setZ(i, z * s);
  }
  g.computeVertexNormals();
  return g;
}

/** A letter panel: printed front + plain paper back, UVs cropped to its third of the sheet. */
function panelGeo(v0: number, v1: number) {
  const g = new THREE.PlaneGeometry(LETTER.W, LETTER.PANEL, 1, 1);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, v0 + uv.getY(i) * (v1 - v0));
  return g;
}

function Panel({
  geo,
  a,
}: {
  geo: THREE.BufferGeometry;
  a: { letterFront: THREE.Material; letterBack: THREE.Material; panelBack: THREE.BufferGeometry };
}) {
  return (
    <group>
      <mesh geometry={geo} material={a.letterFront} />
      <mesh geometry={a.panelBack} material={a.letterBack} rotation-y={Math.PI} position-z={-0.0005} />
    </group>
  );
}

export const Envelope = forwardRef<EnvelopeRefs, { onHover?(h: boolean): void; onActivate?(): void }>(
  function Envelope({ onHover, onActivate }, ref) {
    const body = useRef<THREE.Group>(null!);
    const flapHinge = useRef<THREE.Group>(null!);
    const sealL = useRef<THREE.Group>(null!);
    const sealR = useRef<THREE.Group>(null!);
    const letter = useRef<THREE.Group>(null!);
    const letterTop = useRef<THREE.Group>(null!);
    const letterBottom = useRef<THREE.Group>(null!);
    const glow = useRef<THREE.Mesh>(null!);
    const innerLight = useRef<THREE.PointLight>(null!);

    const assets = useMemo(() => {
      const { W, H, FLAP } = ENV;
      const paper = paperTextures('#f2edf8', 1024, 11);
      paper.map.repeat.set(1, 1);
      const pocketMap = pocketTexture(paper.map.image as HTMLCanvasElement);
      const liner = linerTexture();
      const emboss = sealEmbossTexture(person.name.initial);
      const letterMap = letterTexture(messages.intro.letter, 1024, Math.round((1024 * 3 * LETTER.PANEL) / LETTER.W));
      const letterPaper = paperTextures('#f7f2ea', 512, 5);

      const paperMat = new THREE.MeshPhysicalMaterial({
        map: paper.map,
        bumpMap: paper.bump,
        bumpScale: 1.4,
        roughness: 0.78,
        sheen: 0.7,
        sheenRoughness: 0.55,
        sheenColor: new THREE.Color('#c9b6ff'),
        envMapIntensity: 0.6,
      });
      const pocketMat = paperMat.clone();
      pocketMat.map = pocketMap;
      const linerMat = new THREE.MeshStandardMaterial({
        map: liner,
        roughness: 0.5,
        metalness: 0.2,
        envMapIntensity: 0.8,
        side: THREE.FrontSide,
      });
      const sealMat = new THREE.MeshPhysicalMaterial({
        color: '#4b1c8c',
        roughness: 0.3,
        metalness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        sheen: 0.5,
        sheenColor: new THREE.Color('#f4b6d2'),
        side: THREE.DoubleSide,
        transparent: true,
        envMapIntensity: 1.4,
      });
      const sealFaceMat = sealMat.clone();
      sealFaceMat.bumpMap = emboss;
      sealFaceMat.bumpScale = 6;
      const letterFront = new THREE.MeshStandardMaterial({
        map: letterMap,
        emissive: new THREE.Color('#ffffff'),
        emissiveMap: letterMap,
        emissiveIntensity: 0,
        bumpMap: letterPaper.bump,
        bumpScale: 0.6,
        roughness: 0.88,
      });
      const letterBack = new THREE.MeshStandardMaterial({
        map: letterPaper.map,
        bumpMap: letterPaper.bump,
        bumpScale: 0.6,
        roughness: 0.9,
        emissive: new THREE.Color('#e4daff'),
        emissiveIntensity: 0,
      });
      const glowMat = new THREE.MeshBasicMaterial({
        map: glowTexture(),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        color: new THREE.Color('#e4daff'),
      });

      // Pocket: rectangle minus the top V (side flaps meet in the centre).
      const vY = -0.02;
      const pocket = new THREE.Shape();
      pocket.moveTo(-W / 2, -H / 2);
      pocket.lineTo(W / 2, -H / 2);
      pocket.lineTo(W / 2, H / 2);
      pocket.lineTo(0.06, vY + 0.035);
      pocket.quadraticCurveTo(0, vY, -0.06, vY + 0.035);
      pocket.lineTo(-W / 2, H / 2);
      pocket.closePath();
      const pocketGeo = shapeGeo(pocket, { minX: -W / 2, minY: -H / 2, w: W, h: H });

      // Flap: triangle hinged on the top edge, with a softly rounded tip.
      const flap = new THREE.Shape();
      flap.moveTo(-W / 2, 0);
      flap.lineTo(-0.2, -FLAP + 0.14);
      flap.quadraticCurveTo(0, -FLAP - 0.04, 0.2, -FLAP + 0.14);
      flap.lineTo(W / 2, 0);
      flap.closePath();
      const flapGeo = shapeGeo(flap);

      const backGeo = new THREE.BoxGeometry(W, H, 0.012);
      const sealGeoR = sealHalf(0);
      const sealGeoL = sealHalf(Math.PI);
      const decalR = new THREE.CircleGeometry(0.2, 48, -Math.PI / 2, Math.PI);
      const decalL = new THREE.CircleGeometry(0.2, 48, Math.PI / 2, Math.PI);

      return {
        paperMat,
        pocketMat,
        linerMat,
        sealMat,
        sealFaceMat,
        letterFront,
        letterBack,
        glowMat,
        pocketGeo,
        flapGeo,
        backGeo,
        sealGeoR,
        sealGeoL,
        decalR,
        decalL,
        panelTop: panelGeo(2 / 3, 1),
        panelMid: panelGeo(1 / 3, 2 / 3),
        panelBot: panelGeo(0, 1 / 3),
        panelBack: new THREE.PlaneGeometry(LETTER.W, LETTER.PANEL),
        dispose() {
          [paperMat, pocketMat, linerMat, sealMat, sealFaceMat, letterFront, letterBack, glowMat].forEach((m) => m.dispose());
          [pocketGeo, flapGeo, backGeo, sealGeoR, sealGeoL, decalR, decalL].forEach((g) => g.dispose());
          [this.panelTop, this.panelMid, this.panelBot, this.panelBack].forEach((g) => g.dispose());
          [paper.map, paper.bump, pocketMap, liner, emboss, letterMap, letterPaper.map, letterPaper.bump, glowMat.map].forEach(
            (t) => t?.dispose(),
          );
        },
      };
    }, []);

    // Imperatively created GPU resources are disposed with the chapter (PAGE_ARCHITECTURE §9).
    useEffect(() => () => assets.dispose(), [assets]);

    useImperativeHandle(ref, () => ({
      body: body.current,
      flapHinge: flapHinge.current,
      sealL: sealL.current,
      sealR: sealR.current,
      sealMats: [assets.sealMat, assets.sealFaceMat],
      letter: letter.current,
      letterTop: letterTop.current,
      letterBottom: letterBottom.current,
      letterFront: assets.letterFront,
      glow: glow.current,
      glowMat: assets.glowMat,
      innerLight: innerLight.current,
    }));

    const { W, H, FLAP } = ENV;
    const P = LETTER.PANEL;
    // Box material order: +x, -x, +y, -y, +z (inside, liner), -z (outside)
    const backMats = [assets.paperMat, assets.paperMat, assets.paperMat, assets.paperMat, assets.linerMat, assets.paperMat];

    return (
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover?.(true);
        }}
        onPointerOut={() => onHover?.(false)}
        onClick={(e) => {
          e.stopPropagation();
          onActivate?.();
        }}
      >
        {/* Envelope body: everything except the letter, so it can fall away on its own. */}
        <group ref={body}>
          <mesh geometry={assets.backGeo} material={backMats} />
          <mesh geometry={assets.pocketGeo} material={assets.pocketMat} position-z={0.026} />
          <pointLight ref={innerLight} position={[0, 0.25, 0.016]} color="#e4daff" intensity={0} distance={3.2} decay={2} />

          <group ref={flapHinge} position={[0, H / 2, 0.03]}>
            <mesh geometry={assets.flapGeo} material={assets.paperMat} position-z={0.0008} />
            <mesh geometry={assets.flapGeo} material={assets.linerMat} rotation-y={Math.PI} position-z={-0.0004} />
          </group>

          {/* Wax seal, split in two halves so it can crack. Sits on the flap tip. */}
          <group position={[0, H / 2 - FLAP + 0.1, 0.036]} rotation-x={Math.PI / 2} scale={0.95}>
            <group ref={sealR}>
              <mesh geometry={assets.sealGeoR} material={assets.sealMat} />
              <mesh geometry={assets.decalR} material={assets.sealFaceMat} rotation-x={-Math.PI / 2} position-y={0.0705} />
            </group>
            <group ref={sealL}>
              <mesh geometry={assets.sealGeoL} material={assets.sealMat} />
              <mesh geometry={assets.decalL} material={assets.sealFaceMat} rotation-x={-Math.PI / 2} position-y={0.0705} />
            </group>
          </group>
        </group>

        {/* Tri-fold letter: middle panel fixed, top and bottom hinged on its edges, folded inwards. */}
        <group ref={letter} position={[0, -0.06, 0.014]}>
          {/* Glow halo behind the letter; travels with it. */}
          <mesh ref={glow} position={[0, 0.15, -0.006]} material={assets.glowMat} scale={[4.6, 3.6, 1]}>
            <planeGeometry args={[1, 1]} />
          </mesh>
          <Panel geo={assets.panelMid} a={assets} />
          <group ref={letterBottom} position={[0, -P / 2, 0.002]} rotation-x={-Math.PI}>
            <group position-y={-P / 2}>
              <Panel geo={assets.panelBot} a={assets} />
            </group>
          </group>
          <group ref={letterTop} position={[0, P / 2, 0.004]} rotation-x={Math.PI}>
            <group position-y={P / 2}>
              <Panel geo={assets.panelTop} a={assets} />
            </group>
          </group>
        </group>
      </group>
    );
  },
);
