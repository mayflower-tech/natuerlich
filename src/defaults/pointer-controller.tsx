import { ReactNode, Suspense, useCallback, useRef } from "react";
import { InputDeviceFunctions, XStraightPointer } from "@coconut-xr/xinteraction/react";
import { useInputSourceEvent } from "../react/listeners.js";
import { XIntersection } from "@coconut-xr/xinteraction";
import React from "react";
import { SpaceGroup } from "../react/space.js";
import { DynamicControllerModel } from "../react/controller.js";
import { BoxGeometry } from "three";

const geometry = new BoxGeometry();
geometry.translate(0, 0, -0.5);

export function PointerController({
  inputSource,
  children,
  filterIntersections,
  id,
}: {
  inputSource: XRInputSource;
  children?: ReactNode;
  id: number;
  filterIntersections?: (intersections: XIntersection[]) => XIntersection[];
}) {
  const pointerRef = useRef<InputDeviceFunctions>(null);

  const refPrevIntersected = useRef(false);
  useInputSourceEvent("selectstart", inputSource, (e) => pointerRef.current?.press(0, e), []);
  useInputSourceEvent("selectend", inputSource, (e) => pointerRef.current?.release(0, e), []);

  const onIntersections = useCallback(
    (intersections: Array<XIntersection>) => {
      const prevIntersected = refPrevIntersected.current;
      const currentIntersected = intersections.length > 0;
      refPrevIntersected.current = currentIntersected;
      if (!(!prevIntersected && currentIntersected)) {
        return;
      }
      if (inputSource.gamepad == null) {
        return;
      }
      const [hapticActuator] = inputSource.gamepad.hapticActuators;
      if (hapticActuator == null) {
        return;
      }
      (hapticActuator as any).pulse(1, 100);
    },
    [inputSource],
  );

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
      <SpaceGroup space={inputSource.targetRaySpace}>
        <group rotation-y={Math.PI}>
          <XStraightPointer
            onIntersections={onIntersections}
            id={id}
            ref={pointerRef}
            filterIntersections={filterIntersections}
          />
        </group>

        <mesh scale={[0.01, 0.01, 1]} geometry={geometry}>
          <meshBasicMaterial color={0xffffff} />
        </mesh>
      </SpaceGroup>
    </>
  );
}
