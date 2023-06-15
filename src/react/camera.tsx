/* eslint-disable react/display-name */
import { PerspectiveCameraProps, useThree } from "@react-three/fiber";
import React, { useEffect, useImperativeHandle, useRef } from "react";
import { forwardRef } from "react";
import { PerspectiveCamera } from "three";

export const NonImmersiveCamera = forwardRef<PerspectiveCamera, PerspectiveCameraProps>(
  (props, ref) => {
    const set = useThree(({ set }) => set);
    const get = useThree(({ get }) => get);
    const internalRef = useRef<PerspectiveCamera>(null);
    useImperativeHandle(ref, () => internalRef.current!);
    useEffect(() => {
      const newCamera = internalRef.current;
      if (newCamera == null) {
        return;
      }
      const prevCamera = get().camera;
      set({ camera: newCamera });
      return () => {
        if (get().camera != newCamera) {
          //camera was already changed to another one
          return;
        }
        set({ camera: prevCamera });
      };
    }, [set]);
    return <perspectiveCamera ref={internalRef} {...props} />;
  },
);
