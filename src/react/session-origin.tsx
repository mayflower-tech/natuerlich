/* eslint-disable react/display-name */
import { GroupProps, useThree } from "@react-three/fiber";
import React from "react";
import { ReactNode, forwardRef } from "react";
import { Group } from "three";
import { useXR } from "./state.js";

/**
 * component to position and rotate the session origin (the spawn point of for the xr session)
 */
export const ImmersiveSessionOrigin = forwardRef<Group, { cameraContent?: ReactNode } & GroupProps>(
  ({ cameraContent, children, ...props }, ref) => {
    const enabled = useXR(({ session }) => session != null);
    const camera = useThree((state) => state.camera);
    if (camera == null || !enabled) {
      return null;
    }
    return (
      <group ref={ref} {...props}>
        <primitive object={camera}>{cameraContent}</primitive>
        {children}
      </group>
    );
  },
);
