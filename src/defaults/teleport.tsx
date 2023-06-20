import { XIntersection } from "@coconut-xr/xinteraction";
import { InputDeviceFunctions, XCurvedPointer } from "@coconut-xr/xinteraction/react";
import { createPortal, useFrame, useStore, useThree } from "@react-three/fiber";
import React, {
  MutableRefObject,
  RefObject,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ReactNode } from "react";
import {
  ColorRepresentation,
  Euler,
  Group,
  Mesh,
  PlaneGeometry,
  QuadraticBezierCurve3,
  Quaternion,
  Texture,
  Vector3,
} from "three";
import { useInputSourceEvent } from "../react/listeners.js";
import { DynamicHandModel, HandBoneGroup, getBoneObject } from "../react/hand.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { clamp } from "three/src/math/MathUtils.js";
import { OculusHandModel } from "three-stdlib/index.js";
import { isMotionHand } from "../motion-hand.js";
import { SpaceGroup } from "../react/space.js";
import { DynamicControllerModel } from "../react/controller.js";

function emptyFunction() {
  //nothing to do
}

//from end to start so that we can use dashOffset as "dashLength"
const curve = new QuadraticBezierCurve3(
  new Vector3(0, 0, 0),
  new Vector3(0, 0, -8),
  new Vector3(0, -20, -15),
);
const points = curve.getPoints(20);
//reacting to the bug in meshline
const multiplier = (points.length * 3 - 3) / (points.length * 3 - 1);
const float32Array = new Float32Array(points.length * 3);
for (let i = 0; i < points.length; i++) {
  points[i].toArray(float32Array, i * 3);
}
const rayGeometry = new MeshLineGeometry();
rayGeometry.setPoints(float32Array);
const lineLengths = points.slice(0, -1).map((p, i) => p.distanceTo(points[i + 1]));

const cursorGeometry = new PlaneGeometry(1, 1);
cursorGeometry.rotateX(-Math.PI / 2);

const UP = new Vector3(0, 1, 0);

const offsetHelper = new Vector3();
const quaternionHelper = new Quaternion();

export function TeleportTarget({ children }: { children?: ReactNode }) {
  const ref = useRef<Group>(null);
  useEffect(() => {
    if (ref.current == null) {
      return;
    }
    ref.current.traverse((object) => (object.userData.teleportTarget = true));
  }, []);
  return (
    <group onPointerDown={emptyFunction} ref={ref}>
      {children}
    </group>
  );
}

const eulerHelper = new Euler(0, 0, 0, "YXZ");

function isTeleportTarget(intersection: XIntersection): boolean {
  return intersection.object.userData.teleportTarget === true;
}

const positionHelper = new Vector3();

export function TeleportHand({
  hand,
  inputSource,
  children,
  onTeleport,
  ...pointerProps
}: {
  hand: XRHand;
  inputSource: XRInputSource;
  children?: ReactNode;
  id: number;
  rayColor?: ColorRepresentation;
  raySize?: number;
  cursorTexture?: Texture;
  cursorColor?: ColorRepresentation;
  cursorSize?: number;
  onTeleport: (point: Vector3) => void;
  filterIntersections?: (intersections: any[]) => any[]; //TODO
}) {
  const groupRef = useRef<Group>(null);
  const handRef = useRef<OculusHandModel>(null);
  const currentIntersectionRef = useRef<XIntersection>();
  const teleportRef = useRef(onTeleport);
  teleportRef.current = onTeleport;

  const [show, setShow] = useState(false);

  const store = useStore();

  useInputSourceEvent("selectstart", inputSource, () => setShow(true), []);
  useInputSourceEvent(
    "selectend",
    inputSource,
    () => {
      if (currentIntersectionRef.current != null) {
        store.getState().camera.getWorldPosition(positionHelper);
        positionHelper
          .setFromMatrixPosition(store.getState().camera.matrix)
          .negate()
          .setComponent(1, 0)
          .add(currentIntersectionRef.current.point);
        teleportRef.current?.(positionHelper.clone());
      }
      setShow(false);
    },
    [store],
  );
  useFrame((_, delta) => {
    const group = groupRef.current;
    const motionHand = handRef.current;
    if (group == null || motionHand == null || !isMotionHand(motionHand)) {
      return;
    }
    const bone = getBoneObject(motionHand, "wrist");
    group.position.copy(bone.position);
    eulerHelper.setFromQuaternion(bone.quaternion);
    eulerHelper.z = 0;
    eulerHelper.y += ((inputSource.handedness === "right" ? 1 : -1) * (20 * Math.PI)) / 180;
    eulerHelper.x = clamp(eulerHelper.x - (10 * Math.PI) / 180, -Math.PI / 2, (1.1 * Math.PI) / 4);
    quaternionHelper.setFromEuler(eulerHelper);
    group.quaternion.slerp(quaternionHelper, delta * 10);
  });

  return (
    <>
      <Suspense fallback={null}>
        <DynamicHandModel ref={handRef} hand={hand} handedness={inputSource.handedness}>
          {children != null && <HandBoneGroup joint="wrist">{children}</HandBoneGroup>}
        </DynamicHandModel>
      </Suspense>
      <group ref={groupRef}>
        {show && (
          <TeleportPointer {...pointerProps} currentIntersectionRef={currentIntersectionRef} />
        )}
      </group>
    </>
  );
}

export function TeleportController({
  inputSource,
  children,
  onTeleport,
  ...pointerProps
}: {
  inputSource: XRInputSource;
  children?: ReactNode;
  id: number;
  rayColor?: ColorRepresentation;
  raySize?: number;
  cursorTexture?: Texture;
  cursorColor?: ColorRepresentation;
  cursorSize?: number;
  onTeleport: (point: Vector3) => void;
  filterIntersections?: (intersections: any[]) => any[]; //TODO
}) {
  const groupRef = useRef<Group>(null);
  const currentIntersectionRef = useRef<XIntersection>();
  const teleportRef = useRef(onTeleport);
  teleportRef.current = onTeleport;

  const [show, setShow] = useState(false);

  const store = useStore();

  useInputSourceEvent("selectstart", inputSource, () => setShow(true), []);
  useInputSourceEvent(
    "selectend",
    inputSource,
    () => {
      if (currentIntersectionRef.current != null) {
        store.getState().camera.getWorldPosition(positionHelper);
        positionHelper
          .setFromMatrixPosition(store.getState().camera.matrix)
          .negate()
          .setComponent(1, 0)
          .add(currentIntersectionRef.current.point);
        teleportRef.current?.(positionHelper.clone());
      }
      setShow(false);
    },
    [store],
  );

  useFrame((state, delta, frame: XRFrame | undefined) => {
    const group = groupRef.current;
    if (group == null) {
      return;
    }
    const referenceSpace = state.gl.xr.getReferenceSpace();
    if (referenceSpace == null || frame == null) {
      group.visible = false;
      return;
    }
    const pose = frame.getPose(inputSource.targetRaySpace, referenceSpace);
    if (pose == null) {
      group.visible = false;
      return;
    }
    group.visible = true;
    {
      const { x, y, z } = pose.transform.position;
      group.position.set(x, y, z);
    }
    {
      const { x, y, z, w } = pose.transform.orientation;
      quaternionHelper.set(x, y, z, w);
      group.rotation.setFromQuaternion(quaternionHelper);
    }
    group.rotation.z = 0;
    group.rotation.x = clamp(group.rotation.x, -Math.PI / 2, (1.1 * Math.PI) / 4);
  });

  return (
    <>
      {inputSource.gripSpace != null && (
        <SpaceGroup space={inputSource.gripSpace}>
          {children}
          <Suspense fallback={null}>
            <DynamicControllerModel inputSource={inputSource} />
          </Suspense>
        </SpaceGroup>
      )}
      <group rotation-order="YXZ" ref={groupRef}>
        {show && (
          <TeleportPointer {...pointerProps} currentIntersectionRef={currentIntersectionRef} />
        )}
      </group>
    </>
  );
}

export function TeleportPointer({
  rayColor,
  raySize,
  filterIntersections: customFilterIntersections,
  id,
  currentIntersectionRef,
  cursorColor,
  cursorSize,
  cursorTexture,
}: {
  rayColor?: ColorRepresentation;
  raySize?: number;
  filterIntersections?: (intersections: any[]) => any[]; //TODO
  currentIntersectionRef: MutableRefObject<XIntersection | undefined>;
  cursorTexture?: Texture;
  cursorColor?: ColorRepresentation;
  cursorSize?: number;
  id: number;
}) {
  const cursorRef = useRef<Mesh>(null);

  const material = useMemo(
    () =>
      new MeshLineMaterial({
        toneMapped: false,
        lineWidth: 0.1,
        transparent: true,
        visibility: 1 * multiplier,
      }),
    [],
  );
  material.color.set(rayColor ?? "blue");
  material.lineWidth = raySize ?? 0.01;

  const onIntersections = useCallback(
    (intersections: ReadonlyArray<{ lineIndex: number; distanceOnLine: number }>) => {
      let visibility = 1 * multiplier;
      if (intersections.length > 0) {
        const lineLength = lineLengths[intersections[0].lineIndex];
        visibility =
          (multiplier *
            (intersections[0].lineIndex + intersections[0].distanceOnLine / lineLength)) /
          (points.length - 1);
        currentIntersectionRef.current = intersections[0] as any;
      } else {
        currentIntersectionRef.current = undefined;
      }
      material.visibility = visibility;
      if (cursorRef.current == null) {
        return;
      }
      cursorRef.current.visible = intersections.length > 0;
      if (intersections.length > 0) {
        const intersection = intersections[0] as any as XIntersection;
        cursorRef.current.position.copy(intersection.point);
        if (intersection.face != null) {
          cursorRef.current.quaternion.setFromUnitVectors(UP, intersection.face.normal);
          intersection.object.getWorldQuaternion(quaternionHelper);
          cursorRef.current.quaternion.multiply(quaternionHelper);
          offsetHelper.set(0, 0.01, 0);
          offsetHelper.applyQuaternion(cursorRef.current.quaternion);
          cursorRef.current.position.add(offsetHelper);
        }
      }
    },
    [],
  );

  const filterIntersections = useCallback(
    (intersections: Array<any>) => {
      const teleportTargets = intersections.filter(isTeleportTarget);
      if (customFilterIntersections == null) {
        return teleportTargets;
      }
      return customFilterIntersections(teleportTargets);
    },
    [customFilterIntersections],
  );

  const scene = useThree(({ scene }) => scene);

  return (
    <>
      <XCurvedPointer
        points={points}
        onIntersections={onIntersections}
        filterIntersections={filterIntersections}
        id={id}
      />
      <mesh geometry={rayGeometry} material={material} />
      {createPortal(
        <mesh scale={cursorSize ?? 0.3} ref={cursorRef} geometry={cursorGeometry}>
          <meshBasicMaterial
            transparent
            map={cursorTexture}
            color={cursorColor}
            toneMapped={false}
          />
        </mesh>,
        scene,
      )}
    </>
  );
}
