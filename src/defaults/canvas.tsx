import { XWebPointers, noEvents } from "@coconut-xr/xinteraction/react";
import { Canvas, CanvasProps } from "@react-three/fiber";
import React, { ComponentProps } from "react";
import { XR, XRProps } from "../react/index.js";

/**
 * basic component for creating a webxr scene
 */
export function XRCanvas({
  foveation,
  frameRate,
  referenceSpace,
  frameBufferScaling,
  filterClipped,
  filterIntersections,
  onClickMissed,
  onIntersections,
  onPointerDownMissed,
  onPointerUpMissed,
  dragDistance,
  children,
  ...props
}: CanvasProps & XRProps & ComponentProps<typeof XWebPointers>) {
  return (
    <Canvas {...props} events={noEvents}>
      <XR
        foveation={foveation}
        frameBufferScaling={frameBufferScaling}
        frameRate={frameRate}
        referenceSpace={referenceSpace}
      />
      <XWebPointers
        filterClipped={filterClipped}
        filterIntersections={filterIntersections}
        onClickMissed={onClickMissed}
        onIntersections={onIntersections}
        onPointerDownMissed={onPointerDownMissed}
        onPointerUpMissed={onPointerUpMissed}
        dragDistance={dragDistance}
      />
      {children}
    </Canvas>
  );
}
