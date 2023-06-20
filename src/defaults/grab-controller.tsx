import { XIntersection } from "@coconut-xr/xinteraction";
import { InputDeviceFunctions, XSphereCollider } from "@coconut-xr/xinteraction/react";
import React, { useRef, useCallback, Suspense, ReactNode } from "react";
import { BoxGeometry } from "three";
import { DynamicControllerModel } from "../react/controller.js";
import { useInputSourceEvent } from "../react/index.js";
import { SpaceGroup } from "../react/space.js";

const geometry = new BoxGeometry();
geometry.translate(0, 0, -0.5);

export function GrabController({
  inputSource,
  children,
  filterIntersections,
  id,
}: {
  inputSource: XRInputSource;
  children?: ReactNode;
  id: number;
  filterIntersections?: (intersections: Array<XIntersection>) => Array<XIntersection>;
}) {
  const colliderRef = useRef<InputDeviceFunctions>(null);
  const intersectionLength = useRef(0);

  useInputSourceEvent("squeezestart", inputSource, (e) => colliderRef.current?.press(0, e), []);
  useInputSourceEvent("squeezeend", inputSource, (e) => colliderRef.current?.release(0, e), []);

  const onIntersections = useCallback(
    (intersections: ReadonlyArray<XIntersection>) => {
      const prevIntersected = intersectionLength.current > 0;
      const currentIntersected = intersections.length > 0;
      intersectionLength.current = intersections.length;
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
          <XSphereCollider
            id={id}
            filterIntersections={filterIntersections}
            onIntersections={onIntersections}
            ref={colliderRef}
            radius={0.05}
          />
          {children}
          <Suspense fallback={null}>
            <DynamicControllerModel inputSource={inputSource} />
          </Suspense>
        </SpaceGroup>
      )}
    </>
  );
}
