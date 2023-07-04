/* eslint-disable react/display-name */
import { GroupProps, useFrame } from "@react-three/fiber";
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Group } from "three";
import { useXR } from "./state.js";
import { applySpace } from "./space.js";

export const TrackedImage = forwardRef<Group, { image: ImageBitmap } & GroupProps>(
  ({ image, children, ...props }, ref) => {
    const internalRef = useRef<Group>(null);
    const requestedImages = useXR(({ requestedTrackedImages }) => requestedTrackedImages);
    const imageIndex = useMemo(() => {
      if (requestedImages == null) {
        return undefined;
      }
      const index = requestedImages.findIndex(
        ({ image: requestedImage }) => requestedImage === image,
      );
      if (index === -1) {
        throw new Error(
          `Unknown image provided to TrackedImage. Images that should be tracked must be provided to "trackedImages" inside the XRSessionInit options`,
        );
      }
      return index;
    }, [image, requestedImages]);

    useFrame((state, _delta, frame: XRFrame | undefined) => {
      if (internalRef.current == null || imageIndex == null) {
        return;
      }
      const space = useXR.getState().trackedImages?.get(imageIndex)?.imageSpace;
      if (space == null) {
        return;
      }
      applySpace(state, frame, internalRef.current, space);
    });
    useImperativeHandle(ref, () => internalRef.current!, []);
    if (imageIndex == null) {
      return null;
    }
    return (
      <group {...props} ref={internalRef}>
        {children}
      </group>
    );
  },
);
