/* eslint-disable react/display-name */
import { GroupProps } from "@react-three/fiber";
import React from "react";
import { ReactNode, forwardRef } from "react";
import { Group } from "three";
import { useXR } from "./state.js";

export const ImmersiveSessionOrigin = forwardRef<Group, { cameraContent?: ReactNode } & GroupProps>(
  ({ cameraContent, children, ...props }, ref) => {
    const camera = useXR((state) => state.camera);
    if (camera == null) {
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
