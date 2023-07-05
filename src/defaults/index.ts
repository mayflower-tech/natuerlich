import { XIntersection } from "@coconut-xr/xinteraction";
import { MutableRefObject, RefObject } from "react";
import {
  Color,
  ColorRepresentation,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { makeCursorMaterial, makeFadeMaterial } from "@coconut-xr/xmaterials";

//shared materials

export const CursorBasicMaterial = makeCursorMaterial(MeshBasicMaterial);
export const RayBasicMaterial = makeFadeMaterial(MeshBasicMaterial);

//shared update methods

const ZAXIS = new Vector3(0, 0, 1);
const quaternionHelper = new Quaternion();
const offsetHelper = new Vector3();

export function updateCursorTransformation(
  inputSource: XRInputSource,
  intersections: ReadonlyArray<XIntersection>,
  cursorRef: RefObject<Object3D>,
  cursorOffset: number,
) {
  if (cursorRef.current == null) {
    return;
  }

  const cursor = cursorRef.current;

  if (intersections.length === 0) {
    cursor.visible = false;
    return;
  }

  cursor.visible = true;
  const intersection = intersections[0];

  cursor.position.copy(intersection.pointOnFace);
  if (intersection.face != null) {
    quaternionHelper.setFromUnitVectors(ZAXIS, intersection.face.normal);
    intersection.object.getWorldQuaternion(cursor.quaternion);
    cursor.quaternion.multiply(quaternionHelper);

    offsetHelper.set(0, 0, cursorOffset * (inputSource.handedness === "left" ? 1 : 1.5));
    offsetHelper.applyQuaternion(cursor.quaternion);
    cursor.position.add(offsetHelper);
  }
}

export function updateRayTransformation(
  intersections: ReadonlyArray<XIntersection>,
  maxLength: number,
  rayRef: RefObject<Object3D>,
) {
  if (rayRef.current == null) {
    return;
  }
  let length = maxLength;
  if (intersections.length > 0) {
    length = Math.min(maxLength, intersections[0].distance);
  }
  rayRef.current.position.z = -length / 2;
  rayRef.current.scale.z = length;
}

export function triggerVibration(
  intersections: ReadonlyArray<XIntersection>,
  inputSource: XRInputSource,
  refPrevIntersected: MutableRefObject<boolean>,
) {
  const prevIntersected = refPrevIntersected.current;
  const currentIntersected = intersections.length > 0;
  refPrevIntersected.current = currentIntersected;
  if (!(!prevIntersected && currentIntersected)) {
    return;
  }
  if (inputSource.gamepad == null) {
    return;
  }
  const hapticActuators = inputSource.gamepad.hapticActuators;
  if (hapticActuators == null || hapticActuators.length === 0) {
    return;
  }
  (hapticActuators[0] as any).pulse(0.5, 30);
}

export function updateColor(
  pressed: boolean,
  material: { color: Color },
  normalColor: ColorRepresentation,
  pressColor: ColorRepresentation,
): void {
  material.color.set(pressed ? pressColor : normalColor);
}

export function updateCursorDistanceOpacity(
  material: { opacity: number },
  distance: number,
  smallestDistance: number,
  highestDistance: number,
  cursorOpacity: number,
): void {
  const transition = Math.min(
    1.0,
    1 - (distance - smallestDistance) / (highestDistance - smallestDistance),
  );
  material.opacity = transition * cursorOpacity;
}

export * from "./canvas.js";
export * from "./grab-controller.js";
export * from "./grab-hand.js";
export * from "./pointer-controller.js";
export * from "./pointer-hand.js";
export * from "./touch-hand.js";
export * from "./teleport.js";
export * from "./koestlich.js";
export * from "./double-grab.js";
